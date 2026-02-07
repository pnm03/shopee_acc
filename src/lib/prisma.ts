import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    })
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
