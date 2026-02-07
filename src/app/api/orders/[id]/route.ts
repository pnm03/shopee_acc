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

        await prisma.shopeeOrder.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('API DELETE /orders/[id] Error:', e)
        return NextResponse.json({ error: 'Failed to delete order', details: e.message }, { status: 500 })
    }
}
