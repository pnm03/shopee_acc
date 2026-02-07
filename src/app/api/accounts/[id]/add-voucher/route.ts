import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const { voucher } = body

        if (!voucher) {
            return NextResponse.json({ error: 'Voucher is required' }, { status: 400 })
        }

        // Get current account
        const account = await prisma.shopeeAccount.findUnique({
            where: { id }
        })

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 })
        }

        // Add voucher to existing vouchers
        const currentVouchers = account.vouchers ? account.vouchers.split(', ') : []
        if (!currentVouchers.includes(voucher)) {
            currentVouchers.push(voucher)
        }

        // Update account with new vouchers
        const updatedAccount = await prisma.shopeeAccount.update({
            where: { id },
            data: {
                vouchers: currentVouchers.join(', ')
            }
        })

        return NextResponse.json(updatedAccount)
    } catch (e: any) {
        console.error('API POST /accounts/[id]/add-voucher Error:', e)
        return NextResponse.json({ error: 'Failed to add voucher', details: e.message }, { status: 500 })
    }
}
