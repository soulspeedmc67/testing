import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_BOOT_SCRIPT } from '../lib/theme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />

        {/* Theme, applied before first paint.

            This has to be a blocking inline script rather than anything React
            does, because React's first commit happens well after the browser
            has already painted the document background. Resolving the theme in
            an effect means a dark-mode user sees a full white frame on every
            cold start — the flash is not subtle on a phone. Running here, the
            `dark` class is on <html> before the first pixel. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />

        {/* Brand typefaces.

            These were previously pulled in with an @import at the top of
            globals.css, which is the slowest path available: the browser has
            to download and parse the stylesheet before it can even discover
            the font request, so the two fetches run in series. Declared here
            they start as soon as the document head is parsed, and the
            preconnects open the TLS handshake to the font host up front —
            which matters on the mobile networks this app is actually used on.

            display=swap is already set on the URL, so text paints immediately
            in the fallback stack and swaps rather than sitting invisible. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Caveat:wght@700&display=swap"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#00000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Web App Manifest & App Icons */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="application-name" content="DASHIT" />
        <meta name="apple-mobile-web-app-title" content="DASHIT" />
        <meta name="format-detection" content="telephone=no" />

        {/* Dynamic Light and Dark Mode Browser Tab Icons */}
        <link rel="icon" type="image/png" href="/favicon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Splash lockup — fetched before hydration so the opening choreography
            never plays against a frame that has not painted yet */}
        <link rel="preload" as="image" href="/dashit-splash-mark.png" />
        <link rel="preload" as="image" href="/dashit-splash-mark-white.png" />
        <link rel="preload" as="image" href="/dashit-splash-dash.png" />
        <link rel="preload" as="image" href="/dashit-wordmark.png" />
        <link rel="preload" as="image" href="/dashit-wordmark-white.png" />
      </Head>
      {/* The ground colour comes from the `--surface` token (globals.css) so
          it follows the theme. It used to be pinned to #FFFFFF with an inline
          style, which outranks every stylesheet and would have kept a white
          page behind a dark app. */}
      <body className="bg-surface antialiased selection:bg-orange-100 selection:text-orange-900 dark:selection:bg-orange-500/30 dark:selection:text-orange-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
