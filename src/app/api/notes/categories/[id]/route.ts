import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Update category name
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const { name } = body

        if (!name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        const category = await prisma.noteCategory.update({
            where: { id: params.id },
            data: { name }
        })

        return NextResponse.json(category)
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

// DELETE - Delete category
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        console.log('[Category DELETE] Deleting category with ID:', params.id)

        await prisma.noteCategory.delete({
            where: { id: params.id }
        })

        console.log('[Category DELETE] Category deleted successfully')
        return NextResponse.json({ message: 'Category deleted successfully' })
    } catch (error: any) {
        console.error('[Category DELETE] Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        })

        if (error.code === 'P2025') {
            return NextResponse.json({
                error: 'Category not found',
                details: error.message
            }, { status: 404 })
        }
        return NextResponse.json({
            error: 'Failed to delete category',
            details: error.message,
            code: error.code
        }, { status: 500 })
    }
}
