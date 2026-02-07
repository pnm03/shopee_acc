'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayoutClient({
    children,
    userRole
}: {
    children: React.ReactNode
    userRole: string
}) {
    // Initialize sidebar state - will be set based on screen size
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(true)

    // Detect screen size and manage sidebar state
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)

            // Auto-manage sidebar based on screen size
            if (!mobile) {
                setSidebarOpen(true) // Desktop: always open
            } else {
                setSidebarOpen(false) // Mobile: always closed by default
            }
        }

        // Check on mount
        checkScreenSize()

        // Listen for window resize
        window.addEventListener('resize', checkScreenSize)
        return () => window.removeEventListener('resize', checkScreenSize)
    }, [])

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Hamburger Menu Button (Mobile Only) */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hamburger-btn"
                style={{
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 1001,
                    background: '#ee4d2d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'none',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
            >
                ☰
            </button>

            <Sidebar userRole={userRole} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

            <main className="main-content" style={{
                flex: 1,
                marginLeft: isMobile ? '0' : '300px',
                padding: '2rem',
                paddingTop: '3rem',
                transition: 'margin-left 0.3s ease-in-out'
            }}>
                {children}
            </main>

            <style jsx global>{`
                @media (max-width: 768px) {
                    .hamburger-btn {
                        display: block !important;
                    }
                    .main-content {
                        margin-left: 0 !important;
                        padding: 1rem !important;
                        padding-top: 4rem !important;
                    }
                }
            `}</style>
        </div>
    )
}
