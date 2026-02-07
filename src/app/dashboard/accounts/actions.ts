'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Create
export async function createAccount(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string // New field
    const carrier = formData.get('carrier') as string
    const otherCarrier = formData.get('otherCarrier') as string
    const status = formData.get('status') as string
    const createdAtStr = formData.get('createdAt') as string
    const vouchers = formData.get('vouchers') as string

    // ... validation ...

    const finalCarrier = carrier === 'Other' ? otherCarrier : carrier

    // Validate Date
    let validCreatedAt: Date | undefined = undefined
    if (createdAtStr) {
        const d = new Date(createdAtStr)
        if (!isNaN(d.getTime())) {
            validCreatedAt = d
        }
    }

    try {
        await prisma.shopeeAccount.create({
            data: {
                username,
                password,
                name: name || null, // Optional
                carrier: finalCarrier,
                status: status || 'new',
                orderCount: 0,
                vouchers: vouchers || '',
                createdAt: validCreatedAt, // Uses undefined if invalid or missing, falling back to @default(now())
            }
        })
        revalidatePath('/dashboard/accounts')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        // Unique constraint check
        if (e.code === 'P2002') {
            return { error: 'Username already exists' }
        }
        return { error: 'Failed to create account: ' + e.message }
    }
}

// Update
export async function updateAccount(id: string, formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const carrier = formData.get('carrier') as string
    const otherCarrier = formData.get('otherCarrier') as string
    const status = formData.get('status') as string
    const vouchers = formData.get('vouchers') as string

    const finalCarrier = carrier === 'Other' ? otherCarrier : carrier

    try {
        const data: any = {
            username,
            carrier: finalCarrier,
            status: status || undefined,
            name: name || null,
            vouchers: vouchers || '',
        }
        if (password) {
            data.password = password
        }

        await prisma.shopeeAccount.update({
            where: { id },
            data
        })
        revalidatePath('/dashboard/accounts')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: 'Username already exists' }
        }
        return { error: 'Failed to update account: ' + e.message }
    }
}

// Delete
export async function deleteAccount(id: string) {
    try {
        await prisma.shopeeAccount.delete({
            where: { id }
        })
        revalidatePath('/dashboard/accounts')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to delete' }
    }
}
