import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const order = await prisma.shopeeOrder.findUnique({
            where: { id },
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
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json(order)
    } catch (e: any) {
        console.error('API GET /orders/[id] Error:', e)
        return NextResponse.json({ error: 'Failed to fetch order', details: e.message }, { status: 500 })
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()

        const order = await prisma.shopeeOrder.update({
            where: { id },
            data: {
                account: {
                    connect: { id: body.accountId }
                },
                orderName: body.orderName,
                trackingNumber: body.trackingNumber,
                createdDate: body.createdDate ? new Date(body.createdDate) : undefined,
                address: body.address,
                voucherUsed: body.voucherUsed,
                productLink: body.productLink,
                quantity: body.quantity,
                productCategory: body.productCategory,
                finalPrice: body.finalPrice,
                status: body.status,
                cancellationReason: body.cancellationReason
            },
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
            }
        })

        return NextResponse.json(order)
    } catch (e: any) {
        console.error('API PUT /orders/[id] Error:', e)
        return NextResponse.json({ error: 'Failed to update order', details: e.message }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Use transaction to ensure both order deletion and account update succeed together
        await prisma.$transaction(async (tx) => {
            // 1. Get the order to find the accountId
            const order = await tx.shopeeOrder.findUnique({
                where: { id },
                select: { accountId: true }
            })

            if (!order) {
                throw new Error('Order not found')
            }

            // 2. Delete the order
            await tx.shopeeOrder.delete({
                where: { id }
            })

            // 3. Decrement orderCount for the account
            await tx.shopeeAccount.update({
                where: { id: order.accountId },
                data: { orderCount: { decrement: 1 } }
            })
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('API DELETE /orders/[id] Error:', e)
        return NextResponse.json({ error: 'Failed to delete order', details: e.message }, { status: 500 })
    }
}
