export const MOCK_ACCOUNTS = [
    { id: '1', username: 'shopee_pro_1', status: 'active', balance: 5000000, last_active: '2024-02-05' },
    { id: '2', username: 'shop_hcm_q1', status: 'limited', balance: 1200000, last_active: '2024-02-04' },
    { id: '3', username: 'kho_tong_hn', status: 'active', balance: 89000000, last_active: '2024-02-05' },
    { id: '4', username: 'acc_rac_001', status: 'banned', balance: 0, last_active: '2023-12-10' },
    { id: '5', username: 'auto_tool_05', status: 'active', balance: 450000, last_active: '2024-02-01' },
]

export const MOCK_ORDERS = [
    { id: 'ORD-001', customer: 'Nguyen Van A', total: 150000, status: 'pending', date: '2024-02-05' },
    { id: 'ORD-002', customer: 'Tran Thi B', total: 320000, status: 'completed', date: '2024-02-04' },
    { id: 'ORD-003', customer: 'Le Van C', total: 550000, status: 'shipping', date: '2024-02-04' },
]

export const APP_NOTES = [
    { id: '1', title: 'Quy trình xử lý đơn', content: '1. Check tiền\n2. Đóng gói\n3. Giao hang' },
    { id: '2', title: 'Tài khoản cần kháng', content: 'Acc kho_tong_hn sắp bị quét, cần đổi IP' },
]
