import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { motion, MotionConfig } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Bike } from 'lucide-react';
import '../styles/globals.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import PremiumSplashScreen from '../components/PremiumSplashScreen';
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { THEME_CHROME, applyTheme } from '../lib/theme';
import { AgeGateProvider } from '../context/AgeGateContext';
import { initNotificationPermissions } from '../lib/notifications';

import { setDeviceSystemBars } from '../lib/systemBars';
import { isNative } from '../lib/platform';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { forceUnlockBodyScroll } from '../lib/useBodyScrollLock';

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
    if (pathname === '/xcyop') return;
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

        const isDriver = pathname === '/driver' || detectIsDriverApp();
        if (isDriver) {
          await setDeviceSystemBars({
            topColor: '#0F172A',
            topDarkIcons: false,
            bottomColor: '#0F172A',
            bottomDarkIcons: false,
          });
          return;
        }

        const isHome = pathname === '/' || pathname === '/shop' || pathname === '';
        const isSearch = pathname === '/search';

        /* In light mode Search inverts to the midnight brand colour,
           which needs light icons. In dark mode every surface is already dark,
           so the inversion is a no-op and the icon polarity is uniform. */
        const isInverted = isSearch;
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

/* useLayoutEffect warns when React renders on the server, where it can never run.
   Swapping in useEffect there keeps the export build quiet; the body of the hook
   is client-only anyway. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Synchronous detector for dedicated Driver APK or /driver route.
 */
export function detectIsDriverApp() {
  if (typeof window === "undefined") return false;
  if (window.__DASHIT_ROLE__ === "driver") return true;
  if (window.AndroidFlavor && typeof window.AndroidFlavor.isDriver === "function" && window.AndroidFlavor.isDriver()) return true;
  if (window.AndroidFlavor && typeof window.AndroidFlavor.getFlavor === "function" && window.AndroidFlavor.getFlavor() === "driver") return true;
  if (window.location.pathname.startsWith("/driver")) return true;
  return false;
}

/**
 * Whether this load should skip the splash: internal consoles or returning
 * sessions that already saw the launch animation never show it.
 */
function shouldSkipSplash() {
  if (typeof window === "undefined") return false;
  // The launch animation belongs to the installed apps: a website visitor
  // should see the page, not wait behind a splash.
  if (!isNative()) return true;
  if (detectIsDriverApp() || ['/xcyop', '/driver'].includes(window.location.pathname)) return true;
  try {
    return !!sessionStorage.getItem("dashit_splash_seen");
  } catch (e) {
    return false;
  }
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const currentPathRef = useRef(router.pathname);

  /* These start the same on the server and the client, so hydration matches
     (a first render that asked `window` made the two disagree). The layout
     effect below sets them right before the first paint: no splash for the
     driver app, internal consoles, returning visits or the plain website. */
  const [isDriverApp, setIsDriverApp] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashHolding, setSplashHolding] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const isDrv = detectIsDriverApp();
    if (isDrv) {
      setIsDriverApp(true);
      setShowSplash(false);
      setSplashHolding(false);
      if (router.pathname !== "/driver") {
        router.replace("/driver");
      }
      return;
    }
    if (shouldSkipSplash()) {
      setShowSplash(false);
      setSplashHolding(false);
    }
  }, []);

  // Slow ease applies only for the duration of the splash handoff
  const [isRevealing, setIsRevealing] = useState(false);

  // 1. Hide native Capacitor splash screen once web splash is actively rendered
  useEffect(() => {
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 180 });
      } catch (e) {}
    };
    hideNativeSplash();
  }, []);

  // 2. Fallback check for splash in case route changes or internal role
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isInternalRole = ['/xcyop', '/driver'].includes(router.pathname);
      if (isInternalRole) {
        setShowSplash(false);
        setSplashHolding(false);
      }
    }
  }, [router.pathname]);

  useEffect(() => {
    currentPathRef.current = router.pathname;
    forceUnlockBodyScroll();
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
          if (router.pathname !== "/xcyop") {
            router.replace("/xcyop");
          }
        } else if (role === "driver") {
          setIsDriverApp(true);
          setShowSplash(false);
          setSplashHolding(false);
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

    const cleanupSwipe = () => {
      isEdgeSwipe = false;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', cleanupSwipe);
    };

    const handleTouchMove = (e) => {
      if (!isEdgeSwipe || e.touches.length !== 1) {
        cleanupSwipe();
        return;
      }
      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - startY);
      const deltaX = touch.clientX - startX;
      // Abort if user is primarily scrolling vertically
      if (deltaY > 40 && deltaY > deltaX) {
        cleanupSwipe();
      }
    };

    const handleTouchEnd = (e) => {
      if (!isEdgeSwipe) {
        cleanupSwipe();
        return;
      }
      cleanupSwipe();
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

        const rootPages = ['/', '/shop', '', '/driver', '/xcyop', '/login'];
        if (!rootPages.includes(path)) {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push('/shop');
          }
        }
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Only initiate and bind listeners if touch started within 30px of the left edge
      if (touch.clientX <= 30) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        isEdgeSwipe = true;
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', cleanupSwipe, { passive: true });
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      cleanupSwipe();
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
        {isDriverApp && (
          <Head>
            <title>DASHit Driver</title>
          </Head>
        )}
        {showSplash && !isDriverApp && (
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
        {isDriverApp && router.pathname !== '/driver' ? (
          <div className="w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white select-none">
            <div className="w-20 h-20 rounded-3xl bg-[#FF5B00] flex items-center justify-center shadow-2xl animate-pulse">
              <Bike className="w-10 h-10 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-black font-mono tracking-wider text-slate-100">DASHit Driver</h1>
          </div>
        ) : (
          <motion.div
            key={router.pathname}
            initial={splashHolding ? { opacity: 0 } : false}
            animate={{ opacity: splashHolding ? 0 : 1 }}
            transition={
              splashHolding || isRevealing
                ? { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.15, ease: EASE_OUT }
            }
            onAnimationComplete={() => {
              if (isRevealing) setIsRevealing(false);
            }}
            className={
              router.pathname === '/xcyop'
                /* Only the desktop console is viewport-locked; on a phone the
                   admin page scrolls like any other page. */
                ? "w-full min-h-screen relative lg:h-screen lg:h-[100dvh] lg:overflow-hidden"
                : "w-full min-h-screen relative"
            }
          >
            <Component {...pageProps} />
          </motion.div>
        )}
        {/* No shop on the website any more (ordering is in the apps), so no
            cart bar, bottom menu or live order tracker here. */}
        {!isDriverApp && <CookieConsentBanner />}
        </AgeGateProvider>
      </ScrollChromeProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
