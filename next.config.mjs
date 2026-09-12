/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block the page from being framed (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Basic XSS auditor (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Enforce HTTPS in production
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Referrer leak prevention
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions policy to limit browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy — allow self + data/inline styling used by
  // Next.js + Midtrans Snap; strict enough to block inline script injection.
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.sandbox.midtrans.com https://app.midtrans.com; " +
      "style-src 'self' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com; " +
      "frame-src https://app.sandbox.midtrans.com https://app.midtrans.com; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcryptjs"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

