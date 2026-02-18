const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Force fresh builds - v2.0 redesign
  generateBuildId: async () => {
    return 'threshold-compass-v2-' + Date.now()
  },
}

module.exports = nextConfig
