import dynamic from "next/dynamic";
import SEO from "../components/SEO";

/* ssr:false is mandatory here: the Canvas builds a WebGL context on mount, and
   `output: 'export'` would otherwise try to run that during the static build. */
const HeroObject3D = dynamic(() => import("../components/HeroObject3D"), {
  ssr: false,
  loading: () => <div style={{ height: 340 }} />,
});

export default function Hero3DDemo() {
  return (
    <>
      <SEO title="3D Hero Preview" noindex={true} />
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#FBF9F7",
          padding: "32px 20px",
        }}
      >
        <section style={{ width: "100%", maxWidth: 980 }}>
          <div style={{ position: "relative" }}>
            <HeroObject3D />
          </div>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <h1 style={{ font: "700 34px/1.15 system-ui, sans-serif", color: "#1B2432", margin: "0 0 10px" }}>
              Fastest delivery in Anantnag
            </h1>
            <p style={{ font: "400 16px/1.6 system-ui, sans-serif", color: "#5A6779", margin: 0 }}>
              Move your cursor across the hero — the shape leans toward it, then settles.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
