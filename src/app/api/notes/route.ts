import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List all notes
export async function GET(request: NextRequest) {
    try {
        const notes = await prisma.note.findMany({
            include: {
                category: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(notes)
    } catch (error) {
        console.error('Error fetching notes:', error)
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
}

// POST - Create new note
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { productName, quantity, productCategory, categoryId, originalPrice, productLink } = body

        if (!productName) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
        }

        const note = await prisma.note.create({
            data: {
                productName,
                quantity: quantity || 1,
                productCategory: productCategory || null,
                categoryId: categoryId || null,
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                productLink: productLink || null
            },
            include: {
                category: true
            }
        })

        return NextResponse.json(note, { status: 201 })
    } catch (error) {
        console.error('Error creating note:', error)
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}
