'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Account = {
    id: string
    name: string | null
    username: string
    password: string | null
    carrier: string | null
    label: string
}

const TooltipCell = ({
    text,
    limit = 8,
    style,
    onCopy
}: {
    text: string | null | undefined,
    limit?: number,
    style?: React.CSSProperties,
    onCopy?: () => void
}) => {
    const [isHovered, setIsHovered] = useState(false)

    if (!text) return <span style={style}>-</span>

    const shouldTruncate = text.length > limit
    const displayText = shouldTruncate ? text.slice(0, limit) + '...' : text

    return (
        <div
            style={{ position: 'relative', display: 'inline-block', ...style }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
                if (onCopy) {
                    e.stopPropagation()
                    onCopy()
                }
            }}
        >
            <span style={{ cursor: onCopy ? 'copy' : 'inherit' }}>
                {displayText}
            </span>
            {isHovered && (shouldTruncate || onCopy) && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    background: '#1f2937',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    zIndex: 100,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '0.875rem',
                    minWidth: 'max-content'
                }}>
                    {text}
                </div>
            )}
        </div>
    )
}

type Order = {
    id: string
    accountId: string
    orderName: string
    trackingNumber: string | null
    createdDate: string
    address: string | null
    voucherUsed: string | null
    productLink: string | null
    quantity: number
    productCategory: string | null
    finalPrice: number | null
    status: string
    cancellationReason: string | null
    account?: Account
}

const STATUS_OPTIONS = [
    { value: 'new', label: 'Mới tạo đơn' },
    { value: 'waiting', label: 'Chờ lấy hàng' },
    { value: 'picking', label: 'Đang lấy hàng' },
    { value: 'shipping', label: 'Đang vận chuyển' },
    { value: 'completed', label: 'Đã hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' }
]

const VOUCHER_OPTIONS = ['10.000', '15.000', '20.000', '60.000', '80.000', '100.000']

function VoucherInput({ name, defaultValue, disabled, style }: { name: string, defaultValue?: string, disabled?: boolean, style?: React.CSSProperties }) {
    const isPreset = defaultValue && VOUCHER_OPTIONS.includes(defaultValue)
    const [mode, setMode] = useState(isPreset || !defaultValue ? 'select' : 'custom')
    const [value, setValue] = useState(defaultValue || '')

    // Sync with preset options if mode is select
    const selectValue = mode === 'select' ? (VOUCHER_OPTIONS.includes(value) ? value : '') : 'custom'

    // Update internal state when defaultValue changes (important for re-opening modals)
    useEffect(() => {
        if (defaultValue) {
            setValue(defaultValue)
            setMode(VOUCHER_OPTIONS.includes(defaultValue) ? 'select' : 'custom')
        }
    }, [defaultValue])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <select
                disabled={disabled}
                value={selectValue}
                onChange={(e) => {
                    const val = e.target.value
                    if (val === 'custom') {
                        setMode('custom')
                        setValue('')
                    } else {
                        setMode('select')
                        setValue(val)
                    }
                }}
                style={style}
            >
                <option value="">-- Chọn voucher --</option>
                {VOUCHER_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                ))}
                <option value="custom">-- Tự nhập (Khác) --</option>
            </select>

            {mode === 'custom' && (
                <input
                    type="text"
                    placeholder="Nhập giá trị voucher (VD: 50.000)"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={disabled}
                    style={style}
                />
            )}

            <input type="hidden" name={name} value={value} />
        </div>
    )
}


export default function OrdersClient() {
    const router = useRouter()
    const [orders, setOrders] = useState<Order[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
    const [showCompleted, setShowCompleted] = useState(false)

    // Form state
    const [selectedAccountId, setSelectedAccountId] = useState('')
    const [orderStatus, setOrderStatus] = useState('new')
    const [priceDisplay, setPriceDisplay] = useState('')
    const [formKey, setFormKey] = useState(0)

    // Toast
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // Status change modal
    const [statusChangeModal, setStatusChangeModal] = useState<{ orderId: string, currentStatus: string } | null>(null)

    // Tracking info
    const [trackingInfo, setTrackingInfo] = useState<any>(null)
    const [isLoadingTracking, setIsLoadingTracking] = useState(false)

    // Fetch orders
    useEffect(() => {
        fetchOrders()
        fetchAccounts()
    }, [])

    const fetchOrders = async () => {
        const res = await fetch('/api/orders')
        if (res.ok) {
            const data = await res.json()
            setOrders(data)
        }
    }

    const fetchAccounts = async () => {
        const res = await fetch('/api/accounts')
        if (res.ok) {
            const data = await res.json()
            setAccounts(data)
        }
    }

    // Toast auto-hide
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Fetch tracking info when detail modal opens
    const fetchTrackingInfo = async (trackingNumber: string) => {
        setIsLoadingTracking(true)
        try {
            const res = await fetch(`/api/tracking?trackingNumber=${encodeURIComponent(trackingNumber)}`)
            if (res.ok) {
                const data = await res.json()
                setTrackingInfo(data)
            } else {
                setTrackingInfo(null)
            }
        } catch (e) {
            console.error('Failed to fetch tracking info:', e)
            setTrackingInfo(null)
        } finally {
            setIsLoadingTracking(false)
        }
    }

    useEffect(() => {
        if (isDetailOpen && selectedOrder?.trackingNumber) {
            fetchTrackingInfo(selectedOrder.trackingNumber)
        } else {
            setTrackingInfo(null)
        }
    }, [isDetailOpen, selectedOrder])

    // Filtered orders
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true
        const matchesStatus = statusFilter === 'All' || order.status === statusFilter

        if (statusFilter === 'All' && !showCompleted && order.status === 'completed') {
            return false
        }

        return matchesSearch && matchesStatus
    })

    const completedCount = orders.filter(o => o.status === 'completed').length

    // Clear selection on filter change
    useEffect(() => {
        setSelectedOrderIds([])
    }, [searchTerm, statusFilter])

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
            setSelectedOrderIds([])
        } else {
            setSelectedOrderIds(filteredOrders.map(o => o.id))
        }
    }

    const toggleSelectOrder = (id: string) => {
        if (selectedOrderIds.includes(id)) {
            setSelectedOrderIds(prev => prev.filter(oid => oid !== id))
        } else {
            setSelectedOrderIds(prev => [...prev, id])
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Bạn có chắc muốn xóa ${selectedOrderIds.length} đơn hàng đang chọn?`)) return

        try {
            const res = await fetch('/api/orders/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedOrderIds })
            })

            if (res.ok) {
                const data = await res.json()
                setToast({ message: `Đã xóa ${data.count} đơn hàng`, type: 'success' })
                setSelectedOrderIds([])
                fetchOrders()
                fetchAccounts()
            } else {
                setToast({ message: 'Lỗi khi xóa đơn hàng', type: 'error' })
            }
        } catch (e) {
            setToast({ message: 'Lỗi kết nối', type: 'error' })
        }
    }

    const handleBulkStatusChange = async (status: string) => {
        try {
            const res = await fetch('/api/orders/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedOrderIds, status })
            })

            if (res.ok) {
                const data = await res.json()
                setToast({ message: `Đã cập nhật ${data.count} đơn hàng`, type: 'success' })
                setSelectedOrderIds([])
                fetchOrders()
            } else {
                setToast({ message: 'Lỗi khi cập nhật trạng thái', type: 'error' })
            }
        } catch (e) {
            setToast({ message: 'Lỗi kết nối', type: 'error' })
        }
    }

    // Price formatting
    const formatPrice = (value: string) => {
        const numbers = value.replace(/[^0-9,]/g, '')
        const parts = numbers.split(',')
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart
    }

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPrice(e.target.value)
        setPriceDisplay(formatted)
    }

    const parseFormattedPrice = (formatted: string): number => {
        return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0
    }

    // Handlers
    const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const orderData = {
            accountId: formData.get('accountId'),
            orderName: formData.get('orderName'),
            trackingNumber: formData.get('trackingNumber'),
            createdDate: formData.get('createdDate'),
            address: formData.get('address'),
            voucherUsed: formData.get('voucherUsed'),
            productLink: formData.get('productLink'),
            quantity: parseInt(formData.get('quantity') as string) || 1,
            productCategory: formData.get('productCategory'),
            finalPrice: parseFormattedPrice(priceDisplay),
            status: formData.get('status'),
            cancellationReason: formData.get('cancellationReason') || null
        }

        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        })

        if (res.ok) {
            setToast({ message: 'Tạo đơn hàng thành công!', type: 'success' })
            setIsCreateOpen(false)
            fetchOrders()
            fetchAccounts()
            setSelectedAccountId('')
            setOrderStatus('new')
            setPriceDisplay('')
            setFormKey(prev => prev + 1) // Reset form by changing key
        } else {
            setToast({ message: 'Lỗi khi tạo đơn hàng', type: 'error' })
        }
    }

    const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedOrder) return

        const formData = new FormData(e.currentTarget)

        const orderData = {
            accountId: formData.get('accountId'),
            orderName: formData.get('orderName'),
            trackingNumber: formData.get('trackingNumber'),
            createdDate: formData.get('createdDate'),
            address: formData.get('address'),
            voucherUsed: formData.get('voucherUsed'),
            productLink: formData.get('productLink'),
            quantity: parseInt(formData.get('quantity') as string) || 1,
            productCategory: formData.get('productCategory'),
            finalPrice: parseFloat((formData.get('finalPrice') as string).replace(/\./g, '').replace(',', '.')) || 0,
            status: formData.get('status'),
            cancellationReason: formData.get('cancellationReason') || null
        }

        const res = await fetch(`/api/orders/${selectedOrder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        })


        if (res.ok) {
            setToast({ message: 'Cập nhật đơn hàng thành công!', type: 'success' })
            setIsEditMode(false)
            fetchOrders()
            fetchAccounts()
        } else {
            const errorData = await res.json().catch(() => ({}))
            const errorMsg = `Lỗi ${res.status}: ${errorData.error || 'Không xác định'} | Details: ${JSON.stringify(errorData.details || {})}`
            console.error('Update error:', errorMsg, 'Payload:', orderData)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    const handleDelete = async () => {
        if (!selectedOrder || !confirm('Bạn có chắc muốn xóa đơn hàng này?')) return

        const res = await fetch(`/api/orders/${selectedOrder.id}`, {
            method: 'DELETE'
        })

        if (res.ok) {
            setToast({ message: 'Đã xóa đơn hàng', type: 'success' })
            setIsDetailOpen(false)
            setSelectedOrder(null)
            fetchOrders()
            fetchAccounts()
        } else {
            setToast({ message: 'Lỗi khi xóa đơn hàng', type: 'error' })
        }
    }

    const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const order = orders.find(o => o.id === orderId)
            if (!order) return

            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: order.accountId,
                    orderName: order.orderName,
                    trackingNumber: order.trackingNumber,
                    createdDate: order.createdDate,
                    address: order.address,
                    voucherUsed: order.voucherUsed,
                    productLink: order.productLink,
                    quantity: order.quantity,
                    productCategory: order.productCategory,
                    finalPrice: order.finalPrice,
                    status: newStatus,
                    cancellationReason: order.cancellationReason
                })
            })

            if (res.ok) {
                setToast({ message: 'Đã cập nhật trạng thái', type: 'success' })
                fetchOrders()
                setStatusChangeModal(null)
            } else {
                setToast({ message: 'Lỗi khi cập nhật trạng thái', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Lỗi khi cập nhật trạng thái', type: 'error' })
        }
    }

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

    return (
        <div style={{ padding: '2rem' }}>
            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '2rem',
                    right: '2rem',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 100000
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="orders-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>📦 Quản lý Đơn hàng</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            background: showCompleted ? '#e5e7eb' : 'white',
                            color: showCompleted ? '#374151' : '#6b7280',
                            border: '1px solid #d1d5db',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {showCompleted ? 'Ẩn đơn ĐHT' : `Hiện đơn ĐHT [${completedCount}]`}
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="add-button"
                        style={{
                            background: '#ee4d2d',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        + Tạo Đơn Hàng
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="filters-wrapper" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm tên đơn hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="filter-search"
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem'
                    }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                    style={{
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        minWidth: '180px'
                    }}
                >
                    <option value="All">Tất cả trạng thái</option>
                    {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Orders Table (Desktop) */}
            <div className="desktop-table" style={{ overflowX: 'auto' }}>
                <table className="glass-card" style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ ...thStyle, width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                                    onChange={toggleSelectAll}
                                    disabled={filteredOrders.length === 0}
                                />
                            </th>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Tên đơn hàng</th>
                            <th style={thStyle}>Mã vận đơn</th>
                            <th style={thStyle}>Địa chỉ</th>
                            <th style={thStyle}>Tài khoản</th>
                            <th style={thStyle}>Ngày tạo</th>
                            <th style={thStyle}>Giá</th>
                            <th style={thStyle}>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody style={{ overflow: 'visible' }}>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    Không có đơn hàng nào
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onClick={() => {
                                        setSelectedOrder(order)
                                        setIsDetailOpen(true)
                                        setIsEditMode(false)
                                        setSelectedAccountId(order.accountId)
                                        setOrderStatus(order.status)
                                    }}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.includes(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                        />
                                    </td>
                                    <td style={tdStyle}>{index + 1}</td>
                                    <td style={tdStyle}>
                                        <TooltipCell text={order.orderName} />
                                    </td>
                                    <td style={tdStyle}>
                                        <TooltipCell
                                            text={order.trackingNumber}
                                            onCopy={() => {
                                                if (order.trackingNumber) {
                                                    navigator.clipboard.writeText(order.trackingNumber)
                                                    setToast({ message: 'Đã copy mã', type: 'success' })
                                                }
                                            }}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <TooltipCell text={order.address} />
                                    </td>
                                    <td style={tdStyle}>{order.account?.name || order.account?.username || '-'}</td>
                                    <td style={tdStyle}>{new Date(order.createdDate).toLocaleDateString('vi-VN')}</td>
                                    <td style={tdStyle}>{order.finalPrice?.toLocaleString('vi-VN')}đ</td>
                                    <td style={tdStyle}>
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setStatusChangeModal({ orderId: order.id, currentStatus: order.status })
                                            }}
                                            style={{ cursor: 'pointer', display: 'inline-block' }}
                                        >
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '1rem' }}>
                {filteredOrders.length === 0 ? (
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                        Không có đơn hàng nào
                    </div>
                ) : (
                    filteredOrders.map((order, index) => (
                        <div
                            key={order.id}
                            className="glass-card"
                            onClick={() => {
                                setSelectedOrder(order)
                                setIsDetailOpen(true)
                                setIsEditMode(false)
                                setSelectedAccountId(order.accountId)
                                setOrderStatus(order.status)
                            }}
                            style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                background: 'white',
                                borderRadius: '12px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#6b7280' }}>#{index + 1}</span>
                                <StatusBadge status={order.status} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111827' }}>
                                {order.orderName}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#6b7280' }}>Tài khoản:</span>
                                    <span style={{ fontWeight: '600' }}>{order.account?.name || order.account?.username || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#6b7280' }}>Ngày tạo:</span>
                                    <span style={{ fontWeight: '600' }}>{new Date(order.createdDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#6b7280' }}>Giá:</span>
                                    <span style={{ fontWeight: '700', color: '#ee4d2d' }}>{order.finalPrice?.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Responsive Styles */}
            <style jsx>{responsiveStyles}</style>

            {/* CREATE MODAL */}
            {isCreateOpen && (
                <div className="modal-overlay" style={modalOverlayStyle}>
                    <div className="glass-card modal-content" style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Tạo Đơn Hàng Mới</h2>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                            >
                                ✕
                            </button>
                        </div>
                        <form key={formKey} onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Account Selection */}
                            <div>
                                <label style={labelStyle}>Chọn tài khoản *</label>
                                <select
                                    name="accountId"
                                    required
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">-- Chọn tài khoản --</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name || acc.username} - {acc.username} ({acc.carrier || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                                {selectedAccount && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', fontSize: '0.9rem' }}>
                                        <div><strong>Username:</strong> {selectedAccount.username}</div>
                                        <div><strong>Password:</strong> {selectedAccount.password || '******'}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Tên đơn hàng *</label>
                                    <input name="orderName" required style={inputStyle} placeholder="VD: Đơn hàng #001" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Mã vận đơn</label>
                                    <input name="trackingNumber" style={inputStyle} placeholder="VD: SPX123456" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Ngày tạo</label>
                                    <input name="createdDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Địa chỉ</label>
                                    <input name="address" style={inputStyle} placeholder="Nhập địa chỉ giao hàng..." />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Voucher đã dùng</label>
                                    <VoucherInput name="voucherUsed" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Loại mặt hàng</label>
                                    <input name="productCategory" style={inputStyle} placeholder="VD: Điện tử" />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Link sản phẩm</label>
                                <input name="productLink" type="url" style={inputStyle} placeholder="https://..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Số lượng</label>
                                    <input name="quantity" type="number" defaultValue={1} min={1} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Giá cuối cùng</label>
                                    <input
                                        type="text"
                                        value={priceDisplay}
                                        onChange={handlePriceChange}
                                        style={inputStyle}
                                        placeholder="VD: 3.000 hoặc 3.323,5"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Trạng thái</label>
                                <select name="status" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} style={inputStyle}>
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {orderStatus === 'cancelled' && (
                                <div>
                                    <label style={labelStyle}>Lý do hủy *</label>
                                    <textarea name="cancellationReason" required rows={3} style={inputStyle} placeholder="Nhập lý do hủy đơn hàng..." />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" style={btnPrimary}>Tạo đơn hàng</button>
                                <button type="button" onClick={() => setIsCreateOpen(false)} style={btnSecondary}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL/EDIT MODAL */}
            {isDetailOpen && selectedOrder && (
                <div className="modal-overlay" style={modalOverlayStyle}>
                    <div className="glass-card modal-content" style={{ ...modalContentStyle, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh', width: '90%', maxWidth: '800px' }}>

                        {/* HEADER - Fixed */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', zIndex: 10 }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, color: '#111827' }}>
                                {isEditMode ? 'Chỉnh sửa Đơn hàng' : 'Thông tin Đơn hàng'}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {!isEditMode ? (
                                    <>
                                        <button onClick={() => setIsEditMode(true)} style={{ ...btnSecondary, color: '#2563eb', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>✏️ Sửa</button>
                                        <button onClick={handleDelete} style={{ ...btnSecondary, color: '#dc2626', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>🗑️ Xóa</button>
                                    </>
                                ) : null}
                                <button
                                    onClick={() => { setIsDetailOpen(false); setIsEditMode(false) }}
                                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', padding: '0.25rem', lineHeight: 1 }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* BODY - Scrollable */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#fff' }}>
                            <form id="detail-form" onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Account Selection */}
                                <div>
                                    <label style={labelStyle}>Tài khoản</label>
                                    {isEditMode ? (
                                        <>
                                            <select
                                                name="accountId"
                                                required
                                                value={selectedAccountId}
                                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                                style={inputStyle}
                                            >
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.name || acc.username} - {acc.username} ({acc.carrier || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>
                                            {selectedAccount && (
                                                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', fontSize: '0.9rem' }}>
                                                    <div><strong>Username:</strong> {selectedAccount.username}</div>
                                                    <div><strong>Password:</strong> {selectedAccount.password || '******'}</div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ fontWeight: 500 }}>{selectedOrder.account?.name || selectedOrder.account?.username}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                                ID: {selectedOrder.account?.username} | Pass: {selectedOrder.account?.password || '******'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Tên đơn hàng</label>
                                        <input
                                            name="orderName"
                                            defaultValue={selectedOrder.orderName}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : { ...disabledInputStyle, cursor: 'copy' }}
                                            onClick={(e) => {
                                                if (!isEditMode) {
                                                    navigator.clipboard.writeText(selectedOrder.orderName)
                                                    setToast({ message: 'Đã copy tên đơn hàng', type: 'success' })
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Mã vận đơn</label>
                                        <input
                                            name="trackingNumber"
                                            defaultValue={selectedOrder.trackingNumber || ''}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : { ...disabledInputStyle, cursor: 'copy' }}
                                            onClick={(e) => {
                                                if (!isEditMode && selectedOrder.trackingNumber) {
                                                    navigator.clipboard.writeText(selectedOrder.trackingNumber)
                                                    setToast({ message: 'Đã copy mã vận đơn', type: 'success' })
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Ngày tạo</label>
                                        <input
                                            name="createdDate"
                                            type="date"
                                            defaultValue={selectedOrder.createdDate?.split('T')[0] || ''}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : { ...disabledInputStyle, cursor: 'copy' }}
                                            onClick={(e) => {
                                                if (!isEditMode) {
                                                    navigator.clipboard.writeText(selectedOrder.createdDate?.split('T')[0] || '')
                                                    setToast({ message: 'Đã copy ngày tạo', type: 'success' })
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Địa chỉ</label>
                                        <input
                                            name="address"
                                            defaultValue={selectedOrder.address || ''}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : { ...disabledInputStyle, cursor: 'copy' }}
                                            onClick={(e) => {
                                                if (!isEditMode && selectedOrder.address) {
                                                    navigator.clipboard.writeText(selectedOrder.address)
                                                    setToast({ message: 'Đã copy địa chỉ', type: 'success' })
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Voucher đã dùng</label>
                                        {isEditMode ? (
                                            <VoucherInput name="voucherUsed" defaultValue={selectedOrder.voucherUsed || ''} style={inputStyle} />
                                        ) : (
                                            <input
                                                name="voucherUsed"
                                                defaultValue={selectedOrder.voucherUsed || ''}
                                                disabled
                                                style={{ ...disabledInputStyle, cursor: 'copy' }}
                                                onClick={(e) => {
                                                    if (selectedOrder.voucherUsed) {
                                                        navigator.clipboard.writeText(selectedOrder.voucherUsed)
                                                        setToast({ message: 'Đã copy voucher', type: 'success' })
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Loại mặt hàng</label>
                                        <input
                                            name="productCategory"
                                            defaultValue={selectedOrder.productCategory || ''}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : { ...disabledInputStyle, cursor: 'copy' }}
                                            onClick={(e) => {
                                                if (!isEditMode && selectedOrder.productCategory) {
                                                    navigator.clipboard.writeText(selectedOrder.productCategory)
                                                    setToast({ message: 'Đã copy loại mặt hàng', type: 'success' })
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Link sản phẩm</label>
                                    <input name="productLink" defaultValue={selectedOrder.productLink || ''} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>Số lượng</label>
                                        <input name="quantity" type="number" defaultValue={selectedOrder.quantity} min={1} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Giá cuối cùng</label>
                                        <input
                                            name="finalPrice"
                                            type="text"
                                            defaultValue={selectedOrder.finalPrice?.toLocaleString('vi-VN') || ''}
                                            disabled={!isEditMode}
                                            style={isEditMode ? inputStyle : disabledInputStyle}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Trạng thái</label>
                                    <select name="status" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle}>
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {orderStatus === 'cancelled' && (
                                    <div>
                                        <label style={labelStyle}>Lý do hủy</label>
                                        <textarea name="cancellationReason" defaultValue={selectedOrder.cancellationReason || ''} disabled={!isEditMode} rows={3} style={isEditMode ? inputStyle : disabledInputStyle} />
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* FOOTER - Fixed */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            {isEditMode ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditMode(false)
                                        }}
                                        style={btnSecondary}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        form="detail-form"
                                        style={{ ...btnPrimary, flex: 'none', minWidth: '140px' }}
                                    >
                                        Lưu thay đổi
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsDetailOpen(false)}
                                        style={{
                                            ...btnSecondary,
                                            background: 'white',
                                            border: '1px solid #d1d5db'
                                        }}
                                    >
                                        Đóng
                                    </button>

                                    {selectedOrder.trackingNumber && (
                                        <a
                                            href={`https://spx.vn/track?${selectedOrder.trackingNumber}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                background: '#ea580c',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                transition: 'background 0.2s',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#c2410c'}
                                            onMouseOut={(e) => e.currentTarget.style.background = '#ea580c'}
                                        >
                                            <span>Xem vận đơn SPX</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {statusChangeModal && (
                <div style={modalOverlayStyle} onClick={() => setStatusChangeModal(null)}>
                    <div style={{ ...modalContentStyle, maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            Chọn trạng thái
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {STATUS_OPTIONS.map(status => (
                                <div
                                    key={status.value}
                                    onClick={() => handleQuickStatusChange(statusChangeModal.orderId, status.value)}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: statusChangeModal.currentStatus === status.value ? '2px solid #ee4d2d' : '1px solid #e5e7eb',
                                        background: statusChangeModal.currentStatus === status.value ? '#fff5f5' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: statusChangeModal.currentStatus === status.value ? '600' : 'normal',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = statusChangeModal.currentStatus === status.value ? '#fff5f5' : 'white'}
                                >
                                    {status.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedOrderIds.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'white',
                    padding: '1rem 2rem',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'center',
                    zIndex: 9999,
                    border: '1px solid #e5e7eb',
                    maxWidth: '90%'
                }}>
                    <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        Đã chọn <span style={{ color: '#ee4d2d' }}>{selectedOrderIds.length}</span> đơn
                    </div>

                    <div style={{ height: '24px', width: '1px', background: '#e5e7eb' }}></div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Status Buttons */}
                        <button onClick={() => handleBulkStatusChange('picking')} style={{ ...btnSecondary, fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Lấy hàng</button>
                        <button onClick={() => handleBulkStatusChange('shipping')} style={{ ...btnSecondary, fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Vận chuyển</button>
                        <button onClick={() => handleBulkStatusChange('completed')} style={{ ...btnSecondary, background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Hoàn thành</button>

                        <div style={{ width: '12px' }}></div>

                        <button onClick={handleBulkDelete} style={{ ...btnSecondary, background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                            🗑️ Xóa ({selectedOrderIds.length})
                        </button>

                        <button onClick={() => setSelectedOrderIds([])} style={{ ...btnSecondary, border: 'none', color: '#6b7280', fontSize: '0.85rem' }}>Hủy chọn</button>
                    </div>
                </div>
            )}

        </div>
    )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { color: string, bg: string, label: string }> = {
        new: { color: '#1e40af', bg: '#dbeafe', label: 'Mới tạo đơn' },
        waiting: { color: '#ea580c', bg: '#ffedd5', label: 'Chờ lấy hàng' },
        picking: { color: '#7c2d12', bg: '#fed7aa', label: 'Đang lấy hàng' },
        shipping: { color: '#6d28d9', bg: '#e9d5ff', label: 'Đang vận chuyển' },
        completed: { color: '#166534', bg: '#dcfce7', label: 'Đã hoàn thành' },
        cancelled: { color: '#991b1b', bg: '#fee2e2', label: 'Đã hủy' }
    }

    const config = statusConfig[status] || statusConfig.new

    return (
        <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: config.bg,
            color: config.color,
            pointerEvents: 'none'
        }}>
            {config.label}
        </span>
    )
}

// Styles
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 99999,
    backdropFilter: 'blur(4px)'
}

const modalContentStyle: React.CSSProperties = {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem' }
const disabledInputStyle: React.CSSProperties = { ...inputStyle, background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }

const btnPrimary: React.CSSProperties = {
    background: '#ee4d2d', color: 'white', padding: '0.75rem 1.5rem',
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', flex: 1
}

const btnSecondary: React.CSSProperties = {
    background: '#f3f4f6', color: '#374151', padding: '0.75rem 1.5rem',
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer'
}

const thStyle: React.CSSProperties = { padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }
const tdStyle: React.CSSProperties = { padding: '1rem', color: '#6b7280' }

const responsiveStyles = `
    @media (max-width: 768px) {
        .orders-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        .filters-wrapper {
            flex-direction: column !important;
        }

        .filter-search, .filter-select {
            width: 100% !important;
        }

        .add-button {
            width: 100% !important;
        }

        .desktop-table {
            display: none !important;
        }

        .mobile-cards {
            display: flex !important;
        }

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

    @media (min-width: 769px) {
        .mobile-cards {
            display: none !important;
        }
    }

    .modal-overlay {
        z-index: 99999 !important;
    }
`
