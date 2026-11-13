/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@nextgen/ui",
    "@nextgen/design-system",
    "@nextgen/mock-data",
    "@nextgen/shared-types",
  ],
};

export default nextConfig;
