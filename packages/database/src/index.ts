import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../generated/client/client"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required")
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

export default prisma
export * from "../generated/client/client"
