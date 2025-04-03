/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase the serverless function timeout for web scraping operations
  experimental: {
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Increase memory limit for serverless functions
  webpack: (config) => {
    config.externals = [...(config.externals || []), "chrome-aws-lambda"];
    return config;
  },
};

export default nextConfig;

