
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { ids, status } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
        }

        if (!status) {
            return NextResponse.json({ error: 'No status provided' }, { status: 400 })
        }

        await prisma.shopeeOrder.updateMany({
            where: {
                id: {
                    in: ids
                }
            },
            data: {
                status: status
            }
        })

        return NextResponse.json({ success: true, count: ids.length })
    } catch (error) {
        console.error('Bulk update error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json()
        const { ids } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
            // 1. Fetch orders to identify affected accounts
            const orders = await tx.shopeeOrder.findMany({
                where: { id: { in: ids } },
                select: { id: true, accountId: true, voucherUsed: true }
            })

            // 2. Calculate updates per account
            const accountUpdates = new Map<string, { decrement: number, vouchersToRemove: string[] }>()

            for (const order of orders) {
                if (!order.accountId) continue;

                const entry = accountUpdates.get(order.accountId) || { decrement: 0, vouchersToRemove: [] }
                entry.decrement += 1
                if (order.voucherUsed) {
                    entry.vouchersToRemove.push(order.voucherUsed)
                }
                accountUpdates.set(order.accountId, entry)
            }

            // 3. Apply updates to accounts
            for (const [accId, update] of accountUpdates.entries()) {
                const account = await tx.shopeeAccount.findUnique({ where: { id: accId } })
                if (account) {
                    let newVouchers = account.vouchers
                    // Remove vouchers if needed
                    if (update.vouchersToRemove.length > 0 && account.vouchers) {
                        const currentList = account.vouchers.split(', ')
                        const filtered = currentList.filter(v => !update.vouchersToRemove.includes(v))
                        newVouchers = filtered.join(', ') || null
                    }

                    await tx.shopeeAccount.update({
                        where: { id: accId },
                        data: {
                            orderCount: { decrement: update.decrement },
                            vouchers: newVouchers
                        }
                    })
                }
            }

            // 4. Delete the orders
            await tx.shopeeOrder.deleteMany({
                where: {
                    id: {
                        in: ids
                    }
                }
            })
        })

        return NextResponse.json({ success: true, count: ids.length })
    } catch (error: any) {
        console.error('Bulk delete error:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}
