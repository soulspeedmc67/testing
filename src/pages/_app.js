import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, MotionConfig } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import LiveOrderFloatingTracker from '../components/LiveOrderFloatingTracker';
import FloatingCartBar from '../components/FloatingCartBar';
import BottomNav from '../components/BottomNav';
import FlyingBadgeOverlay from '../components/FlyingBadgeOverlay';
import PremiumSplashScreen from '../components/PremiumSplashScreen';
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { initNotificationPermissions } from '../lib/notifications';

import { setDeviceSystemBars } from '../lib/systemBars';
import { EASE_OUT } from '../lib/motion';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const currentPathRef = useRef(router.pathname);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    currentPathRef.current = router.pathname;

    const syncThemeAndStatusBar = async () => {
      try {
        // Force Light Mode as requested
        document.documentElement.classList.remove("dark");
        if (showSplash) {
          // While splash is active, ensure dark icons over pristine white canvas
          await setDeviceSystemBars({
            topColor: '#00000000',
            topDarkIcons: true,
            bottomColor: '#FFFFFF',
            bottomDarkIcons: true,
          });
          return;
        }
        const isHome = router.pathname === '/' || router.pathname === '';
        const isSearch = router.pathname === '/search';
        const isLogin = router.pathname === '/login';
        const topColor = '#00000000'; // Transparent status bar across the app
        const isTopDarkIcons = !isSearch && !isLogin;
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

  // On first launch or unauthenticated visit to storefront, route to /login to ask for login
  useEffect(() => {
    if (!router.isReady) return;
    if (router.pathname === '/' || router.pathname === '') {
      try {
        const savedUser = localStorage.getItem('dashit_user');
        if (!savedUser) {
          router.replace('/login');
        }
      } catch (e) {}
    }
  }, [router.isReady, router.pathname]);

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
          if (path === '/' || path === '') {
            CapApp.exitApp();
          } else {
            // Not on home screen: navigate back to previous screen or home
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
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

        if (path !== '/' && path !== '') {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push('/');
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
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
          />
        </Head>
        {showSplash && (
          <PremiumSplashScreen onComplete={() => setShowSplash(false)} />
        )}
        <motion.div
          key={router.asPath}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="w-full min-h-screen overflow-x-clip relative"
        >
          <Component {...pageProps} />
        </motion.div>
        <LiveOrderFloatingTracker />
        <FloatingCartBar />
        {!['/login', '/driver'].includes(router.pathname) && <BottomNav />}
        <FlyingBadgeOverlay />
      </ScrollChromeProvider>
    </MotionConfig>
  );
}
