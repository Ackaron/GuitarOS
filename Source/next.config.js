/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true, // Helps Electron find files
    assetPrefix: './', // Forces relative paths for static assets (Critical for Electron file://)
    images: {
        unoptimized: true,
    },
    // Ensure we can import from outside if needed, though usually not recommended in Next.js
    // We'll use Electron's fs for external file access
};

module.exports = nextConfig;
