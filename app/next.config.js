/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  experimental: {
    disableDevOverlay: true,  // ← これが最重要
  },
};

export default nextConfig;
