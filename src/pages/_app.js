import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion, MotionConfig } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import FloatingCartBar from '../components/FloatingCartBar';
import BottomNav from '../components/BottomNav';
import FlyingBadgeOverlay from '../components/FlyingBadgeOverlay';
import PremiumSplashScreen from '../components/PremiumSplashScreen';
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { THEME_CHROME, applyTheme } from '../lib/theme';
import { AgeGateProvider } from '../context/AgeGateContext';
import { initNotificationPermissions } from '../lib/notifications';

import { setDeviceSystemBars } from '../lib/systemBars';
import { isNative } from '../lib/platform';
import CookieConsentBanner from '../components/CookieConsentBanner';

/* Loaded on demand rather than with the app shell. This component is the only
   thing in _app that reaches Firestore and Firebase Auth, and a static import
   pulled the whole Firebase SDK into the chunk every page downloads before it
   can render — including /privacy, /terms and the 404. It renders on /shop
   alone, so the cost now falls only on the page that uses it. */
const LiveOrderFloatingTracker = dynamic(
  () => import('../components/LiveOrderFloatingTracker'),
  { ssr: false }
);
import { EASE_OUT } from '../lib/motion';

/**
 * Keeps the native system bars and the `color-scheme` meta in step with the
 * active theme and route.
 *
 * This lives in its own component purely so it can call `useTheme()` — App
 * itself renders the provider, so it sits above the context and cannot read
 * it. It renders only a <Head> fragment.
 */
function SystemChromeSync({ showSplash, pathname }) {
  const { theme } = useTheme();

  /* Re-assert the theme on every route change.

     The admin console owns the `dark` class while it is mounted — it has its
     own toggle and its own stored preference — and its effect strips the class
     again when it unmounts. On the web build, where a single document survives
     the trip, navigating out of /admin would otherwise leave the storefront
     rendering light while this provider still believed it was dark.

     Rather than reach into the console and change how it works, the storefront
     simply reclaims the class on arrival. /admin is skipped so the console
     keeps full control of its own appearance while it is the active route. */
  useEffect(() => {
    if (pathname === '/admin') return;
    applyTheme(theme);
  }, [theme, pathname]);

  useEffect(() => {
    const chrome = THEME_CHROME[theme] || THEME_CHROME.light;

    const sync = async () => {
      try {
        if (showSplash) {
          /* The splash paints the app ground edge to edge, so the bars match
             it rather than the route underneath. */
          await setDeviceSystemBars({
            topColor: theme === 'dark' ? chrome.top : '#FFFFFF',
            topDarkIcons: chrome.darkIcons,
            bottomColor: theme === 'dark' ? chrome.bottom : '#FFFFFF',
            bottomDarkIcons: chrome.darkIcons,
          });
          return;
        }

        const isHome = pathname === '/' || pathname === '/shop' || pathname === '';
        const isSearch = pathname === '/search';
        const isDriver = pathname === '/driver';

        /* In light mode Search and Driver invert to the midnight brand colour,
           which needs light icons. In dark mode every surface is already dark,
           so the inversion is a no-op and the icon polarity is uniform. */
        const isInverted = isSearch || isDriver;
        const topColor = isHome
          ? chrome.homeTop
          : isInverted
            ? chrome.inverted
            : chrome.top;
        const bottomColor = isHome ? chrome.homeBottom : chrome.bottom;
        const topDarkIcons = theme === 'dark' ? false : !isInverted;

        await setDeviceSystemBars({
          topColor,
          topDarkIcons,
          bottomColor,
          bottomDarkIcons: chrome.darkIcons,
        });
      } catch (e) {}
    };

    sync();
  }, [theme, pathname, showSplash]);

  return (
    <Head>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
      />
      {/* Declares to the engine which palette native widgets should adopt.
          Pinned to "light" before dark mode existed. */}
      <meta name="color-scheme" content={theme} />
    </Head>
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const currentPathRef = useRef(router.pathname);
  const [showSplash, setShowSplash] = useState(false);
  // Holds the first screen slightly forward while the splash covers it
  const [splashHolding, setSplashHolding] = useState(false);
  // Slow ease applies only for the duration of the splash handoff
  const [isRevealing, setIsRevealing] = useState(false);

  // 1. Hide native Capacitor splash screen smoothly once web app mounts
  useEffect(() => {
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (e) {}
    };
    const timer = setTimeout(hideNativeSplash, 120);
    return () => clearTimeout(timer);
  }, []);

  // 2. Control in-app splash choreography on initial cold launch
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isInternalRole = ['/admin', '/driver'].includes(router.pathname);
      let seen = false;
      try { seen = !!sessionStorage.getItem("dashit_splash_seen"); } catch (e) {}
      if (!isInternalRole && !seen) {
        setShowSplash(true);
        setSplashHolding(true);
      }
    }
  }, []);

  useEffect(() => {
    currentPathRef.current = router.pathname;
  }, [router.pathname]);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const initAppRouting = async () => {
        let role = window.__DASHIT_ROLE__ || "";

        // 1. Android Flavor bridge
        if (!role && window.AndroidFlavor && window.AndroidFlavor.getFlavor) {
          role = window.AndroidFlavor.getFlavor();
        }

        // 2. Capacitor native app inspection (iOS & Android)
        if (!role) {
          try {
            const { Capacitor } = require("@capacitor/core");
            if (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
              const { App } = require("@capacitor/app");
              const info = await App.getInfo();
              const id = (info.id || "").toLowerCase();
              const name = (info.name || "").toLowerCase();
              if (id.includes("admin") || name.includes("admin")) {
                role = "admin";
              } else if (id.includes("driver") || name.includes("driver")) {
                role = "driver";
              } else {
                role = "customer";
              }
            }
          } catch (e) {}
        }

        // Default role is customer
        if (!role) role = "customer";

        // 3. Execute role-based routing
        if (role === "admin") {
          setShowSplash(false);
          if (router.pathname !== "/admin") {
            router.replace("/admin");
          }
        } else if (role === "driver") {
          setShowSplash(false);
          if (router.pathname !== "/driver") {
            router.replace("/driver");
          }
        } else if (role === "customer" || role === "user") {
          /* The packaged app always opens straight into the storefront /shop.
             Browsing is open and instant; login is only requested during checkout.
             On the public web "/" remains the landing page front door. */
          const isApp = isNative() || Boolean(window.__DASHIT_ROLE__);
          if (isApp && (router.pathname === "/" || router.pathname === "" || router.pathname === "/index.html")) {
            router.replace("/shop");
          }
        }
      };

      initAppRouting();
    }
  }, [router.pathname]);

  useEffect(() => {
    initNotificationPermissions();

    let backHandler = null;

    const setupBackListener = async () => {
      try {
        backHandler = await CapApp.addListener('backButton', () => {
          // 1. Check if any open drawer / modal / bottom sheet exists and close it first
          const openDrawer = document.querySelector('[data-vaul-drawer]');
          if (openDrawer) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            return;
          }
          const openModalDismiss = document.querySelector('[data-dismiss-modal], .modal-close-btn');
          if (openModalDismiss) {
            openModalDismiss.click();
            return;
          }

          // 2. Only exit the app if on the home screen
          const path = currentPathRef.current;
          if (path === '/' || path === '/shop' || path === '') {
            CapApp.exitApp();
          } else {
            // Not on home screen: navigate back to previous screen or home
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/shop');
            }
          }
        });
      } catch (err) {
        console.warn('Capacitor backButton listener not supported in this environment', err);
      }
    };

    setupBackListener();

    return () => {
      if (backHandler && backHandler.remove) {
        backHandler.remove();
      }
    };
  }, [router]);

  // App-wide Edge Swipe-Back gesture recognizer for native iOS and Android feel
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;
    let startTime = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Only initiate if touch started within 30px of the left edge
      if (touch.clientX <= 30) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        isEdgeSwipe = true;
      } else {
        isEdgeSwipe = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isEdgeSwipe || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - startY);
      const deltaX = touch.clientX - startX;
      // Abort if user is primarily scrolling vertically
      if (deltaY > 40 && deltaY > deltaX) {
        isEdgeSwipe = false;
      }
    };

    const handleTouchEnd = (e) => {
      if (!isEdgeSwipe) return;
      isEdgeSwipe = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      const duration = Date.now() - startTime;

      // Swipe right detected: minimum 60px horizontal distance, mostly horizontal, duration < 500ms
      if (deltaX > 60 && deltaY < deltaX * 0.7 && duration < 500) {
        const path = currentPathRef.current;
        const openModalDismiss = document.querySelector('[data-dismiss-modal], .modal-close-btn');
        if (openModalDismiss) {
          openModalDismiss.click();
          return;
        }

        const rootPages = ['/', '/shop', '', '/driver', '/admin', '/login'];
        if (!rootPages.includes(path)) {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push('/shop');
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router]);

  // Enforce native app feel by blocking browser context menus on long-press
  useEffect(() => {
    const handleContextMenu = (e) => {
      const tag = e.target?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) {
        return; // Allow standard text editing context in actual inputs
      }
      e.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // Handle Capacitor native deep links (e.g. com.dashit.app:// or Truecaller callbacks)
  useEffect(() => {
    let urlListener = null;
    const setupUrlListener = async () => {
      try {
        urlListener = await CapApp.addListener("appUrlOpen", (event) => {
          if (!event?.url) return;
          const urlStr = event.url;
          // Check if it's our custom scheme com.dashit.app://
          if (urlStr.includes("com.dashit.app://")) {
            const pathWithQuery = urlStr.replace(/^.*?com\.dashit\.app:\/\//, "");
            if (pathWithQuery.startsWith("login") || pathWithQuery.includes("requestNonce") || pathWithQuery.includes("endpoint")) {
              router.push("/login?" + (pathWithQuery.split("?")[1] || ""));
            }
          }
        });
      } catch (err) {
        console.warn("CapApp appUrlOpen listener skipped", err);
      }
    };
    setupUrlListener();
    return () => {
      if (urlListener && urlListener.remove) {
        urlListener.remove();
      }
    };
  }, [router]);

  return (
    // reducedMotion="user" honours the OS accessibility setting app-wide
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
      <ScrollChromeProvider>
        <AgeGateProvider>
        <SystemChromeSync showSplash={showSplash} pathname={router.pathname} />
        {showSplash && (
          <PremiumSplashScreen
            // Fires as the splash starts clearing, so the screen behind settles
            // during the handoff rather than after it
            onExitStart={() => {
              setSplashHolding(false);
              setIsRevealing(true);
            }}
            onComplete={() => {
              setShowSplash(false);
              try { sessionStorage.setItem("dashit_splash_seen", "true"); } catch (e) {}
            }}
          />
        )}
        <motion.div
          key={router.asPath}
          // The splash zooms toward the viewer, so the screen behind it settles
          // back from 104% to meet the handoff as one continuous push. Ordinary
          // route changes keep the plain quick fade.
          initial={splashHolding ? { opacity: 0, scale: 1.04 } : false}
          animate={{ opacity: 1, scale: splashHolding ? 1.04 : 1 }}
          transition={
            splashHolding || isRevealing
              ? { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.18, ease: EASE_OUT }
          }
          onAnimationComplete={() => {
            if (isRevealing) setIsRevealing(false);
          }}
          className={
            router.pathname === '/admin'
              /* Only the desktop console is viewport-locked; on a phone the
                 admin page scrolls like any other page. */
              ? "w-full min-h-screen relative lg:h-screen lg:h-[100dvh] lg:overflow-hidden"
              : "w-full min-h-screen relative"
          }
        >
          <Component {...pageProps} />
        </motion.div>
        {router.pathname === '/shop' && <LiveOrderFloatingTracker />}
        <FloatingCartBar />
        {!['/login', '/driver', '/admin', '/', '/privacy', '/terms'].includes(router.pathname) && <BottomNav />}
        <FlyingBadgeOverlay />
        <CookieConsentBanner />
        </AgeGateProvider>
      </ScrollChromeProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
