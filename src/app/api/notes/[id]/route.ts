import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Get single note
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const note = await prisma.note.findUnique({
            where: { id: params.id },
            include: { category: true }
        })

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 })
        }

        return NextResponse.json(note)
    } catch (error: any) {
        console.error('Error fetching note:', error)
        return NextResponse.json({
            error: 'Failed to fetch note',
            details: error.message
        }, { status: 500 })
    }
}

// PUT - Update note
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { productName, quantity, productCategory, categoryId, originalPrice, productLink } = body

        console.log('[Note API] Updating note:', params.id, body)

        const note = await prisma.note.update({
            where: { id: params.id },
            data: {
                productName,
                quantity,
                productCategory: productCategory || null,
                categoryId: categoryId || null,
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                productLink
            },
            include: { category: true }
        })

        console.log('[Note API] Note updated successfully')
        return NextResponse.json(note)
    } catch (error: any) {
        console.error('[Note API] Error updating note:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        })
        return NextResponse.json({
            error: 'Failed to update note',
            details: error.message,
            code: error.code
        }, { status: 500 })
    }
}

// DELETE - Delete note
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        console.log('[Note API] Deleting note:', params.id)

        await prisma.note.delete({
            where: { id: params.id }
        })

        console.log('[Note API] Note deleted successfully')
        return NextResponse.json({ message: 'Note deleted successfully' })
    } catch (error: any) {
        console.error('[Note API] Error deleting note:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        })
        return NextResponse.json({
            error: 'Failed to delete note',
            details: error.message,
            code: error.code
        }, { status: 500 })
    }
}
