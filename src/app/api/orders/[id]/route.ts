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

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current order to compare
            const currentOrder = await tx.shopeeOrder.findUnique({
                where: { id },
                select: { accountId: true, voucherUsed: true }
            })

            if (!currentOrder) throw new Error('Order not found')

            // 2. Handle Account/Voucher changes if needed
            const oldAccountId = currentOrder.accountId
            const newAccountId = body.accountId
            const oldVoucher = currentOrder.voucherUsed
            const newVoucher = body.voucherUsed

            // Scenario A: Account Changed
            if (oldAccountId !== newAccountId) {
                // Remove from Old Account
                if (oldAccountId) {
                    const oldAccount = await tx.shopeeAccount.findUnique({ where: { id: oldAccountId } })
                    if (oldAccount) {
                        let newVouchers = oldAccount.vouchers
                        if (oldVoucher && oldAccount.vouchers) {
                            newVouchers = oldAccount.vouchers.split(', ').filter(v => v !== oldVoucher).join(', ') || null
                        }
                        await tx.shopeeAccount.update({
                            where: { id: oldAccountId },
                            data: {
                                orderCount: { decrement: 1 },
                                vouchers: newVouchers
                            }
                        })
                    }
                }

                // Add to New Account
                if (newAccountId) {
                    const newAccount = await tx.shopeeAccount.findUnique({ where: { id: newAccountId } })
                    if (newAccount) {
                        let newVouchers = newAccount.vouchers ? newAccount.vouchers.split(', ') : []
                        if (newVoucher) newVouchers.push(newVoucher)

                        await tx.shopeeAccount.update({
                            where: { id: newAccountId },
                            data: {
                                orderCount: { increment: 1 },
                                vouchers: newVouchers.join(', ') || null
                            }
                        })
                    }
                }
            }
            // Scenario B: Same Account, but Voucher Changed
            else if (oldAccountId && (oldVoucher !== newVoucher)) {
                const account = await tx.shopeeAccount.findUnique({ where: { id: oldAccountId } })
                if (account) {
                    let vouchers = account.vouchers ? account.vouchers.split(', ') : []

                    // Remove old if exists
                    if (oldVoucher) {
                        vouchers = vouchers.filter(v => v !== oldVoucher)
                    }
                    // Add new if exists
                    if (newVoucher) {
                        vouchers.push(newVoucher)
                    }

                    await tx.shopeeAccount.update({
                        where: { id: oldAccountId },
                        data: { vouchers: vouchers.join(', ') || null }
                    })
                }
            }

            // 3. Update Order
            return await tx.shopeeOrder.update({
                where: { id },
                data: {
                    accountId: body.accountId,
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
        })

        return NextResponse.json(result)
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

        await prisma.$transaction(async (tx) => {
            // 1. Get order details
            const order = await tx.shopeeOrder.findUnique({
                where: { id },
                select: { accountId: true, voucherUsed: true }
            })

            if (!order) {
                // Proceed to delete gracefully if not found? Or throw. 
                // For idempotency, return success logic, but here throwing is safe.
                throw new Error('Order not found')
            }

            // 2. Update account: Decrement count AND remove voucher if used
            if (order.accountId) {
                const account = await tx.shopeeAccount.findUnique({ where: { id: order.accountId } })
                if (account) {
                    let newVouchers = account.vouchers
                    if (order.voucherUsed && account.vouchers) {
                        const vouchers = account.vouchers.split(', ').filter(v => v !== order.voucherUsed)
                        newVouchers = vouchers.join(', ') || null
                    }

                    await tx.shopeeAccount.update({
                        where: { id: order.accountId },
                        data: {
                            orderCount: { decrement: 1 },
                            vouchers: newVouchers
                        }
                    })
                }
            }

            // 3. Delete order
            await tx.shopeeOrder.delete({
                where: { id }
            })
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('API DELETE /orders/[id] Error:', e)
        return NextResponse.json({ error: 'Failed to delete order', details: e.message }, { status: 500 })
    }
}
