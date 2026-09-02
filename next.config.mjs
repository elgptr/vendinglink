/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.sandbox.midtrans.com",
      },
      {
        protocol: "https",
        hostname: "api.midtrans.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
};

export default nextConfig;
