# Project Overview

This is a React + Vite + TypeScript frontend application for a MikroTik network management and hotspot billing system. It includes admin dashboards, owner dashboards, client portals, and WiFi user management.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 7
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components
- **State/Data**: TanStack React Query, React Hook Form
- **Auth/DB**: Supabase (authentication + PostgreSQL)
- **Routing**: React Router DOM v6

## Project Structure

```
config/          # Main frontend application (Vite + React)
  src/
    pages/       # Route-level page components
    components/  # Reusable UI components
    contexts/    # React context providers (AuthContext)
    hooks/       # Custom hooks
    integrations/supabase/  # Supabase client + types
    lib/         # Utilities
  public/        # Static assets
  build_output/  # Production build output
database/        # SQL migration scripts for Supabase
mikrotik/        # MikroTik-related scripts/configs
supabase/        # Supabase project config
deployment/      # Deployment-related files
```

## Development

- **Workflow**: "Start application" runs `cd config && npm run dev` on port 5000
- **Frontend host**: `0.0.0.0:5000` (allows Replit proxy)
- **All hosts allowed**: `allowedHosts: true` in vite.config.ts

## Deployment

- **Target**: Static site
- **Build command**: `bash -c "cd config && npm run build"`
- **Public directory**: `config/build_output`

## Key Pages

- `/` - Index/landing
- `/login` - Login page
- `/admin-login` - Admin login
- `/owner-login` - Owner login
- `/admin-dashboard` - Admin dashboard
- `/owner-dashboard` - Owner dashboard
- `/client-portal` - Client portal
- `/wifi-login` - WiFi user login
- `/payment` - Payment portal

## Auth Architecture (Critical Notes)

- **Custom session-token auth** — NOT standard Supabase Auth. Uses `system_credentials` + `user_sessions` tables.
- **Owner login**: requires `@gmail.com` email; calls `verify_credentials_secure` RPC
- **Admin login**: uses username (no `@`); calls `verify_admin_simple` RPC
- **Session stored in**: `sessionStorage` as `kingstone_session_token` and `kingstone_user`
- **`user.adminId`**: UUID from `admins` table (used for ALL DB queries)
- **`user.credentialId`**: UUID from `system_credentials` table (different from adminId!)
- **`getAdminIdFromUser(user)`**: helper in `useAdminId.ts` — always use this to get admin ID for queries
- **Owner ID**: fetched via `get_owner_profile_by_session` RPC; cached in `localStorage` as `ownerId`
- **Edge functions**: must use custom session token or anon key as Bearer (no standard Supabase auth session)
- **Key RPCs**: `get_owner_admins`, `get_owner_profile_by_session`, `owner_account_exists`, `register_admin_simple`, `owner_reset_admin_password`, `owner_delete_admin`, `update_credential_password`

## Fixed Bugs

1. `AuthContext.tsx`: admin login stores actual `admin_id` from `admins` table in `user.adminId`
2. `useAdminId.ts`: `getAdminIdFromUser` returns `user.adminId` first
3. `AdminRegister.tsx`: edge function uses session token or anon key instead of null Supabase auth token
4. `AdminDashboard.tsx`: business name fetched from `admins` table; `changePassword` imported and connected
5. `PaymentHistory.tsx`: filters payments by `admin_id` (was showing all payments to all admins)
6. `AdminCharts.tsx`: replaced mock data with real Supabase queries (revenue, clients, packages, mikrotik status)
7. `OwnerCharts.tsx`: replaced mock data with real queries (admin growth, mikrotik growth, revenue, admin status)
8. Removed 5 `_Zeroed` dead backup files from the codebase
9. Removed 239 `console.log` debug calls that were leaking sensitive data to browser console
10. Removed hardcoded demo credentials from Login.tsx
11. Removed hardcoded password ("Kingstone123") from password reset dialog and PasswordChangePrompt UI
12. `database/SECURITY_FIX.sql`: proper RLS policies written — apply in Supabase SQL Editor to lock down tables

## Security (Pending Application)
Run `database/SECURITY_FIX.sql` in Supabase Dashboard > SQL Editor to re-enable RLS and lock down all sensitive tables.
