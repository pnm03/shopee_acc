'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createAccount, updateAccount, deleteAccount } from './actions'
import { useRouter } from 'next/navigation'

// Helper to calculate account status
const getStatus = (orderCount: number, manualStatus: string) => {
    if (manualStatus === 'banned') return 'banned'
    return orderCount > 0 ? 'active' : 'new'
}

type Account = {
    id: string
    username: string
    password?: string // optional in type, but usually present
    name: string | null
    carrier: string | null
    status: string
    vouchers: string | null
    orderCount: number
    createdAt: Date
}

export default function AccountsPage() {
    const router = useRouter()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [filterCarrier, setFilterCarrier] = useState('All')
    const [filterStatus, setFilterStatus] = useState('All')
    const [searchTerm, setSearchTerm] = useState('') // Search state
    const [isFiltersOpen, setIsFiltersOpen] = useState(false) // Mobile filter collapse

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [accountOrders, setAccountOrders] = useState<any[]>([]) // Orders for selected account

    // Add Form State
    const [addCarrier, setAddCarrier] = useState('VNMB')
    const [addOtherCarrier, setAddOtherCarrier] = useState('')

    // Initial Data Fetch (Client-side for simplicity with auto-updates, or could pass from server page)
    // To stick to server components pattern, we should pass data as prop. 
    // But for interactive filtering without reloads, let's fetch or use a client wrapper.
    // Let's make this page a Client Component that fetches data via a Server Action or API.
    // Actually, let's just use the `prisma` directly in a Server Component wrapper? 
    // No, Requirement "Popup", "Filter". Client component is best here.
    // I will fetch data using a useEffect calling an API or Server Action that returns data.

    const [isLoading, setIsLoading] = useState(true)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const fetchAccounts = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/accounts')
            const data = await res.json()
            if (Array.isArray(data)) {
                setAccounts(data)
            } else {
                console.error('API Error:', data)
                setAccounts([])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAccounts()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Fetch orders for selected account
    const fetchAccountOrders = async (accountId: string) => {
        try {
            const res = await fetch(`/api/orders?accountId=${accountId}`)
            const data = await res.json()
            if (Array.isArray(data)) {
                setAccountOrders(data)
            } else {
                console.error('Failed to fetch orders:', data)
                setAccountOrders([])
            }
        } catch (e) {
            console.error('Error fetching orders:', e)
            setAccountOrders([])
        }
    }

    // Fetch orders when detail modal opens
    useEffect(() => {
        if (isDetailOpen && selectedAccount) {
            fetchAccountOrders(selectedAccount.id)
        } else {
            setAccountOrders([]) // Clear orders when modal closes
        }
    }, [isDetailOpen, selectedAccount])

    const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
        e?.stopPropagation() // Prevent row click if event exists

        // Try modern Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    setToast({ message: `Đã sao chép ${label}: ${text}`, type: 'success' })
                })
                .catch(() => {
                    // Fallback if clipboard API fails
                    fallbackCopyTextToClipboard(text, label)
                })
        } else {
            // Fallback for older browsers or non-HTTPS
            fallbackCopyTextToClipboard(text, label)
        }
    }

    const fallbackCopyTextToClipboard = (text: string, label: string) => {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.top = '0'
        textArea.style.left = '0'
        textArea.style.width = '2em'
        textArea.style.height = '2em'
        textArea.style.padding = '0'
        textArea.style.border = 'none'
        textArea.style.outline = 'none'
        textArea.style.boxShadow = 'none'
        textArea.style.background = 'transparent'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
            const successful = document.execCommand('copy')
            if (successful) {
                setToast({ message: `Đã sao chép ${label}: ${text}`, type: 'success' })
            } else {
                setToast({ message: `Không thể sao chép. Vui lòng copy thủ công.`, type: 'error' })
            }
        } catch (err) {
            setToast({ message: `Lỗi khi sao chép: ${err}`, type: 'error' })
        }

        document.body.removeChild(textArea)
    }

    // --- Handlers ---

    async function handleAddSubmit(formData: FormData) {
        const res = await createAccount(formData)
        if (res?.success) {
            setIsAddOpen(false)
            fetchAccounts()
            // Reset form
        } else {
            setToast({ message: res?.error || 'Có lỗi xảy ra khi thêm tài khoản', type: 'error' })
        }
    }

    async function handleUpdateSubmit(formData: FormData) {
        if (!selectedAccount) return
        const res = await updateAccount(selectedAccount.id, formData)
        if (res?.success) {
            setToast({ message: 'Cập nhật tài khoản thành công', type: 'success' })
            setIsDetailOpen(false)
            setIsEditMode(false)
            fetchAccounts()
        } else {
            setToast({ message: res?.error || 'Có lỗi xảy ra khi cập nhật tài khoản', type: 'error' })
        }
    }

    async function handleDelete() {
        if (!selectedAccount || !confirm('Are you sure you want to delete this account?')) return
        const res = await deleteAccount(selectedAccount.id)
        if (res?.success) {
            setIsDetailOpen(false)
            fetchAccounts()
        }
    }

    // --- Derived Data ---
    const filteredAccounts = accounts.filter(acc => {
        // 1. Search Filter (Global)
        const term = searchTerm.toLowerCase().trim()
        const matchesSearch = !term ||
            (acc.name || '').toLowerCase().includes(term) ||
            (acc.username || '').toLowerCase().includes(term) ||
            (acc.carrier || '').toLowerCase().includes(term) ||
            (acc.password || '').toLowerCase().includes(term) ||
            (acc.orderCount || 0).toString().includes(term)

        if (!matchesSearch) return false

        // 2. Dropdown Filters
        const matchCarrier = filterCarrier === 'All' || (acc.carrier === filterCarrier)

        // Computed status logic for display (or use DB status if strictly managed)
        // Requirement: "Auto status". I'll use the logic here for display if DB isn't updated by a cron.
        // Real logic: DB status dominates if 'banned'. Else check date.
        const effectiveStatus = getStatus(acc.createdAt, acc.status)

        const matchStatus = filterStatus === 'All' || effectiveStatus === filterStatus
            || (filterStatus === 'active' && effectiveStatus === 'active')

        // Map UI filter to logic
        // UI: Mới tạo, Đang hoạt động, Đã khóa
        if (filterStatus === 'new' && effectiveStatus !== 'new') return false
        if (filterStatus === 'active' && effectiveStatus !== 'active') return false
        if (filterStatus === 'banned' && effectiveStatus !== 'banned') return false

        return matchCarrier && matchStatus
    }).sort((a, b) => {
        // Move locked accounts to bottom
        const statusA = getStatus(a.createdAt, a.status)
        const statusB = getStatus(b.createdAt, b.status)

        if (statusA === 'banned' && statusB !== 'banned') return 1
        if (statusA !== 'banned' && statusB === 'banned') return -1
        return 0
    })

    return (
        <div className="animate-fade-in">
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: '#10b981', // Green
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    animation: 'slideIn 0.3s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '600'
                }}>
                    <span>✅</span>
                    {toast.message}
                </div>
            )}

            <div className="accounts-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ flex: 1, marginRight: '2rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827' }}>
                        🛍️ Quản lý Tài khoản Shopee
                    </h1>

                    {/* Mobile Filter Toggle Button */}
                    <button
                        className="mobile-filter-toggle"
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                        style={{
                            display: 'none',
                            width: '100%',
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#374151',
                            textAlign: 'left',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span>🔍 Bộ lọc & Tìm kiếm</span>
                        <span style={{ transform: isFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                    </button>

                    <div className="filters-wrapper" style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '1rem',
                        flexWrap: 'wrap',
                        maxHeight: isFiltersOpen ? '500px' : '0',
                        overflow: 'hidden',
                        transition: 'max-height 0.3s ease-in-out'
                    }}>
                        {/* Search Input */}
                        <div className="filter-search" style={{ position: 'relative', minWidth: '300px' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm (Tên, Pass, Số dư...)"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 1rem 0.6rem 2.2rem',
                                    borderRadius: '8px',
                                    border: '1px solid #ee4d2d',
                                    outline: 'none',
                                    boxShadow: '0 0 0 2px rgba(238, 77, 45, 0.1)'
                                }}
                            />
                        </div>

                        <select
                            className="filter-select"
                            value={filterCarrier}
                            onChange={e => setFilterCarrier(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                        >
                            <option value="All">Tất cả nhà mạng</option>
                            <option value="VNMB">VNMB</option>
                            <option value="Viettel">Viettel</option>
                            <option value="VinaPhone">VinaPhone</option>
                            <option value="MobiFone">MobiFone</option>
                        </select>

                        <select
                            className="filter-select"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                        >
                            <option value="All">Tất cả trạng thái</option>
                            <option value="new">Mới tạo (5 ngày)</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="banned">Đã khóa</option>
                        </select>
                    </div>
                </div>

                <button
                    className="add-button"
                    onClick={() => setIsAddOpen(true)}
                    style={{
                        background: '#ee4d2d',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(238, 77, 45, 0.3)'
                    }}>
                    + Thêm Tài Khoản
                </button>
            </div>

            {/* Desktop Table */}
            <div className="glass-card desktop-table" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '0.8rem', textAlign: 'center', width: '60px' }}>STT</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Tên</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Tài khoản</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Mật khẩu</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Nhà mạng</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Trạng thái</th>
                            <th style={{ padding: '0.8rem', textAlign: 'right' }}>Số đơn</th>
                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Voucher</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAccounts.map((acc, index) => {
                            const status = getStatus(acc.orderCount, acc.status)
                            return (
                                <tr
                                    key={acc.id}
                                    onClick={() => { setSelectedAccount(acc); setIsDetailOpen(true); setIsEditMode(false) }}
                                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: 'bold', color: '#6b7280' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '0.8rem', fontWeight: '500' }}>
                                        {acc.name || '-'}
                                    </td>
                                    <td style={{ padding: '0.8rem', fontWeight: '600' }}>
                                        <CopyableText text={acc.username} onCopy={copyToClipboard} label="Tài khoản" />
                                    </td>
                                    <td style={{ padding: '0.8rem', fontFamily: 'monospace', color: '#6b7280' }}>
                                        <CopyableText text={acc.password || '******'} value={acc.password} onCopy={copyToClipboard} label="Mật khẩu" />
                                    </td>
                                    <td style={{ padding: '0.8rem' }}>{acc.carrier || '-'}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                        <StatusBadge status={status} />
                                    </td>
                                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>{acc.orderCount}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                        <VoucherCell vouchersString={acc.vouchers} />
                                    </td>
                                </tr>
                            )
                        })}
                        {filteredAccounts.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Không tìm thấy tài khoản nào</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards" style={{ display: 'none' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Đang tải...</div>
                ) : filteredAccounts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Không tìm thấy tài khoản nào</div>
                ) : (
                    filteredAccounts.map((acc, index) => {
                        const effectiveStatus = getStatus(acc.orderCount, acc.status)
                        const vouchersArray = acc.vouchers ? acc.vouchers.split(',').map((v: string) => v.trim()) : []
                        return (
                            <div
                                key={acc.id}
                                className="glass-card"
                                onClick={() => {
                                    setSelectedAccount(acc)
                                    setIsDetailOpen(true)
                                }}
                                style={{
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                            #{index + 1}
                                        </div>
                                        <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                            {acc.name || acc.username}
                                        </div>
                                        {acc.name && (
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                @{acc.username}
                                            </div>
                                        )}
                                    </div>
                                    <StatusBadge status={effectiveStatus} />
                                </div>


                                {/* Account Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Tên TK:</span>
                                        <div style={{ fontWeight: '600', color: '#111827' }}>{acc.name || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Đăng nhập:</span>
                                        <div style={{ fontWeight: '600', fontFamily: 'monospace', color: '#111827' }}>{acc.username}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Mật khẩu:</span>
                                        <div style={{ fontWeight: '600', fontFamily: 'monospace', color: '#374151' }}>{acc.password || '******'}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Nhà mạng:</span>
                                        <div style={{ fontWeight: '600' }}>{acc.carrier || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Số đơn:</span>
                                        <div style={{ fontWeight: '600', color: '#ee4d2d' }}>{acc.orderCount || 0}</div>
                                    </div>
                                    {vouchersArray.length > 0 && (
                                        <div style={{ padding: '0.5rem', background: '#f9fafb', borderRadius: '6px' }}>
                                            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.35rem' }}>Voucher đã dùng:</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {vouchersArray.slice(0, 3).map((v, i) => (
                                                    <span key={i} style={{ fontSize: '0.75rem', background: '#e5e7eb', padding: '3px 8px', borderRadius: '4px', color: '#4b5563', fontWeight: '500' }}>
                                                        {v}
                                                    </span>
                                                ))}
                                                {vouchersArray.length > 3 && (
                                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>+{vouchersArray.length - 3} khác</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Responsive Styles */}
            <style jsx>{responsiveStyles}</style>


            {/* ADD MODAL */}
            {isAddOpen && createPortal(
                <div className="modal-overlay" style={modalOverlayStyle} onClick={() => setIsAddOpen(false)}>
                    <div className="modal-content" style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Thêm Tài Khoản Mới</h2>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0.25rem 0.5rem',
                                    lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <form action={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Tên tài khoản (Hiển thị)</label>
                                <input name="name" style={inputStyle} placeholder="VD: Shop HCM 01" />
                            </div>
                            <div>
                                <label style={labelStyle}>Tên đăng nhập (Username)</label>
                                <input name="username" required style={inputStyle} placeholder="VD: shop_hcm_01" />
                            </div>
                            <div>
                                <label style={labelStyle}>Mật khẩu</label>
                                <input name="password" required style={inputStyle} type="text" placeholder="Nhập mật khẩu..." />
                            </div>
                            <div>
                                <label style={labelStyle}>Nhà mạng</label>
                                <select
                                    name="carrier"
                                    value={addCarrier}
                                    onChange={e => setAddCarrier(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="VNMB">Vietnamobile (VNMB)</option>
                                    <option value="Viettel">Viettel</option>
                                    <option value="VinaPhone">VinaPhone</option>
                                    <option value="MobiFone">MobiFone</option>
                                    <option value="Other">Khác (Tự nhập)</option>
                                </select>
                                {addCarrier === 'Other' && (
                                    <input
                                        name="otherCarrier"
                                        required
                                        style={{ ...inputStyle, marginTop: '0.5rem' }}
                                        placeholder="Nhập tên nhà mạng..."
                                    />
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Trạng thái</label>
                                    <select name="status" style={inputStyle}>
                                        <option value="new">Mới tạo</option>
                                        <option value="active">Đang hoạt động</option>
                                        <option value="banned">Đã khóa</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Ngày tạo</label>
                                    <input
                                        name="createdAt"
                                        type="date"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>


                            <div>
                                <label style={labelStyle}>Các Voucher đã dùng</label>
                                <VoucherSelector name="vouchers" />
                                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    💡 Không cần tick, khi thêm đơn hàng sẽ tự tick, nếu quên đơn hàng thì tick.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsAddOpen(false)} style={btnSecondary}>Hủy</button>
                                <button type="submit" style={btnPrimary}>Thêm Mới</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* DETAIL MODAL */}
            {isDetailOpen && selectedAccount && createPortal(
                <div className="modal-overlay" style={modalOverlayStyle} onClick={() => { setIsDetailOpen(false); setIsEditMode(false) }}>
                    <div className="modal-content" style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                                {isEditMode ? 'Chỉnh sửa Tài Khoản' : 'Thông tin Tài Khoản'}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {!isEditMode && (
                                    <>
                                        <button onClick={() => setIsEditMode(true)} style={{ ...btnSecondary, color: '#2563eb' }}>✏️ Sửa</button>
                                        <button onClick={handleDelete} style={{ ...btnSecondary, color: '#dc2626' }}>🗑️ Xóa</button>
                                    </>
                                )}
                                <button
                                    onClick={() => { setIsDetailOpen(false); setIsEditMode(false) }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        color: '#6b7280',
                                        padding: '0.25rem 0.5rem',
                                        lineHeight: 1
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <form action={handleUpdateSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>Tên tài khoản</label>
                                    {isEditMode ? (
                                        <input
                                            name="name"
                                            defaultValue={selectedAccount.name || ''}
                                            style={inputStyle}
                                            placeholder="Nhập tên hiển thị..."
                                        />
                                    ) : (
                                        <div
                                            onClick={() => { if (selectedAccount.name) copyToClipboard(selectedAccount.name, 'Tên tài khoản') }}
                                            style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', fontWeight: '600', color: '#111827', cursor: selectedAccount.name ? 'pointer' : 'default', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            title={selectedAccount.name ? 'Click để copy' : ''}
                                        >
                                            <span>{selectedAccount.name || '-'}</span>
                                            {selectedAccount.name && <span style={{ fontSize: '1rem' }}>📋</span>}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Username</label>
                                    {isEditMode ? (
                                        <input
                                            name="username"
                                            defaultValue={selectedAccount.username}
                                            style={inputStyle}
                                        />
                                    ) : (
                                        <div
                                            onClick={() => copyToClipboard(selectedAccount.username, 'Username')}
                                            style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', fontWeight: '600', color: '#111827', cursor: 'pointer', border: '1px solid #e5e7eb', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            title="Click để copy"
                                        >
                                            <span>{selectedAccount.username}</span>
                                            <span style={{ fontSize: '1rem' }}>📋</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Mật khẩu</label>
                                    {isEditMode ? (
                                        <input
                                            name="password"
                                            type="text"
                                            defaultValue={selectedAccount.password || ''}
                                            style={inputStyle}
                                            placeholder="Nhập mật khẩu mới (nếu muốn thay đổi)"
                                        />
                                    ) : (
                                        <div
                                            onClick={() => { if (selectedAccount.password) copyToClipboard(selectedAccount.password, 'Mật khẩu') }}
                                            style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', fontWeight: '600', color: '#111827', cursor: selectedAccount.password ? 'pointer' : 'default', border: '1px solid #e5e7eb', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            title={selectedAccount.password ? 'Click để copy' : ''}
                                        >
                                            <span>{selectedAccount.password || '******'}</span>
                                            {selectedAccount.password && <span style={{ fontSize: '1rem' }}>📋</span>}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Nhà mạng</label>
                                    {isEditMode ? (
                                        <select name="carrier" defaultValue={selectedAccount.carrier || 'VNMB'} style={inputStyle}>
                                            <option value="VNMB">VNMB</option>
                                            <option value="Viettel">Viettel</option>
                                            <option value="VinaPhone">VinaPhone</option>
                                            <option value="Other">Khác</option>
                                        </select>
                                    ) : (
                                        <div style={textValueStyle}>{selectedAccount.carrier}</div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Trạng thái</label>
                                    {isEditMode ? (
                                        <select name="status" defaultValue={selectedAccount.status} style={inputStyle}>
                                            <option value="new">Auto (Mới tạo)</option>
                                            <option value="active">Đang hoạt động</option>
                                            <option value="banned">Đã khóa</option>
                                        </select>
                                    ) : (
                                        <StatusBadge status={getStatus(selectedAccount.orderCount, selectedAccount.status)} />
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Số đơn hàng</label>
                                    <div style={textValueStyle}>{selectedAccount.orderCount}</div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Ngày tạo</label>
                                    <div style={textValueStyle}>{new Date(selectedAccount.createdAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={labelStyle}>Voucher đã dùng</label>
                                {isEditMode ? (
                                    <VoucherSelector name="vouchers" initialValue={selectedAccount.vouchers} />
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {selectedAccount.vouchers ? selectedAccount.vouchers.split(',').map((v: string) => (
                                            <span key={v} style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                                {v.trim()}
                                            </span>
                                        )) : <span style={{ color: '#9ca3af' }}>Chưa dùng voucher nào</span>}
                                    </div>
                                )}
                            </div>

                            {/* Orders List Section */}
                            <div style={{ marginTop: '2rem', borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                                    📦 Danh sách đơn hàng ({accountOrders.length})
                                </h3>

                                {accountOrders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' }}>
                                        Chưa có đơn hàng nào
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Tên đơn</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Mã vận đơn</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Voucher</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Giá</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Trạng thái</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>Ngày tạo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {accountOrders.map((order: any) => {
                                                    const statusColors: any = {
                                                        new: { bg: '#dbeafe', text: '#1e40af', label: 'Mới' },
                                                        processing: { bg: '#fef3c7', text: '#92400e', label: 'Đang xử lý' },
                                                        shipped: { bg: '#e0e7ff', text: '#3730a3', label: 'Đã gửi' },
                                                        delivered: { bg: '#d1fae5', text: '#065f46', label: 'Đã giao' },
                                                        cancelled: { bg: '#fee2e2', text: '#991b1b', label: 'Đã hủy' }
                                                    }
                                                    const statusStyle = statusColors[order.status] || statusColors.new


                                                    return (
                                                        <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                            <td style={{ padding: '0.75rem', position: 'relative' }}>
                                                                <TooltipCell
                                                                    text={order.orderName || '-'}
                                                                    maxLength={8}
                                                                />
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.85rem',
                                                                    cursor: order.trackingNumber ? 'pointer' : 'default',
                                                                    color: order.trackingNumber ? '#111827' : '#6b7280',
                                                                    position: 'relative'
                                                                }}
                                                                onClick={(e) => {
                                                                    if (order.trackingNumber) {
                                                                        copyToClipboard(order.trackingNumber, 'Mã vận đơn', e)
                                                                    }
                                                                }}
                                                            >
                                                                {order.trackingNumber ? (
                                                                    <TooltipCell
                                                                        text={order.trackingNumber}
                                                                        maxLength={5}
                                                                    />
                                                                ) : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.75rem' }}>
                                                                {order.voucherUsed ? (
                                                                    <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                                        {order.voucherUsed}
                                                                    </span>
                                                                ) : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                                                                {order.finalPrice ? order.finalPrice.toLocaleString('vi-VN') + 'đ' : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                                <span style={{
                                                                    background: statusStyle.bg,
                                                                    color: statusStyle.text,
                                                                    padding: '4px 12px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {statusStyle.label}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                                                {new Date(order.createdDate).toLocaleDateString('vi-VN')}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsDetailOpen(false)} style={btnSecondary}>Đóng</button>
                                {isEditMode && <button type="submit" style={btnPrimary}>Lưu Thay Đổi</button>}
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function CopyableText({ text, value, onCopy, label }: { text: string, value?: string, onCopy: any, label: string }) {
    return (
        <span
            onClick={(e) => onCopy(value || text, label, e)}
            title="Click to copy"
            style={{
                cursor: 'copy',
                borderBottom: '1px dashed #9ca3af',
                transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ee4d2d'; e.currentTarget.style.borderBottomColor = '#ee4d2d' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'inherit'; e.currentTarget.style.borderBottomColor = '#9ca3af' }}
        >
            {text}
        </span>
    )
}

function VoucherCell({ vouchersString }: { vouchersString: string | null }) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (!vouchersString) return <span>-</span>

    const vouchers = vouchersString.split(',').map(v => v.trim()).filter(v => v)
    if (vouchers.length === 0) return <span>-</span>

    if (vouchers.length === 1) {
        return (
            <span style={{
                fontSize: '0.85rem',
                background: '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block'
            }}>
                {vouchers[0]}
            </span>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '0.9rem',
                    color: '#ee4d2d',
                    fontWeight: 500
                }}
            >
                <span>{vouchers.length} vouchers</span>
                <span style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    fontSize: '0.8rem'
                }}>▼</span>
            </div>

            {isExpanded && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {vouchers.map((v, i) => (
                        <span key={i} style={{
                            fontSize: '0.85rem',
                            background: '#f3f4f6',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb',
                            width: 'fit-content'
                        }}>
                            {v}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// --- Tooltip Cell Component ---
function TooltipCell({ text, maxLength = 10 }: { text: string, maxLength?: number }) {
    const [showTooltip, setShowTooltip] = useState(false)
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text
    const needsTruncation = text.length > maxLength

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span>{truncated}</span>
            {showTooltip && needsTruncation && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#1f2937',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    pointerEvents: 'none'
                }}>
                    {text}
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '6px solid #1f2937'
                    }} />
                </div>
            )}
        </div>
    )
}

// --- Voucher Selector Component ---
function VoucherSelector({ name, initialValue = '' }: { name: string, initialValue?: string }) {
    const options = ['100.000', '80.000', '20.000', '10.000']
    const [selected, setSelected] = useState<string[]>(initialValue ? initialValue.split(',').map(s => s.trim()) : [])
    const [other, setOther] = useState('')

    const toggle = (opt: string) => {
        if (selected.includes(opt)) {
            setSelected(selected.filter(s => s !== opt))
        } else {
            setSelected([...selected, opt])
        }
    }

    // Hidden input to submit the actual string value
    // If 'Other' is typed but not empty, include it? Or require adding it?
    // Let's assume other is simpler: just a text input that adds to the list logic is too complex for simple form.
    // Simpler UI: Checkboxes for presets + Text Input for "Other (comma separated)"

    // Better: Just maintain the string in a hidden input.
    const finalString = [...selected, ...(other ? [other] : [])].join(', ')

    return (
        <div>
            <input type="hidden" name={name} value={finalString} />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {options.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={selected.includes(opt)}
                            onChange={() => toggle(opt)}
                        />
                        {opt}
                    </label>
                ))}
            </div>
            <input
                placeholder="Nhập loại khác (cách nhau bởi dấu phẩy)..."
                value={other}
                onChange={e => setOther(e.target.value)}
                style={inputStyle}
            />
        </div>
    )
}

// --- Styles & Components ---

function StatusBadge({ status }: { status: string }) {
    let color = '#166534';
    let bg = '#dcfce7';
    let label = 'Đang hoạt động';

    if (status === 'new') {
        color = '#1e40af';
        bg = '#dbeafe';
        label = 'Mới tạo';
    } else if (status === 'banned') {
        color = '#991b1b';
        bg = '#fee2e2';
        label = 'Đã khóa';
    }

    return (
        <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: bg,
            color: color,
        }}>
            {label}
        </span>
    )
}

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0, // Shorthand for top: 0, right: 0, bottom: 0, left: 0
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
}

const modalContentStyle: React.CSSProperties = {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }
const disabledInputStyle: React.CSSProperties = { ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }

const btnPrimary: React.CSSProperties = {
    background: '#ee4d2d', color: 'white', padding: '0.75rem 1.5rem',
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer'
}

const btnSecondary: React.CSSProperties = {
    background: '#f3f4f6', color: '#374151', padding: '0.75rem 1.5rem',
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer'
}

const textValueStyle: React.CSSProperties = {
    padding: '0.75rem 0', fontWeight: 'bold', color: '#111827'
}

// Mobile Responsive Styles
const responsiveStyles = `
    @media (max-width: 768px) {
        /* Header and Filters */
        .accounts-header {
            flex-direction: column !important;
            gap: 1rem !important;
        }
        
        /* Show mobile filter toggle */
        .mobile-filter-toggle {
            display: flex !important;
        }
        
        /* Filters are initially hidden, controlled by isFiltersOpen */
        .filters-wrapper {
            flex-direction: column !important;
            width: 100% !important;
        }
        
        .filter-search {
            min-width: 100% !important;
        }
        
        .filter-select {
            width: 100% !important;
        }
        
        .add-button {
            width: 100% !important;
        }
        
        /* Hide desktop table */
        .desktop-table {
            display: none !important;
        }
        
        /* Show mobile cards */
        .mobile-cards {
            display: block !important;
        }
        
        /* Modal full screen on mobile */
        .modal-content {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            padding: 1rem !important;
        }
        
        .modal-overlay {
            align-items: stretch !important;
        }
    }
    
    /* Desktop: hide mobile cards and filter toggle */
    @media (min-width: 769px) {
        .mobile-cards {
            display: none !important;
        }
        
        .mobile-filter-toggle {
            display: none !important;
        }
        
        .filters-wrapper {
            max-height: none !important;
            overflow: visible !important;
        }
    }

    /* Ensure modals are always on top of everything including sidebar */
    .modal-overlay {
        z-index: 9999 !important;
    }
`

