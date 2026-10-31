import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Phones on the same Wi-Fi open the dev server by LAN address; Next blocks
  // cross-origin dev requests unless the hostname is listed here.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*", "26.*.*.*", "*.local"],
};

export default nextConfig;
