/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Genera un build autocontenido para la imagen Docker (ignorado por Vercel).
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "media-*.api-sports.io" },
    ],
  },
};

module.exports = nextConfig;
