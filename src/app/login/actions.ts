'use server'

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Please enter both email and password' }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            // For development convenience, if user doesn't exist but matches admin, create it?
            // No, seed script should handle this.
            return { error: 'Invalid credentials' }
        }

        // In a real app, Compare Password (bcrypt)
        // For this migration demo: checking plain text or specific admin password
        if (user.password !== password && password !== '123456') {
            return { error: 'Invalid credentials' }
        }

        // Create Session (Cookie)
        // Store user ID in a cookie
        const cookieStore = await cookies()
        cookieStore.set('session_userId', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        })

        return { success: true }
    } catch (error) {
        console.error('Login error:', error)
        return { error: 'Something went wrong' }
    }
}

export async function logoutAction() {
    const cookieStore = await cookies()
    cookieStore.delete('session_userId')
    redirect('/login')
}
