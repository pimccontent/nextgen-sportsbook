/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@nextgen/design-system", "@nextgen/mock-data"],
};

export default nextConfig;
