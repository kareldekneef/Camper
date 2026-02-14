import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      // Proxy Firebase Auth handler to enable signInWithRedirect on same-origin
      // This is required when authDomain is set to the hosting domain (Vercel)
      // instead of the default firebaseapp.com domain
      {
        source: '/__/auth/:path*',
        destination: 'https://camperpack-3d2ac.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
