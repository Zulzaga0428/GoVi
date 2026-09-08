/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway дээр standalone гаралт нь жижиг, хурдан асдаг.
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // legacy/ доторх хуучин нэг файлт хувилбар build-д хэрэггүй.
    outputFileTracingExcludes: { "*": ["./legacy/**"] }
  }
};

export default nextConfig;
