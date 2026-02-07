import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function DashboardPage() {
    // Auth is already checked in layout, but we need user details for the page
    const cookieStore = await cookies()
    const userId = cookieStore.get('session_userId')?.value

    // Fallback if accessed directly without layout check (shouldn't happen due to layout protection)
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) return null

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '1rem', color: '#111827' }}>Dashboard</h1>
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '1.25rem' }}>Welcome, <strong style={{ color: '#ee4d2d' }}>{user.name || user.email}</strong></p>
                    <p style={{ marginTop: '0.5rem' }}>
                        Role: <span style={{
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            color: user.role === 'admin' ? '#ef4444' : '#3b82f6',
                            background: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85em',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>{user.role}</span>
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>ID: {user.id}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <Link href="/dashboard/orders" className="glass-card animate-fade-in" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    color: 'inherit',
                    animationDelay: '0.1s'
                }}>
                    <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</span>
                    <h3 style={{ color: '#111827', fontSize: '1.25rem', fontWeight: '600' }}>Manage Orders</h3>
                    <p style={{ color: '#6b7280' }}>View, process and track shopee orders</p>
                </Link>

                <Link href="/dashboard/accounts" className="glass-card animate-fade-in" style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    color: 'inherit',
                    animationDelay: '0.2s'
                }}>
                    <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛍️</span>
                    <h3 style={{ color: '#111827', fontSize: '1.25rem', fontWeight: '600' }}>Shopee Accounts</h3>
                    <p style={{ color: '#6b7280' }}>Manage connected accounts and status</p>
                </Link>

                {(user.role === 'admin') && (
                    <Link href="/dashboard/users" className="glass-card animate-fade-in" style={{
                        padding: '2rem',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        color: 'inherit',
                        animationDelay: '0.3s'
                    }}>
                        <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</span>
                        <h3 style={{ color: '#b91c1c', fontSize: '1.25rem', fontWeight: '600' }}>User Management</h3>
                        <p style={{ color: '#6b7280' }}>Create users & assign roles</p>
                    </Link>
                )}
            </div>
        </div>
    )
}


