# 🚀 Quick Start Guide - Get Running in 30 Minutes

## Prerequisites
- Supabase account (free tier works)
- M-Pesa Daraja account (sandbox)
- Mikrotik router (or testing without)
- Node.js 18+

---

## Step 1: Database Setup (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to: https://mpjezwlweapgltrimtqy.supabase.co
   - Navigate to **SQL Editor**

2. **Run Migrations**
   
   Copy and paste these files **in order**:
   
   ```
   1. database/SETUP_DATABASE.sql
   2. database/FIX_REGISTRATION_ISSUES.sql
   ```

3. **Verify Setup**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   ```
   
   Should show: `admins`, `system_credentials`, `mikrotiks`, `packages`, `payments`, etc.

---

## Step 2: Create Admin Account (2 minutes)

### Option A: Via Web Interface (Recommended)

1. Go to your app: `http://localhost:5173/admin/register`
2. Fill in the form:
   - Full Name: Your name
   - Email: your@email.com
   - Phone: 0712345678
   - Business Name: Your WiFi business
   - Username: admin
   - Password: YourSecurePassword123!
3. Click "Create Account"

### Option B: Via SQL

```sql
SELECT * FROM create_admin_account(
  'admin',
  'admin@kingstone.local',
  '0712345678',
  'Kingstone WiFi',
  'admin123',
  'System Administrator'
);
```

---

## Step 3: Start Development Server (5 minutes)

```bash
# Navigate to config folder
cd config

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open: http://localhost:5173

---

## Step 4: Configure M-Pesa (10 minutes)

### 4.1 Get Sandbox Credentials

1. Go to: https://developer.mpesa.africaperformanceco.com
2. Sign up/Login
3. Create a new app
4. Copy:
   - Consumer Key
   - Consumer Secret

### 4.2 Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref mpjezwlweapgltrimtqy

# Set secrets (replace with your credentials)
supabase secrets set MPESA_CONSUMER_KEY="your_key_here"
supabase secrets set MPESA_CONSUMER_SECRET="your_secret_here"
supabase secrets set MPESA_PASSKEY="LZ6rtbZbFZqk8VqK3hGJmN9pXcWd2QsA"
supabase secrets set MPESA_ENVIRONMENT="sandbox"

# Deploy functions
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
```

### 4.3 Test M-Pesa

```bash
# Test STK Push
curl -X POST https://mpjezwlweapgltrimtqy.supabase.co/functions/v1/mpesa-stk-push \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 1,
    "packageId": "test",
    "packageName": "Test Package",
    "adminId": "your-admin-id",
    "mpesaType": "till",
    "mpesaNumber": "123456"
  }'
```

---

## Step 5: Configure Mikrotik (Optional - 10 minutes)

### Without Physical Router (Testing)

You can test the system without a Mikrotik router:

1. **Add Fake Router in Admin Dashboard:**
   - Name: Test Router
   - Router ID: TEST_001
   - IP Address: 192.168.88.1
   - Port: 8728
   - Username: admin
   - Password: admin
   - Status: offline (expected)

2. **Create Packages:**
   - 1 Hour - KES 20
   - 1 Day - KES 100
   - 1 Week - KES 500

3. **Test Payment Portal:**
   - Go to: http://localhost:5173/portal/TEST_001
   - Select package
   - Enter phone number
   - Pay via M-Pesa

### With Physical Router

See `PRODUCTION_CHECKLIST.md` section 3 for detailed Mikrotik setup.

---

## Step 6: Test Complete Flow (5 minutes)

### Test Payment Flow

1. **Open Payment Portal:**
   ```
   http://localhost:5173/portal/YOUR_ROUTER_ID
   ```

2. **Select Package:**
   - Choose "1 Hour - KES 20"

3. **Enter Phone:**
   - `254712345678`

4. **Pay with M-Pesa:**
   - Click "Pay Now"
   - Enter PIN on phone
   - Wait for confirmation

5. **Verify:**
   - Payment status: "Completed"
   - Receipt number saved
   - Username/password shown

### Test Admin Dashboard

1. **Login:**
   ```
   http://localhost:5173/admin
   Username: admin
   Password: YourSecurePassword123!
   ```

2. **Check:**
   - Dashboard shows payment
   - Mikrotik status
   - User statistics

---

## Step 7: Enable SMS (Optional - 5 minutes)

### Setup Africa's Talking

1. **Get Credentials:**
   - Go to: https://africastalking.com
   - Sign up for sandbox
   - Get Username and API Key

2. **Deploy SMS Function:**
   ```bash
   supabase secrets set AFRICAS_TALKING_USERNAME="sandbox"
   supabase secrets set AFRICAS_TALKING_API_KEY="your_api_key"
   supabase functions deploy send-sms
   ```

3. **Configure in Admin Dashboard:**
   - Go to SMS Settings
   - Enable SMS
   - Enter credentials
   - Test SMS

---

## Common Issues & Solutions

### ❌ "Table does not exist"
**Solution:** Run `SETUP_DATABASE.sql` in Supabase SQL Editor

### ❌ "M-Pesa callback failed"
**Solution:** 
- Check Supabase function logs
- Verify credentials are set
- Ensure callback URL is correct

### ❌ "Cannot connect to Mikrotik"
**Solution:**
- Verify IP address
- Check port 8728 is open
- Ensure API enabled in router

### ❌ "Session expired"
**Solution:**
- Clear browser storage
- Login again
- Check session token in DB

---

## Next Steps

### For Development
- [ ] Customize branding (logo, colors)
- [ ] Add more packages
- [ ] Test with different scenarios
- [ ] Add custom SMS templates

### For Production
- [ ] Get production M-Pesa credentials
- [ ] Deploy to production hosting (Vercel/Netlify)
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups

---

## Project Structure

```
kingstone-wifi-billing/
├── config/                 # Frontend React app
│   ├── src/
│   │   ├── pages/         # Admin & user pages
│   │   ├── components/    # UI components
│   │   ├── lib/           # Utilities
│   │   └── integrations/  # Supabase client
│   └── .env              # Environment variables
├── database/              # SQL migrations
│   ├── SETUP_DATABASE.sql
│   ├── FIX_REGISTRATION_ISSUES.sql
│   └── ...
├── supabase/functions/    # Edge Functions
│   ├── mpesa-stk-push/
│   ├── mpesa-callback/
│   └── send-sms/
├── mikrotik/             # Router HTML files
│   ├── login.html
│   ├── logout.html
│   └── ...
└── PRODUCTION_CHECKLIST.md
```

---

## Default Credentials

**Admin Login:**
- URL: `/admin`
- Username: `admin`
- Password: `admin123` (change this!)

**Database:**
- URL: https://mpjezwlweapgltrimtqy.supabase.co
- Project ID: `mpjezwlweapgltrimtqy`

---

## Useful Commands

```bash
# Development
cd config && npm run dev          # Start dev server
cd config && npm run build        # Build for production

# Supabase
supabase login                    # Login to Supabase
supabase link                     # Link project
supabase functions deploy         # Deploy all functions
supabase functions logs           # View logs

# Database
# Run SQL in: https://mpjezwlweapgltrimtqy.supabase.co/project/sql
```

---

## Resources

- **Documentation:** `PRODUCTION_CHECKLIST.md`
- **Mikrotik Setup:** `MIKROTIK_SMS_SETUP.md`
- **Deployment:** `DEPLOYMENT.md`
- **Supabase Dashboard:** https://mpjezwlweapgltrimtqy.supabase.co
- **M-Pesa Daraja:** https://developer.mpesa.africaperformanceco.com

---

## 🎉 You're Ready!

Your WiFi billing system is now running locally. 

**Test the complete flow:**
1. Create admin account
2. Add Mikrotik router
3. Create packages
4. Test payment
5. Verify user gets credentials

**For production deployment**, follow `PRODUCTION_CHECKLIST.md`

**Need help?** Check the troubleshooting section or review logs in Supabase dashboard.
