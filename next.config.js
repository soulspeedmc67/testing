/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
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
