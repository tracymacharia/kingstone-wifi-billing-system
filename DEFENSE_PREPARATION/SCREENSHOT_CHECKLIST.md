# 📸 SCREENSHOT CHECKLIST FOR PRESENTATION

## Instructions:
1. Open your system in browser (localhost or deployed)
2. Capture each screen listed below
3. Save as: `screenshot_01_login.png`, `screenshot_02_dashboard.png`, etc.
4. Insert into presentation and final document
5. Make sure data is visible and clear

---

## REQUIRED SCREENSHOTS (12 Total)

### ✅ 1. Admin Login Page
**File:** `screenshot_01_login.png`

**How to Capture:**
1. Open: `http://localhost:5173/admin-login`
2. Show login form clearly
3. Include URL bar if possible
4. Make sure it looks clean

**What Should Be Visible:**
- Username field
- Password field
- Login button
- "Forgot Password" link (if exists)
- Kingstone WiFi branding

---

### ✅ 2. Admin Dashboard
**File:** `screenshot_02_dashboard.png`

**How to Capture:**
1. Login with: admin / admin123
2. Go to main dashboard
3. Show statistics cards
4. Capture full screen

**What Should Be Visible:**
- Active users count
- Today's revenue
- Total packages
- Mikrotik status
- Navigation menu
- Charts/graphs

---

### ✅ 3. Package Management
**File:** `screenshot_03_packages.png`

**How to Capture:**
1. Click "Packages" in menu
2. Show all packages listed
3. Make sure prices visible

**What Should Be Visible:**
- List of 7 packages
- Package names and prices
- Create Package button
- Edit/Delete actions
- Active/inactive status

---

### ✅ 4. Payment Portal (Customer View)
**File:** `screenshot_04_payment_portal.png`

**How to Capture:**
1. Open: `http://localhost:5173/portal/test-router-id`
2. Show package selection
3. Show phone input
4. Make it look customer-friendly

**What Should Be Visible:**
- Package dropdown (7 options)
- Phone number input
- Pay button
- M-Pesa instructions
- Kingstone WiFi branding

---

### ✅ 5. Payment Success with Credentials
**File:** `screenshot_05_credentials.png`

**How to Capture:**
1. Complete a test payment (use test mode)
2. Capture credentials display screen
3. Blur actual credentials for privacy

**What Should Be Visible:**
- Success message
- Username field
- Password field
- Connection instructions
- Print/Save button

**Note:** Blur or pixelate actual username/password for privacy!

---

### ✅ 6. WiFi Settings
**File:** `screenshot_06_wifi_settings.png`

**How to Capture:**
1. Go to WiFi Settings tab
2. Show theme color picker
3. Show preview section

**What Should Be Visible:**
- Theme color picker
- Hotspot title input
- Description input
- Contact info fields
- Live preview
- Save button

---

### ✅ 7. Connected Users
**File:** `screenshot_07_connected_users.png`

**How to Capture:**
1. Go to Connected Users tab
2. Show list of active users

**What Should Be Visible:**
- User list
- Username
- Package name
- Time remaining
- Status (Active/Expired)
- Connected time

---

### ✅ 8. Payment History
**File:** `screenshot_08_payments.png`

**How to Capture:**
1. Go to Payments tab
2. Show payment list

**What Should Be Visible:**
- Payment list
- Amount (KES)
- Phone number
- Package name
- Status (completed/pending/failed)
- Date/time
- Receipt number

---

### ✅ 9. Analytics Dashboard
**File:** `screenshot_09_analytics.png`

**How to Capture:**
1. Go to Analytics tab
2. Show all charts and graphs

**What Should Be Visible:**
- Active users graph
- Revenue chart
- Package distribution (pie chart)
- Mikrotik status
- Statistics cards

---

### ✅ 10. Recycle Bin (Failed Payments)
**File:** `screenshot_10_recycle_bin.png`

**How to Capture:**
1. Go to Recycle Bin tab
2. Show failed/pending payments

**What Should Be Visible:**
- Failed payments list
- Search box
- Filter dropdown
- Mark as Completed button
- Delete button
- Status badges

---

### ✅ 11. Mikrotik Management
**File:** `screenshot_11_mikrotik.png`

**How to Capture:**
1. Go to Mikrotik tab
2. Show router list

**What Should Be Visible:**
- Router list
- Router name
- IP address
- Status (online/offline)
- Add router button
- Edit/Delete actions

---

### ✅ 12. Subscription Status
**File:** `screenshot_12_subscription.png`

**How to Capture:**
1. Go to Subscription tab
2. Show subscription info

**What Should Be Visible:**
- Status (Active/Trial)
- Plan type
- Expiry date
- Contact information
- Renewal options

---

## BONUS SCREENSHOTS (Optional but Recommended)

### 📸 13. Mobile Responsive View
**File:** `screenshot_13_mobile.png`

**How to Capture:**
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android
4. Capture mobile view of payment portal

**What Should Be Visible:**
- Mobile-friendly layout
- Touch-friendly buttons
- Responsive design

---

### 📸 14. Database Schema (Supabase)
**File:** `screenshot_14_database.png`

**How to Capture:**
1. Open Supabase Dashboard
2. Go to Table Editor
3. Show table list

**What Should Be Visible:**
- Table names (admins, packages, payments, etc.)
- Row counts
- Relationships (if shown)

---

### 📸 15. Code Evidence - Password Hashing
**File:** `screenshot_15_code_hashing.png`

**How to Capture:**
1. Open VS Code
2. Navigate to: `config/src/pages/AdminRegister.tsx`
3. Show password hashing code

**What Should Be Visible:**
- bcrypt import
- hash function call
- Salt rounds (10)

---

### 📸 16. Code Evidence - RBAC
**File:** `screenshot_16_code_rbac.png`

**How to Capture:**
1. Open VS Code
2. Navigate to: `config/src/components/admin/ProtectedAdminRoute.tsx`
3. Show role checking code

**What Should Be Visible:**
- Role check logic
- Redirect if not admin
- Protected route wrapper

---

### 📸 17. Code Evidence - M-Pesa Security
**File:** `screenshot_17_code_mpesa.png`

**How to Capture:**
1. Open VS Code
2. Navigate to: `supabase/functions/mpesa-callback/index.ts`
3. Show transaction verification code

**What Should Be Visible:**
- Transaction code regex
- Receipt number check
- Duplicate prevention

---

### 📸 18. Audit Logs (Database)
**File:** `screenshot_18_audit_logs.png`

**How to Capture:**
1. Open Supabase
2. Go to Table Editor
3. Open `payments` or `sms_logs` table
4. Show recent entries

**What Should Be Visible:**
- Timestamp
- User ID
- Action
- Status
- Amount

---

### 📸 19. Build Success
**File:** `screenshot_19_build.png`

**How to Capture:**
1. Open terminal
2. Run: `npm run build`
3. Capture success message

**What Should Be Visible:**
- "✓ built successfully"
- No errors
- Bundle size

---

### 📸 20. GitHub Repository
**File:** `screenshot_20_github.png`

**How to Capture:**
1. Open: https://github.com/tracymacharia/kingstone-wifi-billing-system
2. Show repository page
3. Include commit history

**What Should Be Visible:**
- Repository name
- File structure
- Recent commits
- README preview

---

## SCREENSHOT TIPS

### DO:
✅ Use consistent lighting
✅ Make sure text is readable
✅ Include relevant UI elements
✅ Crop unnecessary parts
✅ Use PNG format for quality
✅ Name files systematically

### DON'T:
❌ Don't capture blurry images
❌ Don't include personal data
❌ Don't show actual passwords
❌ Don't use low resolution
❌ Don't capture partial screens

---

## WHERE TO INSERT SCREENSHOTS

### In Final Document:
- Section 4.1: All 12 main screenshots
- Appendix A: Bonus screenshots

### In PowerPoint:
- Slides 12-18: Main system screenshots
- Slide 20: Code evidence (optional)
- Slide 21: Build/test results

---

## CAPTURE TOOLS

### Recommended:
1. **Windows Snipping Tool** (built-in)
   - Win + Shift + S
   
2. **Lightshot** (free)
   - Download: app.prntscr.com
   
3. **Greenshot** (free, open-source)
   - Download: getgreenshot.org

### Browser Extensions:
1. **Nimbus Screenshot** (Chrome)
2. **Fireshot** (Firefox/Chrome)

---

## CHECKLIST

Before presentation, verify:

- [ ] All 12 main screenshots captured
- [ ] Images are clear and readable
- [ ] File names are systematic
- [ ] Screenshots inserted in document
- [ ] Screenshots inserted in slides
- [ ] Sensitive data blurred
- [ ] Backup copies saved
- [ ] Screenshots accessible offline

---

## ORGANIZATION

Create folder structure:

```
DEFENSE_PREPARATION/
├── screenshots/
│   ├── screenshot_01_login.png
│   ├── screenshot_02_dashboard.png
│   ├── screenshot_03_packages.png
│   ├── ... (all 20 screenshots)
│   └── README.md (this file)
├── FINAL_PRESENTATION_DOCUMENT.md
├── POWERPOINT_OUTLINE.md
└── Q&A_PREPARATION.md
```

---

**GOOD LUCK WITH YOUR SCREENSHOT CAPTURE! 📸**

Take your time, make them clear and professional. These screenshots are your evidence - they prove your system works!
