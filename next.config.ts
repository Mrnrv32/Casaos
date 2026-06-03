import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const withPWA = withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
