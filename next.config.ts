import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // let the Cloudflare quick tunnel reach dev resources (HMR, hydration
  // chunks) when previewing the dev server from a phone; dev-only setting
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default withNextIntl(nextConfig);
