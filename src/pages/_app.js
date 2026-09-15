import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, MotionConfig } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import LiveOrderFloatingTracker from '../components/LiveOrderFloatingTracker';
import FloatingCartBar from '../components/FloatingCartBar';
import BottomNav from '../components/BottomNav';
import FlyingBadgeOverlay from '../components/FlyingBadgeOverlay';
import PremiumSplashScreen from '../components/PremiumSplashScreen';
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { AgeGateProvider } from '../context/AgeGateContext';
import { initNotificationPermissions } from '../lib/notifications';

import { setDeviceSystemBars } from '../lib/systemBars';
import { isNative } from '../lib/platform';
import { EASE_OUT } from '../lib/motion';

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

    const syncThemeAndStatusBar = async () => {
      try {
        // Keep customer storefront in light mode while allowing admin dark theme
        if (router.pathname !== '/admin') {
          document.documentElement.classList.remove("dark");
        }
        if (showSplash) {
          await setDeviceSystemBars({
            topColor: '#FFFFFF',
            topDarkIcons: true,
            bottomColor: '#FFFFFF',
            bottomDarkIcons: true,
          });
          return;
        }
        const isHome = router.pathname === '/' || router.pathname === '/shop' || router.pathname === '';
        const isSearch = router.pathname === '/search';
        const isDriver = router.pathname === '/driver';
        const topColor = isHome ? '#FFE8D6' : isSearch || isDriver ? '#061838' : '#FFFFFF';
        const isTopDarkIcons = !isSearch && !isDriver;
        const bottomColor = isHome ? '#FFFDF5' : '#FFFFFF';
        await setDeviceSystemBars({
          topColor,
          topDarkIcons: isTopDarkIcons,
          bottomColor,
          bottomDarkIcons: true,
        });
      } catch (e) {}
    };
    syncThemeAndStatusBar();
  }, [router.pathname, showSplash]);



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
      <ScrollChromeProvider>
        <AgeGateProvider>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
          />
          <meta name="color-scheme" content="light" />
        </Head>
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
              ? "w-full h-screen h-[100dvh] overflow-hidden relative"
              : "w-full min-h-screen relative"
          }
        >
          <Component {...pageProps} />
        </motion.div>
        {router.pathname === '/shop' && <LiveOrderFloatingTracker />}
        <FloatingCartBar />
        {!['/login', '/driver', '/admin', '/', '/privacy', '/terms'].includes(router.pathname) && <BottomNav />}
        <FlyingBadgeOverlay />
        </AgeGateProvider>
      </ScrollChromeProvider>
    </MotionConfig>
  );
}
