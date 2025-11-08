/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  // Set workspace root to silence lockfile warning
  outputFileTracingRoot: resolve(__dirname, "../../"),
};

export default config;
