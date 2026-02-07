'use client'

import { useState, useEffect } from 'react'

type NoteCategory = {
    id: string
    name: string
    createdAt: string
    updatedAt: string
}

type Note = {
    id: string
    productName: string
    quantity: number
    productCategory: string | null
    categoryId: string | null
    category: NoteCategory | null
    originalPrice: number | null
    productLink: string | null
    createdAt: string
    updatedAt: string
}

export default function NotesClient() {
    const [notes, setNotes] = useState<Note[]>([])
    const [categories, setCategories] = useState<NoteCategory[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false)
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
    const [editingCategoryName, setEditingCategoryName] = useState('')

    // Fetch notes
    useEffect(() => {
        fetchNotes()
        fetchCategories()
    }, [])

    const fetchNotes = async () => {
        const res = await fetch('/api/notes')
        if (res.ok) {
            const data = await res.json()
            setNotes(data)
        }
    }

    const fetchCategories = async () => {
        const res = await fetch('/api/notes/categories')
        if (res.ok) {
            const data = await res.json()
            setCategories(data)
        }
    }

    // Toast auto-hide
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    // Filter notes by search
    const filteredNotes = notes.filter(note =>
        note.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group notes by category
    const groupedNotes = filteredNotes.reduce((acc, note) => {
        const key = note.categoryId || 'uncategorized'
        if (!acc[key]) acc[key] = []
        acc[key].push(note)
        return acc
    }, {} as Record<string, Note[]>)

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories)
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId)
        } else {
            newExpanded.add(categoryId)
        }
        setExpandedCategories(newExpanded)
    }

    const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const priceString = formData.get('originalPrice') as string
        const priceValue = priceString ? priceString.replace(/\./g, '') : ''

        const data = {
            productName: formData.get('productName') as string,
            quantity: parseInt(formData.get('quantity') as string) || 1,
            productCategory: formData.get('productCategory') as string,
            categoryId: formData.get('categoryId') as string || null,
            originalPrice: priceValue,
            productLink: formData.get('productLink') as string
        }

        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        if (res.ok) {
            setToast({ message: 'Đã tạo ghi chú', type: 'success' })
            setIsCreateOpen(false)
            fetchNotes()
        } else {
            setToast({ message: 'Lỗi khi tạo ghi chú', type: 'error' })
        }
    }

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedNote) return

        try {
            const formData = new FormData(e.currentTarget)

            const priceString = formData.get('originalPrice') as string
            const priceValue = priceString ? priceString.replace(/\./g, '') : ''

            const data = {
                productName: formData.get('productName') as string,
                quantity: parseInt(formData.get('quantity') as string),
                productCategory: formData.get('productCategory') as string,
                categoryId: formData.get('categoryId') as string || null,
                originalPrice: priceValue,
                productLink: formData.get('productLink') as string
            }

            console.log('[Frontend] Updating note:', selectedNote.id, data)

            const res = await fetch(`/api/notes/${selectedNote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            console.log('[Frontend] Update response status:', res.status)
            const responseData = await res.json()
            console.log('[Frontend] Update response data:', responseData)

            if (res.ok) {
                setToast({ message: 'Đã cập nhật ghi chú', type: 'success' })
                setIsEditMode(false)
                fetchNotes()
            } else {
                const errorMsg = `${responseData.error || 'Unknown error'} | Chi tiết: ${responseData.details || responseData.message || 'No details'} | Code: ${responseData.code || 'N/A'}`
                console.error('[Frontend] Error updating note:', errorMsg)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error: any) {
            const errorMsg = `Network Error: ${error.message}`
            console.error('[Frontend] Network error:', errorMsg)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    const handleDelete = async () => {
        if (!selectedNote || !confirm('Bạn có chắc muốn xóa ghi chú này?')) return

        try {
            console.log('[Frontend] Deleting note:', selectedNote.id)

            const res = await fetch(`/api/notes/${selectedNote.id}`, {
                method: 'DELETE'
            })

            console.log('[Frontend] Delete response status:', res.status)
            const data = await res.json()
            console.log('[Frontend] Delete response data:', data)

            if (res.ok) {
                setToast({ message: 'Đã xóa ghi chú', type: 'success' })
                setSelectedNote(null)
                fetchNotes()
            } else {
                const errorMsg = `${data.error || 'Unknown error'} | Chi tiết: ${data.details || data.message || 'No details'} | Code: ${data.code || 'N/A'}`
                console.error('[Frontend] Error deleting note:', errorMsg)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error: any) {
            const errorMsg = `Network Error: ${error.message}`
            console.error('[Frontend] Network error:', errorMsg)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    const handleCreateCategory = async () => {
        const name = prompt('Nhập tên danh mục:')
        if (!name) return

        console.log('[Frontend] Creating category with name:', name)

        try {
            const res = await fetch('/api/notes/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })

            console.log('[Frontend] Response status:', res.status)
            const data = await res.json()
            console.log('[Frontend] Response data:', data)

            if (res.ok) {
                setToast({ message: 'Đã tạo danh mục', type: 'success' })
                fetchCategories()
            } else {
                const errorMsg = `${data.error || 'Unknown error'} | Chi tiết: ${data.details || 'No details'} | Code: ${data.code || 'N/A'}`
                console.error('[Frontend] Error creating category:', errorMsg)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error: any) {
            const errorMsg = `Network Error: ${error.message}`
            console.error('[Frontend] Network error:', errorMsg)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    const handleRenameCategory = async (categoryId: string, newName: string) => {
        if (!newName.trim()) return

        try {
            const res = await fetch(`/api/notes/categories/${categoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            })

            const data = await res.json()

            if (res.ok) {
                setToast({ message: 'Đã đổi tên danh mục', type: 'success' })
                fetchCategories()
                fetchNotes()
                setEditingCategoryId(null)
            } else {
                const errorMsg = `${data.error || 'Unknown error'} | Chi tiết: ${data.details || 'No details'} | Code: ${data.code || 'N/A'}`
                console.error('[Frontend] Error renaming:', errorMsg)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error: any) {
            const errorMsg = `Network Error: ${error.message}`
            console.error('[Frontend] Network error:', errorMsg)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('Xóa danh mục này? Các ghi chú trong danh mục sẽ chuyển về "Chưa phân loại".')) return

        console.log('[Frontend] Deleting category with ID:', categoryId)

        try {
            const res = await fetch(`/api/notes/categories/${categoryId}`, {
                method: 'DELETE'
            })

            console.log('[Frontend] Delete response status:', res.status)
            const data = await res.json()
            console.log('[Frontend] Delete response data:', data)

            if (res.ok) {
                setToast({ message: 'Đã xóa danh mục', type: 'success' })
                fetchCategories()
                fetchNotes()
            } else {
                const errorMsg = `${data.error || 'Unknown error'} | Chi tiết: ${data.details || 'No details'} | Code: ${data.code || 'N/A'}`
                console.error('[Frontend] Error deleting category:', errorMsg)
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error: any) {
            const errorMsg = `Network Error: ${error.message}`
            console.error('[Frontend] Network error:', errorMsg)
            setToast({ message: errorMsg, type: 'error' })
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '2rem',
                    right: '2rem',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 100000
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>📝 Ghi chú</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setIsCategoryManageOpen(true)}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        📂 Quản lý Danh mục
                    </button>
                    <button
                        onClick={handleCreateCategory}
                        style={{
                            background: '#6b7280',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        + Tạo Danh mục
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
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
                        + Tạo Ghi chú
                    </button>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm tên sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem'
                    }}
                />
            </div>

            {/* Notes List - Grouped by Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Uncategorized Notes */}
                {groupedNotes['uncategorized'] && (
                    <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                        <div
                            onClick={() => toggleCategory('uncategorized')}
                            style={{
                                padding: '1rem 1.5rem',
                                background: '#f9fafb',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontWeight: '600'
                            }}
                        >
                            <span>📦 Chưa phân loại ({groupedNotes['uncategorized'].length})</span>
                            <span>{expandedCategories.has('uncategorized') ? '▼' : '▶'}</span>
                        </div>
                        {expandedCategories.has('uncategorized') && (
                            <div style={{ padding: '1rem' }}>
                                {groupedNotes['uncategorized'].map(note => (
                                    <NoteCard key={note.id} note={note} onClick={() => { setSelectedNote(note); setIsEditMode(false); }} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Categorized Notes */}
                {categories.map(category => {
                    const categoryNotes = groupedNotes[category.id]
                    if (!categoryNotes || categoryNotes.length === 0) return null

                    return (
                        <div key={category.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            <div
                                onClick={() => toggleCategory(category.id)}
                                style={{
                                    padding: '1rem 1.5rem',
                                    background: '#f9fafb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: '600'
                                }}
                            >
                                <span>📁 {category.name} ({categoryNotes.length})</span>
                                <span>{expandedCategories.has(category.id) ? '▼' : '▶'}</span>
                            </div>
                            {expandedCategories.has(category.id) && (
                                <div style={{ padding: '1rem' }}>
                                    {categoryNotes.map(note => (
                                        <NoteCard key={note.id} note={note} onClick={() => { setSelectedNote(note); setIsEditMode(false); }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div style={modalOverlayStyle} onClick={() => setIsCreateOpen(false)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Tạo Ghi chú mới</h2>
                        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Tên sản phẩm *</label>
                                <input name="productName" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Số lượng</label>
                                <input name="quantity" type="number" defaultValue={1} min={1} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Phân loại</label>
                                <input name="productCategory" style={inputStyle} placeholder="VD: Màu đỏ, Size L..." />
                            </div>
                            <div>
                                <label style={labelStyle}>Danh mục</label>
                                <select name="categoryId" style={inputStyle}>
                                    <option value="">-- Chưa có danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Giá gốc</label>
                                <input
                                    name="originalPrice"
                                    type="text"
                                    style={inputStyle}
                                    placeholder="VD: 1.234.000"
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\D/g, '')
                                        if (value) {
                                            value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                                        }
                                        e.target.value = value
                                    }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Link sản phẩm</label>
                                <input name="productLink" type="url" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" style={btnPrimary}>Tạo</button>
                                <button type="button" onClick={() => setIsCreateOpen(false)} style={btnSecondary}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail/Edit Modal */}
            {selectedNote && (
                <div style={modalOverlayStyle} onClick={() => setSelectedNote(null)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Chi tiết Ghi chú</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!isEditMode && (
                                    <>
                                        <button onClick={() => setIsEditMode(true)} style={{ ...btnSecondary, padding: '0.5rem 1rem' }}>✏️ Sửa</button>
                                        <button onClick={handleDelete} style={{ ...btnSecondary, padding: '0.5rem 1rem', background: '#fee2e2', color: '#991b1b' }}>🗑️ Xóa</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Tên sản phẩm</label>
                                <input name="productName" defaultValue={selectedNote.productName} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Số lượng</label>
                                <input name="quantity" type="number" defaultValue={selectedNote.quantity} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Phân loại</label>
                                <input name="productCategory" defaultValue={selectedNote.productCategory || ''} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Danh mục</label>
                                <select name="categoryId" defaultValue={selectedNote.categoryId || ''} disabled={!isEditMode} style={isEditMode ? inputStyle : disabledInputStyle}>
                                    <option value="">-- Chưa có danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Giá gốc</label>
                                <input
                                    name="originalPrice"
                                    type="text"
                                    defaultValue={selectedNote.originalPrice ? selectedNote.originalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                                    disabled={!isEditMode}
                                    style={isEditMode ? inputStyle : disabledInputStyle}
                                    placeholder="VD: 1.234.000"
                                    onChange={(e) => {
                                        if (isEditMode) {
                                            let value = e.target.value.replace(/\D/g, '')
                                            if (value) {
                                                value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                                            }
                                            e.target.value = value
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Link sản phẩm</label>
                                {isEditMode ? (
                                    <input name="productLink" type="url" defaultValue={selectedNote.productLink || ''} style={inputStyle} />
                                ) : (
                                    selectedNote.productLink ? (
                                        <a href={selectedNote.productLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                                            {selectedNote.productLink}
                                        </a>
                                    ) : (
                                        <span style={{ color: '#9ca3af' }}>Không có link</span>
                                    )
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Ngày tạo</label>
                                <input value={new Date(selectedNote.createdAt).toLocaleString('vi-VN')} disabled style={disabledInputStyle} />
                            </div>
                            {isEditMode && (
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="submit" style={btnPrimary}>Lưu thay đổi</button>
                                    <button type="button" onClick={() => setIsEditMode(false)} style={btnSecondary}>Hủy</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {isCategoryManageOpen && (
                <div style={modalOverlayStyle} onClick={() => setIsCategoryManageOpen(false)}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            📂 Quản lý Danh mục
                        </h2>

                        {categories.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                                Chưa có danh mục nào. Hãy tạo danh mục mới!
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {categories.map(category => (
                                    <div
                                        key={category.id}
                                        style={{
                                            padding: '1rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'white'
                                        }}
                                    >
                                        {editingCategoryId === category.id ? (
                                            <input
                                                type="text"
                                                value={editingCategoryName}
                                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                                style={{
                                                    ...inputStyle,
                                                    flex: 1,
                                                    marginRight: '0.5rem'
                                                }}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleRenameCategory(category.id, editingCategoryName)
                                                    } else if (e.key === 'Escape') {
                                                        setEditingCategoryId(null)
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span style={{ flex: 1, fontWeight: '600', fontSize: '1.05rem' }}>
                                                {category.name}
                                            </span>
                                        )}

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {editingCategoryId === category.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRenameCategory(category.id, editingCategoryName)}
                                                        style={{
                                                            ...btnSecondary,
                                                            padding: '0.5rem 1rem',
                                                            background: '#10b981',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        ✓ Lưu
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingCategoryId(null)}
                                                        style={{
                                                            ...btnSecondary,
                                                            padding: '0.5rem 1rem'
                                                        }}
                                                    >
                                                        ✕ Hủy
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategoryId(category.id)
                                                            setEditingCategoryName(category.name)
                                                        }}
                                                        style={{
                                                            ...btnSecondary,
                                                            padding: '0.5rem 1rem'
                                                        }}
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        style={{
                                                            ...btnSecondary,
                                                            padding: '0.5rem 1rem',
                                                            background: '#fee2e2',
                                                            color: '#991b1b'
                                                        }}
                                                    >
                                                        🗑️ Xóa
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setIsCategoryManageOpen(false)}
                            style={{
                                ...btnSecondary,
                                width: '100%',
                                marginTop: '1.5rem'
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Note Card Component
function NoteCard({ note, onClick }: { note: Note, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{note.productName}</h3>
                    {note.productCategory && (
                        <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                            {note.productCategory} • x{note.quantity}
                        </span>
                    )}
                </div>
                {!note.productCategory && <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>x{note.quantity}</span>}
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                {note.originalPrice && <span>💰 {note.originalPrice.toLocaleString('vi-VN')}đ</span>}
                {note.productLink && <a href={note.productLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6' }}>🔗 Link</a>}
            </div>
        </div>
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
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', flex: 1
}

const btnSecondary: React.CSSProperties = {
    background: '#f3f4f6', color: '#374151', padding: '0.75rem 1.5rem',
    borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer'
}
