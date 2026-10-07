import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/availability", destination: "/availability.html" }];
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
