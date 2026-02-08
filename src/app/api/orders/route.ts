import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        const accountId = searchParams.get('accountId') || ''

        const where: any = {}

        if (search) {
            where.orderName = { contains: search, mode: 'insensitive' }
        }
        if (status) {
            where.status = status
        }
        if (accountId) {
            where.accountId = accountId
        }

        const orders = await prisma.shopeeOrder.findMany({
            where,
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        password: true,
                        carrier: true
                    }
                }
            },
            orderBy: { createdDate: 'desc' }
        })

        return NextResponse.json(orders)
    } catch (e: any) {
        console.error('API GET /orders Error:', e)
        return NextResponse.json({ error: 'Failed to fetch orders', details: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Use transaction to ensure both order creation and account update succeed together
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the order
            const order = await tx.shopeeOrder.create({
                data: {
                    accountId: body.accountId,
                    orderName: body.orderName,
                    trackingNumber: body.trackingNumber,
                    createdDate: body.createdDate ? new Date(body.createdDate) : new Date(),
                    address: body.address,
                    voucherUsed: body.voucherUsed,
                    productLink: body.productLink,
                    quantity: body.quantity || 1,
                    productCategory: body.productCategory,
                    finalPrice: body.finalPrice,
                    status: body.status || 'new',
                    cancellationReason: body.cancellationReason
                },
                include: {
                    account: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            password: true,
                            carrier: true,
                            vouchers: true
                        }
                    }
                }
            })

            // 2. Increment orderCount for the account
            await tx.shopeeAccount.update({
                where: { id: body.accountId },
                data: { orderCount: { increment: 1 } }
            })

            // 3. Add voucher to account if voucherUsed is provided
            if (body.voucherUsed) {
                const account = await tx.shopeeAccount.findUnique({
                    where: { id: body.accountId },
                    select: { vouchers: true }
                })

                if (account) {
                    const existingVouchers = account.vouchers ? account.vouchers.split(',').map(v => v.trim()) : []
                    const newVoucher = body.voucherUsed.trim()

                    // Only add if not already in the list
                    if (!existingVouchers.includes(newVoucher)) {
                        const updatedVouchers = [...existingVouchers, newVoucher].filter(v => v).join(', ')
                        await tx.shopeeAccount.update({
                            where: { id: body.accountId },
                            data: { vouchers: updatedVouchers }
                        })
                    }
                }
            }

            return order
        })

        return NextResponse.json(result)
    } catch (e: any) {
        console.error('API POST /orders Error:', e)
        return NextResponse.json({ error: 'Failed to create order', details: e.message }, { status: 500 })
    }
}
