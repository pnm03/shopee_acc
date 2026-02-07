import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminUsersPage() {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return (
            <div style={{ padding: '2rem', color: 'red' }}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <a href="/dashboard">Return to Dashboard</a>
            </div>
        )
    }

    type Profile = {
        id: string
        full_name: string | null
        role: string | null
        created_at: string
    }

    // Fetch Users
    const { data: users } = await supabase.from('profiles').select('*') as { data: Profile[] | null }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>User Management</h1>
                <button style={{
                    padding: '0.5rem 1rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    + Create New User
                </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                        <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Email / Name</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Created At</th>
                        <th style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users?.map((u: Profile) => (
                        <tr key={u.id}>
                            <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{u.full_name || 'N/A'}</td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    background: u.role === 'admin' ? '#dcfce7' : '#e0e7ff',
                                    color: u.role === 'admin' ? '#166534' : '#3730a3'
                                }}>
                                    {u.role}
                                </span>
                            </td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                <button style={{ marginRight: '0.5rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                                <button style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {(!users || users.length === 0) && (
                        <tr>
                            <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No users found (or profile table empty)</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
