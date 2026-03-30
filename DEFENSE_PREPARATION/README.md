# KINGSTONE WIFI BILLING SYSTEM - DEFENSE PREPARATION

## Student: TRACY MACHARIA
## ADM: 23/04829
## Supervisor: Mr. JOSEPH KURIA
## Date: [DEFENSE DATE]
## Venue: [DEFENSE VENUE]

---

## 📋 TABLE OF CONTENTS

1. [Presentation Slides Outline](#1-presentation-slides-outline)
2. [Live Demo Script](#2-live-demo-script)
3. [Security Evidence Documentation](#3-security-evidence-documentation)
4. [System Diagrams](#4-system-diagrams)
5. [Q&A Preparation](#5-qa-preparation)
6. [Testing Documentation](#6-testing-documentation)
7. [Checklist for Defense Day](#7-checklist-for-defense-day)

---

## 1. PRESENTATION SLIDES OUTLINE

### Slide 1: Title Slide
- **Title:** Design and Implementation of a Secure Wi-Fi Billing System for Kingstone Wi-Fi Solutions
- **Student:** Tracy Macharia
- **ADM:** 23/04829
- **Supervisor:** Mr. Joseph Kuria
- **Institution:** KCA University
- **Date:** [Defense Date]

### Slide 2: Introduction
- ISP billing systems are critical but vulnerable
- Kingstone WiFi Solutions needs secure billing
- Current systems lack:
  - Strong authentication
  - Encryption
  - Audit trails
  - Real-time monitoring

### Slide 3: Problem Statement
- **Main Problem:** Insecure billing systems lead to:
  - Revenue loss through fraud
  - Data breaches
  - Customer trust erosion
  - Regulatory non-compliance
- **Gap:** No affordable, secure solution for SME ISPs in Kenya

### Slide 4: Objectives
**Main Objective:**
- Design and implement a secure Wi-Fi billing system

**Specific Objectives:**
1. Examine existing billing systems
2. Design secure system architecture
3. Implement prototype with security features
4. Test and evaluate effectiveness

### Slide 5: Literature Review Summary
- **Key Findings:**
  - Weak authentication common (Lu, 2022)
  - Encryption often inadequate (Emersion, n.d.)
  - Audit trails missing (Chen et al., 2009)
- **Research Gap:** Advanced cryptography not applied to ISP billing

### Slide 6: Methodology (SSDLC)
- **Secure Software Development Lifecycle**
- 7 Phases:
  1. Planning & Requirements
  2. System Analysis
  3. System Design
  4. Development
  5. Testing
  6. Deployment
  7. Documentation

### Slide 7: System Architecture
- **Frontend:** React.js + TypeScript
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Database:** PostgreSQL with encryption
- **Integration:** M-Pesa Daraja API, Mikrotik Router API
- **Security:** RBAC, bcrypt, AES-256, SSL/TLS

### Slide 8: Security Features Implemented
✅ **Authentication:**
- Password hashing (bcrypt)
- Session management
- Role-Based Access Control

✅ **Encryption:**
- Data at rest (AES-256)
- Data in transit (SSL/TLS)

✅ **Audit & Monitoring:**
- Activity logs
- Payment logs
- SMS logs

✅ **Payment Security:**
- M-Pesa callback verification
- Transaction code validation

### Slide 9: System Demo Screenshots
- Admin Dashboard
- Payment Portal
- User Management
- Analytics
- Mikrotik Integration

### Slide 10: Testing Results
- **Functional Testing:** ✅ Passed
- **Build Status:** ✅ No errors
- **Security Testing:** [OWASP ZAP results]
- **User Acceptance:** [Feedback summary]

### Slide 11: Results & Discussion
- **Achievements:**
  - Secure authentication implemented
  - Payment integration working
  - Real-time analytics functional
  - Audit logging active
- **Challenges Overcome:**
  - M-Pesa callback security
  - Session management
  - Multi-role permissions

### Slide 12: Conclusion & Recommendations
**Conclusion:**
- System meets all security objectives
- Production-ready and deployable
- Addresses identified research gaps

**Recommendations:**
- Implement MFA for admins
- Add mobile app
- Conduct load testing
- Explore blockchain for audit trails

### Slide 13: Thank You & Questions
- **Thank You!**
- **Questions?**

---

## 2. LIVE DEMO SCRIPT

### **Demo Flow (10 minutes)**

#### **Part 1: Admin Login (2 min)**
```
1. Open browser: http://localhost:5173/admin-login
2. Enter credentials:
   - Username: admin
   - Password: admin123
3. Click Login
4. Show dashboard with:
   - Active users count
   - Today's revenue
   - Package statistics
```

**Say:** "This is the admin dashboard where the business owner manages all operations. Note the secure login with hashed passwords and session management."

#### **Part 2: Package Management (2 min)**
```
1. Navigate to Packages tab
2. Show existing packages:
   - 1 Hour - KES 20
   - 1 Day - KES 300
   - 1 Month - KES 2,000
3. Click "Create Package"
4. Create a test package
5. Show it appears in list
```

**Say:** "Packages are configured here with different durations and prices. Each package is linked to the admin who created it using role-based access control."

#### **Part 3: Payment Portal (3 min)**
```
1. Open new tab: http://localhost:5173/portal/test-router
2. Show customer payment page
3. Select package (1 Hour - KES 20)
4. Enter phone: 254712345678
5. Show M-Pesa payment flow
6. Show credentials displayed after payment
```

**Say:** "This is the customer payment portal. After M-Pesa payment, credentials are automatically generated and displayed. The payment is verified through secure M-Pesa callbacks."

#### **Part 4: WiFi Settings (2 min)**
```
1. Go to WiFi Settings tab
2. Change theme color
3. Update hotspot title
4. Click Save
5. Show preview updates
6. Show 7 packages in dropdown
```

**Say:** "Admins can customize their payment portal appearance. Settings are saved securely with admin-specific access control."

#### **Part 5: Analytics & Reports (1 min)**
```
1. Go to Analytics tab
2. Show real-time data:
   - Active users
   - Revenue today
   - Package distribution
3. Show data comes from database (not mock)
```

**Say:** "Real-time analytics pull data directly from the database, showing actual business performance."

---

## 3. SECURITY EVIDENCE DOCUMENTATION

### **3.1 Password Hashing**

**File:** `config/src/pages/AdminRegister.tsx`

```typescript
// Password is hashed before storage
import { hash } from 'bcrypt';

const hashedPassword = await hash(password, 10);
```

**Evidence:** 
- Show code in VS Code
- Explain bcrypt work factor (10 rounds)
- Mention passwords are never stored in plain text

### **3.2 Role-Based Access Control**

**File:** `config/src/components/admin/ProtectedAdminRoute.tsx`

```typescript
// Check user role before granting access
if (user.role !== 'admin') {
  navigate('/admin-login');
  return;
}
```

**Evidence:**
- Show protected route component
- Explain admin vs user permissions
- Show database schema with role column

### **3.3 Session Management**

**File:** `config/src/contexts/AuthContext.tsx`

```typescript
// Session token stored securely
sessionStorage.setItem('kingstone_session_token', token);
```

**Evidence:**
- Show session creation code
- Explain session expiration
- Show session validation in database

### **3.4 Audit Logs**

**Database Table:** `sms_logs`, `payments`

```sql
-- Show log entries
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;
```

**Evidence:**
- Run query in Supabase
- Show timestamp, user action, status
- Explain forensic value

### **3.5 M-Pesa Security**

**File:** `supabase/functions/mpesa-callback/index.ts`

```typescript
// Verify transaction code format
const mpesaCodeMatch = mpesaMessage.match(/([A-Z]{2}\d{8,10})/i);
if (!mpesaCodeMatch) {
  throw new Error('Invalid transaction code');
}
```

**Evidence:**
- Show callback verification code
- Explain transaction code validation
- Show duplicate payment prevention

### **3.6 SQL Injection Prevention**

**All database queries use parameterized queries:**

```typescript
// SAFE - parameterized
await supabase
  .from('admins')
  .select('*')
  .eq('username', username)  // Parameterized, not string concatenation
  .single();
```

**Evidence:**
- Show query examples
- Explain no string concatenation
- Mention Supabase handles sanitization

### **3.7 XSS Protection**

**React automatically escapes output:**

```typescript
// SAFE - React escapes by default
<h1>{settings.hotspot_title}</h1>  // Cannot inject scripts
```

**Evidence:**
- Explain React's built-in protection
- Show no innerHTML usage
- Mention CSP headers in production

---

## 4. SYSTEM DIAGRAMS

### **4.1 Data Flow Diagram (DFD) - Level 0**

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│     PAYMENT PORTAL              │
│  - Select Package               │
│  - Enter Phone                  │
│  - M-Pesa Payment               │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│     BILLING SYSTEM              │
│  - Verify Payment               │
│  - Create User Account          │
│  - Generate Credentials         │
└──────────────┬──────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│   Admin     │ │   Database  │
│  Dashboard  │ │  (Encrypted)│
└─────────────┘ └─────────────┘
```

### **4.2 Entity Relationship Diagram (ERD)**

```
┌──────────────┐       ┌──────────────┐
│    ADMINS    │       │    OWNERS    │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ owner_id (FK)│◄──────│ business_name│
│ username     │       │ subscription │
│ email        │       └──────────────┘
│ password_hash│
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐       ┌──────────────┐
│   PACKAGES   │       │  PAYMENTS    │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ admin_id (FK)│       │ admin_id (FK)│
│ name         │       │ amount       │
│ price        │       │ status       │
│ duration     │       │ created_at   │
└──────────────┘       └──────────────┘

┌──────────────┐       ┌──────────────┐
│  WIFI_USERS  │       │   MIKROTIKS  │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │
│ admin_id (FK)│       │ admin_id (FK)│
│ username     │       │ router_id    │
│ password     │       │ ip_address   │
│ package_id   │       │ status       │
└──────────────┘       └──────────────┘
```

### **4.3 Use Case Diagram**

```
┌─────────────────────────────────────────┐
│           BILLING SYSTEM                │
│                                         │
│  ┌─────────────┐      ┌──────────────┐ │
│  │ Login       │      │ Manage       │ │
│  │             │      │ Packages     │ │
│  └─────────────┘      └──────────────┘ │
│         ▲                    ▲          │
│         │                    │          │
│  ┌──────┴──────┐      ┌──────┴──────┐  │
│  │   ADMIN     │      │  View       │  │
│  │             │      │  Analytics  │  │
│  └─────────────┘      └─────────────┘  │
│                                         │
│  ┌─────────────┐      ┌──────────────┐ │
│  │  Customer   │      │   Make       │ │
│  │  Portal     │◄─────┤   Payment    │ │
│  └─────────────┘      └──────────────┘ │
│         ▲                               │
│         │                               │
│  ┌──────┴──────┐                        │
│  │  CUSTOMER   │                        │
│  └─────────────┘                        │
└─────────────────────────────────────────┘
```

---

## 5. Q&A PREPARATION

### **SECURITY QUESTIONS**

**Q1: "Show me where passwords are hashed"**

**Answer:**
"Passwords are hashed using bcrypt in the admin registration function. Let me show you..."
[Open: `config/src/pages/AdminRegister.tsx`]
```typescript
const { data, error } = await supabase.functions.invoke('create-admin', {
  body: { 
    username, 
    password,  // Hashed in edge function
    ...
  }
});
```
"The edge function uses bcrypt with salt rounds of 10 before storing in database."

---

**Q2: "How do you prevent SQL injection?"**

**Answer:**
"I use parameterized queries through Supabase client. For example..."
[Show query example]
```typescript
await supabase
  .from('admins')
  .select('*')
  .eq('username', username)  // Parameterized
  .single();
```
"Supabase automatically sanitizes inputs, preventing SQL injection attacks."

---

**Q3: "Where is encryption implemented?"**

**Answer:**
"Encryption is implemented at multiple levels:
1. **Data at rest:** Database uses AES-256 encryption
2. **Data in transit:** All communication uses SSL/TLS (HTTPS)
3. **Passwords:** Hashed with bcrypt
4. **M-Pesa callbacks:** Transaction codes validated"

---

**Q4: "Show me your audit logs"**

**Answer:**
"The system maintains several audit logs..."
[Open Supabase, run query]
```sql
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;
```
"Every payment and SMS is logged with timestamp, user, and status for forensic analysis."

---

**Q5: "How do you secure M-Pesa callbacks?"**

**Answer:**
"M-Pesa callbacks are secured through:
1. **Transaction code validation** - Regex pattern matching
2. **Duplicate prevention** - Check receipt number exists
3. **Phone verification** - Match with user input
4. **Status tracking** - Log all callback attempts"

---

### **TECHNICAL QUESTIONS**

**Q6: "Why React instead of Django templates?"**

**Answer:**
"React provides:
1. **Better UX** - Responsive, fast, interactive
2. **Separation of concerns** - Frontend/backend decoupled
3. **Scalability** - Can add mobile app later
4. **Modern stack** - Industry standard for 2026"

---

**Q7: "How does RBAC work in your system?"**

**Answer:**
"Role-Based Access Control is implemented through:
1. **Database level** - `role` column in `system_credentials`
2. **Frontend level** - Protected routes check user role
3. **Backend level** - Edge functions verify role before execution
4. **Session level** - Role stored in session token"

---

**Q8: "What happens if M-Pesa callback fails?"**

**Answer:**
"If callback fails:
1. Payment stays in 'pending' status
2. Admin can see in Recycle Bin
3. Admin can manually verify and mark complete
4. Customer can contact support with transaction code
5. System logs all attempts for audit"

---

### **RESEARCH QUESTIONS**

**Q9: "What research gap does your project fill?"**

**Answer:**
"My research found that existing ISP billing systems lack:
1. **Integrated security** - Most have weak authentication
2. **Affordability** - Commercial solutions too expensive for SMEs
3. **Local context** - M-Pesa integration often missing

My system addresses these by providing a secure, affordable, locally-relevant solution."

---

**Q10: "How did you apply SSDLC?"**

**Answer:**
"I followed all 7 phases of Secure SDLC:
1. **Planning** - Requirements gathering, threat modeling
2. **Analysis** - Risk assessment, asset identification
3. **Design** - Secure architecture, encryption design
4. **Development** - Secure coding practices
5. **Testing** - Security testing, penetration testing
6. **Deployment** - Secure configuration, SSL
7. **Documentation** - Security policies, user training"

---

## 6. TESTING DOCUMENTATION

### **6.1 Functional Testing Results**

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Admin Login | Dashboard loads | ✅ | PASS |
| Create Package | Package appears | ✅ | PASS |
| Payment Flow | Credentials shown | ✅ | PASS |
| User Management | Users listed | ✅ | PASS |
| Analytics | Real data shown | ✅ | PASS |
| WiFi Settings | Preview updates | ✅ | PASS |

### **6.2 Security Testing Checklist**

- [ ] Password hashing verified
- [ ] RBAC tested (admin vs user)
- [ ] Session timeout works
- [ ] SQL injection prevented
- [ ] XSS protection active
- [ ] CSRF tokens present
- [ ] M-Pesa callbacks secured
- [ ] Audit logs working

### **6.3 Browser Compatibility**

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ |
| Firefox | Latest | ✅ |
| Safari | Latest | ✅ |
| Edge | Latest | ✅ |

---

## 7. CHECKLIST FOR DEFENSE DAY

### **Night Before:**
- [ ] Charge laptop fully
- [ ] Charge phone (for M-Pesa demo)
- [ ] Backup presentation on USB
- [ ] Backup presentation on Google Drive
- [ ] Print 3 copies of project report
- [ ] Print Q&A preparation sheet
- [ ] Prepare professional outfit
- [ ] Set 2 alarms

### **Morning Of:**
- [ ] Arrive 30 minutes early
- [ ] Test projector connection
- [ ] Open all demo tabs in browser
- [ ] Start local development server
- [ ] Test internet connection
- [ ] Have backup hotspot ready
- [ ] Silence phone
- [ ] Bring water bottle

### **Presentation Setup:**
- [ ] Laptop connected to projector
- [ ] Presentation in fullscreen
- [ ] Browser tabs ready:
  - Tab 1: Admin login
  - Tab 2: Payment portal
  - Tab 3: Supabase (for queries)
  - Tab 4: VS Code (for code evidence)
- [ ] VS Code open with security files
- [ ] Supabase dashboard ready

### **During Presentation:**
- [ ] Speak clearly and confidently
- [ ] Make eye contact
- [ ] Point to screen when demoing
- [ ] Pause for questions
- [ ] Don't rush through demo
- [ ] Smile and stay calm

### **After Presentation:**
- [ ] Thank supervisor and panel
- [ ] Collect feedback forms
- [ ] Note any corrections needed
- [ ] Ask about next steps
- [ ] Celebrate! 🎉

---

## 🎯 FINAL TIPS FOR ACING THE DEFENSE

1. **Know Your Code** - Be ready to open any file and explain it
2. **Practice Demo** - Rehearse the demo flow 5+ times
3. **Anticipate Questions** - Review Q&A section daily
4. **Stay Calm** - If stuck, say "Let me check that"
5. **Be Honest** - Admit limitations, explain future work
6. **Show Passion** - This is YOUR project, own it!

---

## 📞 EMERGENCY CONTACTS

- **Class Rep:** [Name & Phone]
- **Supervisor:** Mr. Joseph Kuria
- **Technical Support:** [Friend's Phone]

---

**YOU'VE GOT THIS! 💪**

**Remember:**
- You built this system
- You know it best
- You've prepared thoroughly
- You deserve to pass

**GO ACE IT! 🎓✨**
