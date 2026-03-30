# 🏗️ System Architecture

**Kingstone WiFi Billing System - Technical Architecture**

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Smartphones │  │    Laptops   │  │   Tablets    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│                    ┌───────▼────────┐                           │
│                    │  Mikrotik      │                           │
│                    │  Router        │                           │
│                    │  (Hotspot)     │                           │
│                    └───────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Internet       │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│  Admin Users   │  │  WiFi Users    │  │  M-Pesa API    │
│  (Dashboard)   │  │  (Portal)      │  │  (Payments)    │
└───────┬────────┘  └───────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Supabase       │
                    │   ┌──────────┐   │
                    │   │ Postgres │   │
                    │   │ Database │   │
                    │   └──────────┘   │
                    │   ┌──────────┐   │
                    │   │   Edge   │   │
                    │   │ Functions│   │
                    │   └──────────┘   │
                    └──────────────────┘
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE TABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐     │
│  │   admins     │  │system_credentials│  │user_sessions │     │
│  ├──────────────┤  ├──────────────────┤  ├──────────────┤     │
│  │ id (UUID)    │  │ id (UUID)        │  │ id (UUID)    │     │
│  │ username     │  │ username         │  │ session_token│     │
│  │ email        │  │ password_hash    │  │ user_id      │     │
│  │ phone        │  │ role             │  │ role         │     │
│  │ business_name│  │ admin_id (FK)    │  │ expires_at   │     │
│  │ is_trial     │  │ is_active        │  │ is_active    │     │
│  └──────┬───────┘  └────────┬─────────┘  └──────────────┘     │
│         │                    │                                  │
│         │ 1:1                │ 1:N                              │
│         │                    │                                  │
│  ┌──────▼────────┐  ┌───────▼────────┐                         │
│  │   mikrotiks   │  │   payments     │                         │
│  ├───────────────┤  ├────────────────┤                         │
│  │ id (UUID)     │  │ id (UUID)      │                         │
│  │ admin_id (FK) │  │ admin_id (FK)  │                         │
│  │ router_id     │  │ user_phone     │                         │
│  │ ip_address    │  │ amount         │                         │
│  │ api_port      │  │ status         │                         │
│  │ mpesa_type    │  │ mpesa_receipt  │                         │
│  │ mpesa_number  │  │ package_name   │                         │
│  └───────┬───────┘  └────────────────┘                         │
│          │                                                      │
│          │ 1:N                                                  │
│          │                                                      │
│  ┌───────▼────────┐  ┌────────────────┐                         │
│  │   packages     │  │  wifi_users    │                         │
│  ├───────────────┤  ├────────────────┤                         │
│  │ id (UUID)     │  │ id (UUID)      │                         │
│  │ admin_id (FK) │  │ admin_id (FK)  │                         │
│  │ name          │  │ username       │                         │
│  │ type          │  │ password       │                         │
│  │ duration      │  │ package_id (FK)│                         │
│  │ price         │  │ expires_at     │                         │
│  └───────────────┘  └────────────────┘                         │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │  sms_settings  │  │  sms_logs      │                         │
│  ├────────────────┤  ├────────────────┤                         │
│  │ admin_id (FK)  │  │ admin_id (FK)  │                         │
│  │ provider       │  │ recipient      │                         │
│  │ api_key        │  │ message        │                         │
│  │ enabled        │  │ status         │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN LOGIN FLOW                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Admin   │─────▶│ Frontend │─────▶│ Supabase │─────▶│ Database │
  │  (User)  │      │  (React) │      │  (Auth)  │      │ (Postgres)│
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                 │                 │                 │
       │ 1. Enter        │                 │                 │
       │    credentials  │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 2. Query        │                 │
       │                 │    system_      │                 │
       │                 │    credentials  │                 │
       │                 │────────────────▶│                 │
       │                 │                 │ 3. Verify       │
       │                 │                 │    password     │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │                 │                 │ 4. Hash match   │
       │                 │                 │◀────────────────│
       │                 │                 │                 │
       │                 │ 5. Create       │                 │
       │                 │    session      │                 │
       │                 │◀────────────────│                 │
       │                 │                 │                 │
       │                 │ 6. Store token  │                 │
       │                 │    in session   │                 │
       │◀────────────────│                 │                 │
       │                 │                 │                 │
       │ 7. Redirect to  │                 │                 │
       │    dashboard    │                 │                 │
       │◀────────────────│                 │                 │
       │                 │                 │                 │


┌─────────────────────────────────────────────────────────────────┐
│                  SESSION VALIDATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Browser │      │ Frontend │      │ Supabase │      │ Database │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                 │                 │                 │
       │ 1. Request      │                 │                 │
       │    protected    │                 │                 │
       │    resource     │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 2. Get session  │                 │
       │                 │    token from   │                 │
       │                 │    sessionStorage                │
       │                 │────────────────▶│                 │
       │                 │                 │                 │
       │                 │ 3. RPC:         │                 │
       │                 │    validate_    │                 │
       │                 │    session      │                 │
       │                 │────────────────▶│                 │
       │                 │                 │ 4. Check token  │
       │                 │                 │    validity     │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │                 │                 │ 5. Return       │
       │                 │                 │    admin_id     │
       │                 │                 │◀────────────────│
       │                 │◀────────────────│                 │
       │                 │                 │                 │
       │ 6. Grant access │                 │                 │
       │◀────────────────│                 │                 │
```

---

## 💰 Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    M-PESA PAYMENT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │   User   │      │ Frontend │      │  Edge    │      │  M-Pesa  │
  │          │      │ (Portal) │      │ Function │      │  Daraja  │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                 │                 │                 │
       │ 1. Select       │                 │                 │
       │    package      │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 2. Enter phone  │                 │
       │                 │    number       │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 3. POST:        │                 │
       │                 │    mpesa-stk-   │                 │
       │                 │    push         │                 │
       │                 │────────────────▶│                 │
       │                 │                 │                 │
       │                 │                 │ 4. POST: STK    │
       │                 │                 │    Push Request │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │ 5. Enter PIN    │                 │                 │
       │◀─────────────────────────────────────────────────────│
       │                 │                 │                 │
       │ 6. Payment      │                 │                 │
       │    processed    │                 │                 │
       │─────────────────────────────────────────────────────▶│
       │                 │                 │                 │
       │                 │                 │ 7. Callback:    │
       │                 │                 │    Result       │
       │                 │                 │◀────────────────│
       │                 │                 │                 │
       │                 │                 │ 8. Update       │
       │                 │                 │    payment      │
       │                 │                 │    status       │
       │                 │                 │                 │
       │ 9. Show         │                 │                 │
       │    credentials  │                 │                 │
       │◀────────────────│                 │                 │
       │                 │                 │                 │


┌─────────────────────────────────────────────────────────────────┐
│                  PAYMENT CALLBACK FLOW                          │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  M-Pesa  │      │  Edge    │      │ Supabase │      │ Database │
  │  Daraja  │      │ Function │      │   Client │      │          │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                 │                 │                 │
       │ 1. POST:        │                 │                 │
       │    Callback     │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 2. Parse        │                 │
       │                 │    ResultCode   │                 │
       │                 │                 │                 │
       │                 │ 3. Find payment │                 │
       │                 │    by           │                 │
       │                 │    CheckoutReqID│                 │
       │                 │────────────────▶│                 │
       │                 │                 │ 4. Query        │
       │                 │                 │    payments     │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │                 │                 │ 5. Return       │
       │                 │                 │    payment      │
       │                 │                 │◀────────────────│
       │                 │◀────────────────│                 │
       │                 │                 │                 │
       │                 │ 6. If success:  │                 │
       │                 │    Update       │                 │
       │                 │    status       │                 │
       │                 │────────────────▶│                 │
       │                 │                 │ 7. UPDATE       │
       │                 │                 │    payments     │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │                 │ 8. Log          │                 │
       │                 │    success      │                 │
       │                 │                 │                 │
       │ 9. ACK:         │                 │                 │
       │    OK           │                 │                 │
       │◀────────────────│                 │                 │
```

---

## 📶 Mikrotik Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  MIKROTIK USER CREATION                         │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  User    │      │ Frontend │      │ Supabase │      │ Mikrotik │
  │  Device  │      │ (Portal) │      │ Database │      │  Router  │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                 │                 │                 │
       │ 1. Connect to   │                 │                 │
       │    WiFi         │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │ 2. Redirect to  │                 │                 │
       │    payment      │                 │                 │
       │    portal       │                 │                 │
       │◀────────────────│                 │                 │
       │                 │                 │                 │
       │ 3. Complete     │                 │                 │
       │    payment      │                 │                 │
       │────────────────▶│                 │                 │
       │                 │                 │                 │
       │                 │ 4. Create user  │                 │
       │                 │    in database  │                 │
       │                 │────────────────▶│                 │
       │                 │                 │                 │
       │                 │ 5. POST: Create │                 │
       │                 │    hotspot user │                 │
       │                 │────────────────▶│                 │
       │                 │                 │ 6. REST API:    │
       │                 │                 │    /rest/ip/    │
       │                 │                 │    hotspot/user │
       │                 │                 │────────────────▶│
       │                 │                 │                 │
       │                 │                 │ 7. User created │
       │                 │                 │◀────────────────│
       │                 │◀────────────────│                 │
       │                 │                 │                 │
       │ 8. Show         │                 │                 │
       │    credentials  │                 │                 │
       │◀────────────────│                 │                 │
       │                 │                 │                 │
       │ 9. Login with   │                 │                 │
       │    credentials  │                 │                 │
       │─────────────────────────────────────────────────────▶│
       │                 │                 │                 │
       │10. Grant        │                 │                 │
       │    internet     │                 │                 │
       │◀─────────────────────────────────────────────────────│
```

---

## 🏢 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                   App.tsx (Router)                    │   │
│  └────────────────────────────────────────────────────────┘   │
│           │                    │                    │          │
│           │                    │                    │          │
│  ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐ │
│  │  Admin Routes   │  │  Public Routes │  │  User Routes   │ │
│  └────────┬────────┘  └───────┬────────┘  └───────┬────────┘ │
│           │                    │                    │          │
│  ┌────────▼─────────────────────┴────────────────────▼────────┐│
│  │  Pages:                                                    ││
│  │  • AdminDashboard    • PaymentPortal    • ClientLogin     ││
│  │  • AdminMikrotikMgr  • Index (Landing)  • AdminRegister   ││
│  │  • AdminPackages     • MikrotikList     • ...            ││
│  └────────────────────────────────────────────────────────────┘│
│           │                    │                               │
│  ┌────────▼─────────────────────┴──────────────────────────┐  │
│  │  Components:                                            │  │
│  │  • AdminSidebar    • PackageCards    • PaymentForm      │  │
│  │  • GraphDashboard  • MikrotikStatus  • UserTable        │  │
│  │  • ...                                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Hooks:                                                  │  │
│  │  • useAuth           • useDashboardVisibility            │  │
│  │  • useAdminId        • usePackages                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Lib Utilities:                                          │  │
│  │  • validators.ts     • mpesa.ts       • ovpnGenerator.ts │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼─────────────────────────────────────────────────┐  │
│  │  Supabase Client (/@/integrations/supabase/client)       │  │
│  │  • Custom fetch with session token header                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network Security                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • HTTPS/TLS encryption                                  │   │
│  │  • CORS policy (domain restrictions)                     │   │
│  │  • Firewall rules (Mikrotik)                            │   │
│  │  • Walled garden (payment portal access)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 2: Authentication                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Session token validation (RPC: validate_session)     │   │
│  │  • Password hashing (bcrypt, cost=10)                   │   │
│  │  • Session expiration (24 hours)                        │   │
│  │  • Secure session storage (sessionStorage)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 3: Authorization (RLS)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Row Level Security policies on all tables            │   │
│  │  • admin_id isolation (users see only their data)       │   │
│  │  • Function security (SECURITY DEFINER)                 │   │
│  │  • Session-based admin identification                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 4: Data Protection                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Password hashing (never stored plain text)           │   │
│  │  • API keys in environment variables                    │   │
│  │  • Encrypted connections (Supabase SSL)                 │   │
│  │  • Input validation (client + server)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Layer 5: Audit & Monitoring                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • SMS logs                                              │   │
│  │  • Payment logs                                          │   │
│  │  • Session tracking                                      │   │
│  │  • Error logging (Supabase logs)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT TOPOLOGY                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Cloudflare     │
                    │   (DNS + CDN)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼──────────┐
    │   Vercel/Netlify  │       │   Supabase Cloud    │
    │   (Frontend)      │       │   (Backend)         │
    │                   │       │                     │
    │  • React SPA      │       │  • Postgres DB      │
    │  • Static assets  │       │  • Edge Functions   │
    │  • Global CDN     │       │  • Real-time API    │
    └───────────────────┘       │  • Auth (optional)  │
                                └──────────┬──────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                    ┌─────────▼─────────┐   ┌──────────▼──────────┐
                    │   M-Pesa API      │   │   Mikrotik Routers  │
                    │   (Daraja)        │   │   (Customer Sites)  │
                    │                   │   │                     │
                    │  • STK Push       │   │  • Hotspot          │
                    │  • Callbacks      │   │  • User Management  │
                    └───────────────────┘   │  • Accounting       │
                                            └─────────────────────┘
```

---

## 🔄 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. USER REGISTRATION
   User → Frontend → Supabase → Database (admins, system_credentials)

2. ADMIN LOGIN
   Admin → Frontend → validate_session (RPC) → Database → Session Token

3. ROUTER SETUP
   Admin → Frontend → Database (mikrotiks) → Mikrotik API

4. PACKAGE CREATION
   Admin → Frontend → Database (packages)

5. PAYMENT INITIATION
   User → Portal → Frontend → mpesa-stk-push (Edge Function) → M-Pesa

6. PAYMENT PROCESSING
   M-Pesa → mpesa-callback (Edge Function) → Database (payments)

7. USER CREATION
   Frontend → Database (wifi_users) → Mikrotik API → Router

8. USER LOGIN
   User → Client Login → Database → Mikrotik → Internet Access

9. SMS NOTIFICATION (Optional)
   Frontend → send-sms (Edge Function) → Africa's Talking → User Phone

10. ANALYTICS
    Database → Frontend (GraphDashboard) → Admin View
```

---

## 🎯 Key Design Decisions

### Why Custom Auth (not Supabase Auth)?
- ✅ Full control over session management
- ✅ Custom password hashing logic
- ✅ Session token in header (not cookie)
- ✅ Easier Mikrotik integration

### Why Edge Functions?
- ✅ Low latency (run close to users)
- ✅ Secure (credentials in server, not client)
- ✅ Scalable (auto-scales with Supabase)
- ✅ Cost-effective (pay per execution)

### Why Session Tokens?
- ✅ Stateless validation
- ✅ Easy to invalidate
- ✅ Works with Mikrotik redirect
- ✅ No CSRF issues

### Why Postgres?
- ✅ ACID compliance
- ✅ Row Level Security
- ✅ JSON support
- ✅ Powerful queries

---

**Last Updated:** 2026-03-28
**Version:** 1.0.0
