/** @type {import('next').NextConfig} */
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  output: "standalone",
  // Keep CSS/assets and traced deps correct in the monorepo Docker image
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    return []
  },
}

export default nextConfig
