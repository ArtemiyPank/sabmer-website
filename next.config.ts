import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withPayload } from "@payloadcms/next/withPayload";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // let the Cloudflare quick tunnel reach dev resources (HMR, hydration
  // chunks) when previewing the dev server from a phone; dev-only setting
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default withPayload(withNextIntl(nextConfig));
