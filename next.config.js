/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ms-cache.walkerplus.com',
        pathname: '/walkertouch/**',
      },
      {
        protocol: 'https',
        hostname: 'www.beerfestival.info',
        pathname: '/wp-content/**',
      },
    ],
  },
};

export default config;
