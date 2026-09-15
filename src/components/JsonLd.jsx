import Head from "next/head";

const SITE_URL = "https://dashit.co.in";

/**
 * Universal JSON-LD Structured Data injector component
 */
export function JsonLd({ data }) {
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </Head>
  );
}

/**
 * WebSite & Sitelinks Searchbox Schema
 */
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DASHIT",
    alternateName: ["Dashit Anantnag", "DASHIT Quick Commerce", "Dash It Kashmir"],
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop/?cat={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={schema} />;
}

/**
 * Organization Schema
 */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DASHIT Technologies",
    legalName: "DASHIT Technologies Private Limited",
    url: SITE_URL,
    logo: `${SITE_URL}/dashit-full-logo.png`,
    image: `${SITE_URL}/dashit-app-icon.png`,
    description:
      "DASHIT is Anantnag's premier hyperlocal quick-commerce platform delivering fresh groceries, milk, Kashmiri bakery, and daily essentials in 8 minutes.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Central Store Hub, Nai Basti",
      addressLocality: "Anantnag",
      addressRegion: "Jammu & Kashmir",
      postalCode: "192101",
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-6006990032",
      contactType: "customer service",
      email: "support@dashit.co.in",
      areaServed: "IN-JK",
      availableLanguage: ["en", "ur", "hi", "ks"],
    },
  };

  return <JsonLd data={schema} />;
}

/**
 * Hyperlocal Store / GroceryStore Schema (LocalBusiness)
 */
export function GroceryStoreJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    "@id": `${SITE_URL}/#store`,
    name: "DASHIT Hyperlocal Quick Store",
    image: `${SITE_URL}/art/landing-hero-groceries.jpg`,
    url: SITE_URL,
    telephone: "+91-6006990032",
    priceRange: "₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nai Basti, Near Lal Chowk",
      addressLocality: "Anantnag",
      addressRegion: "Jammu and Kashmir",
      postalCode: "192101",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 33.735832,
      longitude: 75.143614,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "07:00",
        closes: "23:00",
      },
    ],
    areaServed: [
      {
        "@type": "AdministrativeArea",
        name: "Anantnag",
      },
      {
        "@type": "PostalAddress",
        postalCode: "192101",
      },
    ],
  };

  return <JsonLd data={schema} />;
}

/**
 * Product Schema for Product Detail Pages
 */
export function ProductJsonLd({ product, url }) {
  if (!product) return null;

  const currentPrice = product.price || 0;
  const originalPrice = product.originalPrice || currentPrice;
  const inStock = product.stock === undefined || Number(product.stock) > 0;
  const ratingValue = product.rating ? String(product.rating) : "4.8";
  const reviewCount = product.ratingCount ? String(product.ratingCount) : "50";
  const productUrl = url || `${SITE_URL}/product/${product.id}/`;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: [product.img],
    description:
      product.description ||
      `Buy fresh ${product.name} online in Anantnag with 8-minute delivery from DASHIT. Verified quality and best price guarantee.`,
    sku: String(product.barcode || product.id || "DASHIT-PROD"),
    mpn: String(product.id || "DASHIT-MPN"),
    brand: {
      "@type": "Brand",
      name: product.brand || (product.cat === "Dairy" ? "Amul" : "DASHIT"),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingValue,
      reviewCount: reviewCount,
      bestRating: "5",
      worstRating: "1",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: currentPrice,
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        .toISOString()
        .split("T")[0],
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "DASHIT Technologies",
      },
    },
  };

  return <JsonLd data={schema} />;
}

/**
 * BreadcrumbList Schema
 * items: Array of { name: string, url: string }
 */
export function BreadcrumbJsonLd({ items = [] }) {
  if (!items || items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return <JsonLd data={schema} />;
}
