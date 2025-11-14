# Admin Pages

This folder contains all admin-only pages for the MediHealth application.

## Structure

```
admin/
├── AdminLogin.tsx          # Admin login page (/admin/login)
├── AdminDashboard.tsx      # Main admin dashboard (/admin/dashboard)
├── UserManagement.tsx      # User management page (/admin/users)
├── SystemSettings.tsx      # System settings page (/admin/settings)
└── Analytics.tsx           # Analytics page (/admin/analytics)
```

## Routes

- `/admin/login` - Admin login page (public, no auth required)
- `/admin/dashboard` - Admin dashboard (protected, requires ADMIN role)
- `/admin/users` - User management (protected, requires ADMIN role)
- `/admin/settings` - System settings (protected, requires ADMIN role)
- `/admin/analytics` - Analytics (protected, requires ADMIN role)

## Security

All admin pages (except login) are protected by the `RequireAdmin` middleware, which:
- Checks if user is authenticated
- Verifies user role is ADMIN
- Redirects non-admin users to regular dashboard

## Implementation Status

All pages are currently placeholders. Implementation pending.

