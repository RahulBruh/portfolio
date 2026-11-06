import type { NextConfig } from "next";

const KESTREL_ORIGIN = "https://kestrel-spend.higgsfield.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/availability", destination: "/availability.html" },
      // Kestrel (spend console project) is hosted on Higgsfield and served
      // under this path. The app itself is built with the /kestrel-spend
      // basepath, so pages, assets and server functions all stay in it.
      // The trailing slash matters: the origin redirects /kestrel-spend to
      // /kestrel-spend/, and Next redirects that back, which loops forever.
      { source: "/kestrel-spend", destination: `${KESTREL_ORIGIN}/kestrel-spend/` },
      { source: "/kestrel-spend/:path*", destination: `${KESTREL_ORIGIN}/kestrel-spend/:path*` },
    ];
  },
  // /jobapply serves these files from route handlers, so tracing needs telling.
  outputFileTracingIncludes: {
    "/jobapply": ["./private/jobapply/page.html"],
    "/jobapply/projects": ["./private/jobapply/projects.json"],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
