import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List all categories
export async function GET(request: NextRequest) {
    try {
        const categories = await prisma.noteCategory.findMany({
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
}

// POST - Create new category
export async function POST(request: NextRequest) {
    try {
        console.log('[Category API] POST request received')
        const body = await request.json()
        console.log('[Category API] Request body:', body)
        const { name } = body

        if (!name) {
            console.log('[Category API] Validation failed: name is required')
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        console.log('[Category API] Creating category with name:', name)
        const category = await prisma.noteCategory.create({
            data: { name }
        })
        console.log('[Category API] Category created successfully:', category)

        return NextResponse.json(category, { status: 201 })
    } catch (error: any) {
        console.error('[Category API] Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        })
        if (error.code === 'P2002') {
            return NextResponse.json({
                error: 'Category already exists',
                details: error.message
            }, { status: 400 })
        }
        return NextResponse.json({
            error: 'Failed to create category',
            details: error.message,
            code: error.code
        }, { status: 500 })
    }
}
