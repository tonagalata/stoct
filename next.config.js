/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for Netlify deployment
  // Netlify supports Next.js with serverless functions
  images: {
    unoptimized: true
  },
  outputFileTracingRoot: __dirname
}

module.exports = nextConfig
