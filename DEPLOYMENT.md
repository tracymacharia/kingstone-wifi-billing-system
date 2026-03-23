# Deployment Guide

## Quick Deployment Checklist

### ✅ Prerequisites
- [ ] Supabase account created
- [ ] Node.js 18+ installed
- [ ] M-Pesa Daraja API credentials

### ✅ Step 1: Database Setup

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and run `database/SETUP_DATABASE.sql`
4. Note the admin credentials shown

**Expected Output:**
```
✅ Created default owner and admin user
   Username: admin
   Password: admin123
✅ ALL TABLES CREATED!
```

### ✅ Step 2: Environment Configuration

1. Copy `.env.example` to `.env` in `config/` folder
2. Fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

3. Get credentials from:
   - Supabase Dashboard → Settings → API

### ✅ Step 3: Frontend Deployment

```bash
# Navigate to config folder
cd config

# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
```

### ✅ Step 4: Mikrotik Configuration

1. Upload mikrotik HTML files to router:
   - `mikrotik/login.html`
   - `mikrotik/logout.html`
   - `mikrotik/alogin.html`
   - `mikrotik/error.html`

2. Configure Walled Garden:
   ```
   /ip hotspot walled-garden
   add dst-host=your-supabase-url.supabase.co
   add dst-host=your-domain.com
   ```

3. Set login URL:
   ```
   /ip hotspot set login-url=http://your-payment-portal-url
   ```

### ✅ Step 5: M-Pesa Integration

1. Get M-Pesa credentials from [Daraja Portal](https://developer.mpesa.africaperformanceco.com)
2. Configure in Supabase Edge Functions:
   - `supabase/functions/mpesa-callback/index.ts`
3. Set up callback URL in Daraja portal

---

## Testing

### Test Admin Login
1. Go to `/admin-login`
2. Login with: `admin` / `admin123`
3. Verify you can see dashboard

### Test User Payment
1. Go to `/portal/test-mikrotik-id`
2. Select a package
3. Enter phone number
4. Complete M-Pesa payment
5. Verify credentials are shown

### Test WiFi User Login
1. Go to `/client-login`
2. Enter credentials from payment
3. Verify internet access granted

---

## Troubleshooting

### ❌ "Table does not exist"
**Solution:** Run `SETUP_DATABASE.sql` in Supabase SQL Editor

### ❌ "Session expired"
**Solution:** Clear browser storage and login again

### ❌ "M-Pesa callback failed"
**Solution:** Check Supabase function logs and verify credentials

### ❌ "Cannot connect to Mikrotik"
**Solution:** Verify router IP, port 8728 open, API enabled

---

## Production Checklist

- [ ] Database setup complete
- [ ] Environment variables configured
- [ ] Frontend built and deployed
- [ ] Mikrotik routers configured
- [ ] M-Pesa callbacks working
- [ ] SSL certificates installed
- [ ] Admin users trained
- [ ] Backup strategy in place

---

## Support

For issues:
1. Check Supabase logs
2. Review browser console
3. Verify database tables exist
4. Test with default admin credentials

**Default Admin:**
- Username: `admin`
- Password: `admin123`
- URL: `/admin-login`
