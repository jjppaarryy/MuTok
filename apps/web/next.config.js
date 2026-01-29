/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  turbopack: {
    root: path.join(__dirname, "..", "..")
  },
  transpilePackages: ["@mutok/core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb"
    }
  }
};

module.exports = nextConfig;
