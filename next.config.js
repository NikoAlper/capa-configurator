/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push({ undici: 'undici' });
    return config;
  },
};

module.exports = nextConfig;
