import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const prismaLogLevels: ('query' | 'error' | 'warn')[] =
    process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: prismaLogLevels,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
