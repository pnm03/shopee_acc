import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const accounts = await prisma.shopeeAccount.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(accounts)
    } catch (e: any) {
        console.error('API GET /accounts Error:', e)
        return NextResponse.json({ error: 'Failed to fetch accounts', details: e.message }, { status: 500 })
    }
}
