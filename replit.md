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
