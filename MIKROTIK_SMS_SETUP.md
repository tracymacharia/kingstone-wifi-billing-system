# Mikrotik & SMS Configuration Guide

## 📶 Mikrotik Router Setup

### Step 1: Update Login URL

**File:** `mikrotik/login.html`

**Find this line:**
```html
<meta http-equiv="refresh" content="3; url=http://YOUR_DOMAIN_HERE/portal/...
```

**Replace `YOUR_DOMAIN_HERE` with:**
- Your deployed frontend URL (e.g., `https://your-app.vercel.app`)
- Or localhost for testing: `http://localhost:5173`

**Example:**
```html
<meta http-equiv="refresh" content="3; url=http://localhost:5173/portal/$(identity)?mac=$(mac)&ip=$(ip)&router_id=MIKROTIK_$(identity)&link_login=$(link-login-only)&link_orig=$(link-orig)">
```

### Step 2: Upload Files to Mikrotik Router

1. **Connect to Mikrotik** via Winbox or WebFig
2. **Go to:** Files → Upload
3. **Upload these 4 files:**
   - `mikrotik/login.html`
   - `mikrotik/logout.html`
   - `mikrotik/alogin.html`
   - `mikrotik/error.html`

### Step 3: Configure Hotspot

```routeros
# Set login HTML file
/ip hotspot set [find] login-by=http-chap,http-pap
/ip hotspot set [find] html-directory=flash

# Configure Walled Garden (allow payment portal before auth)
/ip hotspot walled-garden
add dst-host=your-domain.com
add dst-host=your-supabase-url.supabase.co

# Set hotspot server address
/ip hotspot set [find] address=192.168.88.1/24
```

### Step 4: Test

1. Connect to WiFi
2. Should redirect to: `http://YOUR_DOMAIN/portal/[router-id]`
3. Select package and pay

---

## 📱 SMS Configuration

### Current Status: ⚠️ Partial Implementation

**What Works:**
- ✅ SMS settings UI in admin dashboard
- ✅ Settings saved to database (`sms_settings` table)
- ✅ SMS logs table exists

**What's Missing:**
- ❌ No SMS sending edge function
- ❌ No SMS API integration
- ❌ No automatic SMS notifications

### Option 1: Enable SMS (Requires Implementation)

#### 1. Choose SMS Provider

**Africa's Talking** (Recommended for Kenya):
- Website: https://africastalking.com
- Cost: ~KSh 0.80 per SMS
- Good for Kenyan phone numbers

**Twilio** (International):
- Website: https://twilio.com
- Cost: ~$0.05 per SMS
- Global coverage

#### 2. Get API Credentials

1. Sign up at provider
2. Get API Key
3. Get Sender ID (e.g., "WiFiNet")

#### 3. Configure in Admin Dashboard

1. Login as admin
2. Go to **SMS** tab
3. Enable SMS
4. Enter:
   - Provider: Africa's Talking or Twilio
   - Username/API Key
   - Sender Number
   - Message Template

#### 4. Implementation Needed

You'll need to create an edge function to send SMS:

**File:** `supabase/functions/send-sms/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { phone, message, provider, apiKey } = await req.json()

  // Africa's Talking API
  if (provider === 'africas-talking') {
    const response = await fetch('https://api.africastalking.com/v1/messaging', {
      method: 'POST',
      headers: {
        'ApiKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'sandbox', // or your username
        to: phone,
        message: message
      })
    })
    
    const result = await response.json()
    return new Response(JSON.stringify(result), { status: 200 })
  }

  // Twilio API
  if (provider === 'twilio') {
    // Implement Twilio sending
  }

  return new Response(JSON.stringify({ success: false }), { status: 400 })
})
```

### Option 2: Disable SMS (Simpler)

If you don't need SMS notifications:

1. **Ignore SMS tab** in admin dashboard
2. **Users will see credentials on screen** after payment
3. **No SMS will be sent** (system still works)

---

## ✅ Recommended Setup

### For Mikrotik:
1. ✅ Update `login.html` with your domain
2. ✅ Upload all 4 HTML files to router
3. ✅ Configure walled garden
4. ✅ Test payment flow

### For SMS:
**Option A - No SMS (Recommended for starting):**
- Skip SMS setup
- Users see credentials on screen
- Save costs (KSh 0.80 per SMS)

**Option B - Add SMS Later:**
- Implement edge function
- Get Africa's Talking account
- Configure in admin panel
- Send expiry reminders

---

## 🧪 Testing

### Test Mikrotik Redirect:
1. Upload `login.html` to router
2. Connect to WiFi
3. Should redirect to payment portal
4. URL should include: `?mac=XX:XX:XX:XX:XX:XX&ip=192.168.X.X`

### Test Payment:
1. Select package (e.g., 1 Hour - KES 20)
2. Enter phone: `254712345678`
3. Pay via M-Pesa
4. Credentials shown on screen

### Test Login:
1. Go to `/client-login`
2. Enter credentials
3. Should grant internet access

---

## 📞 Support

**Mikrotik Issues:**
- Check router IP is correct
- Verify port 8728 open
- Ensure API enabled in Mikrotik

**SMS Issues:**
- Verify API credentials
- Check phone number format (+254...)
- Review Supabase function logs

**Payment Issues:**
- Check M-Pesa callback URL
- Verify Daraja credentials
- Review payment logs in admin dashboard
