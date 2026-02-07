import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Execute raw SQL to create admin user
    await prisma.$executeRaw`
        INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
        VALUES (
            'admin-001',
            'admin@example.com',
            'admin123',
            'Admin',
            'admin',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING
    `

    console.log('✅ Admin user created: admin@example.com / admin123')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
