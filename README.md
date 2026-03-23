# Kingstone WiFi Billing System

A comprehensive WiFi billing and management system for ISP hotspots.

---

## 📁 Project Structure

```
kingstone-wifi-billing/
├── config/                          # Frontend React application
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── admin/               # Admin-specific components
│   │   │   ├── owner/               # Owner-specific components
│   │   │   ├── shared/              # Shared components
│   │   │   └── ui/                  # UI components (shadcn)
│   │   ├── contexts/                # React contexts (Auth, etc.)
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── integrations/            # Supabase client
│   │   ├── lib/                     # Utility functions
│   │   ├── pages/                   # Page components
│   │   │   ├── admin/               # Admin pages
│   │   │   └── ...                  # Other pages
│   │   ├── types/                   # TypeScript types
│   │   └── App.tsx                  # Main app component
│   ├── public/                      # Static assets
│   └── package.json
│
├── database/                        # Database scripts
│   ├── SETUP_DATABASE.sql          # Complete database setup (RUN THIS FIRST)
│   ├── CREATE_WIFI_SETTINGS.sql    # WiFi settings table
│   └── SCHEMA_FIX_SUMMARY.md       # Schema documentation
│
├── deployment/                      # Deployment configurations
├── mikrotik/                        # Mikrotik router templates
│   ├── alogin.html                  # Logout page
│   ├── error.html                   # Error page
│   ├── login.html                   # Login page
│   └── logout.html                  # Logout confirmation
│
├── supabase/                        # Backend functions
│   └── functions/                   # Edge functions
│       ├── activate-voucher/        # Voucher activation
│       ├── mpesa-callback/          # M-Pesa payment callbacks
│       ├── reconnect-voucher/       # Voucher reconnection
│       └── ...                      # Other functions
│
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
└── README.md                        # This file
```

---

## 🚀 Quick Start

### 1. Database Setup

Run the database setup script in Supabase SQL Editor:

```bash
# Copy contents of database/SETUP_DATABASE.sql
# Paste into Supabase Dashboard > SQL Editor
# Run the script
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

### 2. Frontend Setup

```bash
cd config
npm install
npm run dev
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🎯 Features

### For Admins
- **Dashboard** - Overview of users, payments, and packages
- **Packages** - Create and manage internet packages
- **WiFi Users** - Manage hotspot users
- **Broadband Users** - Manage PPPoE/Static users
- **Payments** - View payment history
- **Mikrotik Management** - Configure routers
- **WiFi Settings** - Customize login portal
- **Recycle Bin** - Manage failed payments

### For Owners
- **Admin Management** - Create and manage admin accounts
- **Subscription Management** - Manage admin subscriptions
- **Payment Settings** - Configure M-Pesa settings
- **System Analytics** - View system-wide statistics
- **Audit Logs** - Monitor system activity

### For Users
- **Payment Portal** - Purchase internet packages via M-Pesa
- **Client Portal** - Manage active sessions
- **WiFi Login** - Authenticate at hotspot

---

## 📦 Package Types

| Package | Duration | Price |
|---------|----------|-------|
| 1 Hour | 1 Hour | KES 20 |
| 3 Hours | 3 Hours | KES 50 |
| 6 Hours | 6 Hours | KES 100 |
| 1 Day | 24 Hours | KES 300 |
| 7 Days | 1 Week | KES 1,000 |
| 1 Month | 30 Days | KES 2,000 |
| 6 Months | 180 Days | KES 8,000 |

---

## 🔐 User Authentication Flow

1. **User connects to WiFi** → Redirected to payment portal
2. **User selects package** → Chooses duration/price
3. **User enters phone** → M-Pesa payment prompt
4. **Payment successful** → Account created automatically
5. **Credentials shown** → Username = Phone, Password = Transaction code
6. **User logs in** → Internet access granted

---

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **Authentication:** Custom session-based auth
- **Payments:** M-Pesa Daraja API
- **Router Integration:** Mikrotik API

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `config/src/App.tsx` | Main routing configuration |
| `config/src/pages/AdminDashboard.tsx` | Admin dashboard |
| `config/src/pages/OwnerDashboard.tsx` | Owner dashboard |
| `config/src/pages/PaymentPortal.tsx` | User payment page |
| `database/SETUP_DATABASE.sql` | Database schema |
| `supabase/functions/` | Backend logic |

---

## 🆘 Support

For issues or questions:
1. Check database tables exist (run SETUP_DATABASE.sql)
2. Verify environment variables are correct
3. Check browser console for errors
4. Review Supabase logs for function errors

---

**Version:** 1.0.0  
**Last Updated:** March 2026
