'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Sidebar({ userRole, isOpen, onToggle }: { userRole?: string, isOpen: boolean, onToggle: () => void }) {
    const pathname = usePathname()
    const router = useRouter()

    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Tài khoản Shopee', path: '/dashboard/accounts', icon: '🛍️' },
        { name: 'Quản lý Đơn hàng', path: '/dashboard/orders', icon: '📦' },
        { name: 'Ghi chú', path: '/dashboard/notes', icon: '📝' },
    ]

    const handleLogout = async () => {
        document.cookie = 'session_userId=; Max-Age=0; path=/;'
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    onClick={onToggle}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                        display: 'none'
                    }}
                    className="mobile-backdrop"
                />
            )}

            <aside className="glass-card" style={{
                width: '280px',
                height: 'calc(100vh - 4rem)',
                position: 'fixed',
                top: '2rem',
                left: isOpen ? '2rem' : '-300px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                zIndex: 1000,
                transition: 'left 0.3s ease-in-out'
            }}>
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'linear-gradient(135deg, #ee4d2d 0%, #cb2d3e 100%)',
                        borderRadius: '8px'
                    }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Shopee Manager</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => window.innerWidth < 768 && onToggle()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    color: isActive ? '#ee4d2d' : '#4b5563',
                                    background: isActive ? 'rgba(238, 77, 45, 0.1)' : 'transparent',
                                    fontWeight: isActive ? '600' : '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span>{item.icon}</span>
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontWeight: '600',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                    }}
                >
                    <span>🚪</span>
                    Đăng xuất
                </button>
            </aside>

            <style jsx global>{`
                @media (max-width: 768px) {
                    .mobile-backdrop {
                        display: block !important;
                    }
                    
                    aside.glass-card {
                        background: white !important;
                        backdrop-filter: none !important;
                    }
                }
            `}</style>
        </>
    )
}
