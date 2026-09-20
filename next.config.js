/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  /* `next dev` and `next build` used to share `.next`. Running a build while the
     dev server was up let the build wipe and rewrite the directory underneath it,
     after which dev kept asking for chunks that no longer existed —
     "Cannot find module './chunks/vendor-chunks/lucide-react.js'" — and every
     page 500'd until `.next` was deleted by hand. Giving dev its own directory
     means the two can run side by side. `next build`, `next start` and the
     Hostinger export all still use `.next`. */
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true
  },
  /* three and the pmndrs packages ship modern untranspiled ESM. Next does not
     transpile node_modules by default, so webpack hands that syntax straight to
     the browser and the chunk dies with "Invalid or unexpected token" — which
     surfaces as a next/dynamic import that never resolves, with no error. */
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei']
};

module.exports = nextConfig;
