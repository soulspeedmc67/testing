import { useEffect, useRef } from 'react';
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
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { initNotificationPermissions } from '../lib/notifications';

import { setDeviceSystemBars } from '../lib/systemBars';
import { EASE_OUT } from '../lib/motion';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const currentPathRef = useRef(router.pathname);

  useEffect(() => {
    currentPathRef.current = router.pathname;

    const syncThemeAndStatusBar = async () => {
      try {
        // Force Light Mode as requested
        document.documentElement.classList.remove("dark");
        const isHome = router.pathname === '/' || router.pathname === '';
        const isSearch = router.pathname === '/search';
        const topColor = isSearch ? '#061838' : isHome ? '#FFE8D6' : '#FFFFFF';
        const isTopDarkIcons = !isSearch;
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
  }, [router.pathname]);

  useEffect(() => {
    initNotificationPermissions();

    let backHandler = null;

    const setupBackListener = async () => {
      try {
        backHandler = await CapApp.addListener('backButton', () => {
          // 1. Check if any open drawer / modal exists and close it first
          const openDrawer = document.querySelector('[data-vaul-drawer]');
          if (openDrawer) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
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
        <BottomNav />
        <FlyingBadgeOverlay />
      </ScrollChromeProvider>
    </MotionConfig>
  );
}
