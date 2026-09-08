import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcrypt'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/client/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

/**
 * Local/demo seed only. Do not enable in production with real users.
 * Default accounts (created once; passwords are NOT reset on later runs):
 * - admin@example.com / adminpassword123 (admin)
 * - demo@family.local / demo12345 (user)
 */
async function main() {
  const demoPassword = await bcrypt.hash('demo12345', 10)
  const adminPassword = await bcrypt.hash('adminpassword123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: 'admin',
      name: 'Platform Admin',
      // Do not overwrite password_hash — preserves user-changed passwords across restarts
    },
    create: {
      email: 'admin@example.com',
      name: 'Platform Admin',
      password_hash: adminPassword,
      role: 'admin',
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'demo@family.local' },
    update: {},
    create: {
      email: 'demo@family.local',
      name: 'Demo User',
      password_hash: demoPassword,
      role: 'user',
    },
  })

  let tree = await prisma.familyTree.findFirst({
    where: { owner_id: user.id, name: 'Demo Family' },
  })

  if (!tree) {
    tree = await prisma.familyTree.create({
      data: {
        name: 'Demo Family',
        owner_id: user.id,
        members: {
          create: { user_id: user.id, role: 'owner' },
        },
      },
    })

    const parentA = await prisma.people.create({
      data: {
        tree_id: tree.id,
        first_name: 'Alex',
        last_name: 'Rivera',
        gender: 'male',
        birth_date: new Date('1980-03-12'),
        created_by: user.id,
      },
    })
    const parentB = await prisma.people.create({
      data: {
        tree_id: tree.id,
        first_name: 'Jordan',
        last_name: 'Rivera',
        gender: 'female',
        birth_date: new Date('1982-07-21'),
        created_by: user.id,
      },
    })
    const child = await prisma.people.create({
      data: {
        tree_id: tree.id,
        first_name: 'Sam',
        last_name: 'Rivera',
        gender: 'male',
        birth_date: new Date('2008-11-02'),
        created_by: user.id,
      },
    })

    await prisma.relationship.createMany({
      data: [
        { tree_id: tree.id, person_a_id: parentA.id, person_b_id: parentB.id, type: 'spouse', status: 'married' },
        { tree_id: tree.id, person_a_id: parentA.id, person_b_id: child.id, type: 'father-child' },
        { tree_id: tree.id, person_a_id: parentB.id, person_b_id: child.id, type: 'mother-child' },
      ],
    })
  }

  await prisma.treeMember.upsert({
    where: { tree_id_user_id: { tree_id: tree.id, user_id: admin.id } },
    update: { role: 'owner' },
    create: { tree_id: tree.id, user_id: admin.id, role: 'owner' },
  })

  console.log('Seed ensured admin@example.com (role: admin) and demo@family.local (role: user)')
  console.log('Passwords are set only on first create (adminpassword123 / demo12345)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
