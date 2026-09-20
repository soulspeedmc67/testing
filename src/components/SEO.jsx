import Head from "next/head";

const SITE_URL = "https://dashit.co.in";
const DEFAULT_TITLE = "DASHIT — #1 Grocery Delivery App in Anantnag | Fastest Delivery";
const DEFAULT_DESCRIPTION =
  "Anantnag's #1 grocery delivery app. Fresh Kashmiri morning bakery, milk, dairy, snacks, cold drinks, and daily essentials with fastest delivery across Anantnag.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_KEYWORDS =
  "DASHIT, grocery delivery app Anantnag, fastest grocery delivery Anantnag, Kashmir quick commerce, buy milk online Anantnag, Kashmiri lavas bread, online supermarket Anantnag 192101";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
  keywords = DEFAULT_KEYWORDS,
  children,
}) {
  // Format title: Avoid double branding if already provided
  const pageTitle = title
    ? title.includes("DASHIT") || title.includes("DASHit")
      ? title
      : `${title} | DASHIT — #1 Fastest Grocery App in Anantnag`
    : DEFAULT_TITLE;

  // Format canonical: Ensure absolute URL and trailing slash for export consistency
  let canonicalUrl = SITE_URL;
  if (canonical) {
    if (canonical.startsWith("http")) {
      canonicalUrl = canonical;
    } else {
      const cleanPath = canonical.startsWith("/") ? canonical : `/${canonical}`;
      canonicalUrl = `${SITE_URL}${cleanPath}`;
    }
    // Trailing slash hygiene unless it's a file with extension
    if (!canonicalUrl.endsWith("/") && !canonicalUrl.split("/").pop().includes(".")) {
      canonicalUrl = `${canonicalUrl}/`;
    }
  }

  // Ensure ogImage is absolute
  const fullOgImage = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`;

  // Robots directive
  let robotsContent = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  if (noindex === true) {
    robotsContent = "noindex, nofollow, noarchive";
  } else if (noindex === "follow") {
    robotsContent = "noindex, follow";
  } else if (typeof noindex === "string") {
    robotsContent = noindex;
  }

  const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Google Search Console Verification Tag */}
      {googleVerification && (
        <meta name="google-site-verification" content={googleVerification} />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="DASHIT Quick Commerce" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="DASHIT — Fastest Grocery Delivery in Anantnag" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content="DASHIT — Fastest Grocery Delivery in Anantnag" />

      {/* Geographic / Local SEO Meta Tags */}
      <meta name="geo.region" content="IN-JK" />
      <meta name="geo.placename" content="Anantnag" />
      <meta name="geo.position" content="33.735832;75.143614" />
      <meta name="ICBM" content="33.735832, 75.143614" />

      {children}
    </Head>
  );
}
