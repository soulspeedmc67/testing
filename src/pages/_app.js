import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import LiveOrderFloatingTracker from '../components/LiveOrderFloatingTracker';
import FloatingCartBar from '../components/FloatingCartBar';
import FlyingBadgeOverlay from '../components/FlyingBadgeOverlay';
import { ScrollChromeProvider } from '../context/ScrollChromeContext';
import { initNotificationPermissions } from '../lib/notifications';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const currentPathRef = useRef(router.pathname);

  useEffect(() => {
    currentPathRef.current = router.pathname;

    const syncStatusBar = async () => {
      try {
        const isHome = router.pathname === '/' || router.pathname === '';
        const topColor = isHome ? '#FFFDF5' : '#FFFFFF';
        await StatusBar.setBackgroundColor({ color: topColor });
        await StatusBar.setStyle({ style: Style.Light });
      } catch (e) {}
    };
    syncStatusBar();
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

  return (
    <ScrollChromeProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <FlyingBadgeOverlay />
      <LiveOrderFloatingTracker />
      <FloatingCartBar />
      <motion.div
        key={router.asPath}
        initial={{ opacity: 0.85, scale: 0.996 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
        className="w-full min-h-screen overflow-x-clip relative"
      >
        <Component {...pageProps} />
      </motion.div>
    </ScrollChromeProvider>
  );
}
