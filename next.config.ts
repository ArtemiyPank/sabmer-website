import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withPayload } from "@payloadcms/next/withPayload";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // let the Cloudflare quick tunnel reach dev resources (HMR, hydration
  // chunks) when previewing the dev server from a phone; dev-only setting
  allowedDevOrigins: ["*.trycloudflare.com"],
  /**
   * Carry sharp's native parts into the deployment.
   *
   * Payload uses sharp to cut the thumbnail sizes for uploaded images, and
   * sharp is a native addon: a small JavaScript wrapper, a per-platform binary
   * in `@img/sharp-<platform>`, and the libvips shared library it links
   * against in `@img/sharp-libvips-<platform>`. Next already knows not to
   * bundle sharp — it is on its own externals list — but tracing follows
   * `require`, and nothing requires the `.so`: the addon loads it by path at
   * dlopen time. So it is left behind, and every route that touches Payload
   * answers 500 with `libvips-cpp.so: cannot open shared object file` while
   * the build reports success.
   *
   * All routes, not just the admin: the localized pages read the CMS too, and
   * a page that is regenerated after its revalidation window would hit the
   * same wall.
   */
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@img/**"],
  },
};

export default withPayload(withNextIntl(nextConfig));
