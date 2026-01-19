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
      // ビール女子関連のイベントページ画像
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'tokorozawa-sakuratown.com',
      },
      {
        protocol: 'https',
        hostname: 'japanbrewerscup.jp',
      },
      {
        protocol: 'https',
        hostname: 'beergirlproduction-8f8c.kxcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'static.amebaowndme.com',
      },
    ],
  },
};

export default config;
