-- Create admin user
INSERT INTO "User" (id, username, password, role, "createdAt", "updatedAt")
VALUES (
    'admin-001',
    'admin',
    'admin123',
    'ADMIN',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;
