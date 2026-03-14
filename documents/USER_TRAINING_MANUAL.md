# KINGSTONE WIFI BILLING PLATFORM
## User Training Manual

---

**Document Title:** User Training Manual  
**System Name:** Kingstone WiFi Billing Platform  
**Version:** 1.0  
**Prepared By:** Software Development Team  
**Target Users:** Platform Owners, Administrators (ISPs), and WiFi Subscribers  
**Country of Deployment:** Kenya  

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)  
2. [System Overview](#2-system-overview)  
3. [Accessing the Platform](#3-accessing-the-platform)  
4. [Owner User Guide](#4-owner-user-guide)  
5. [Admin (ISP) User Guide](#5-admin-isp-user-guide)  
6. [Customer (WiFi Subscriber) User Guide](#6-customer-wifi-subscriber-user-guide)  
7. [Common Tasks & Workflows](#7-common-tasks--workflows)  
8. [Troubleshooting](#8-troubleshooting)  
9. [Security Guidelines](#9-security-guidelines)  
10. [Glossary of Terms](#10-glossary-of-terms)  

---

## 1. INTRODUCTION

### 1.1 Purpose of This Manual

This User Training Manual provides step-by-step instructions for all users of the **Kingstone WiFi Billing Platform**. It is designed to help new users understand the system quickly and confidently, and to serve as a reference guide for day-to-day operations.

### 1.2 Who Should Read This Manual

This manual is organised into three separate sections based on user role:

| Role | Description | Read Section |
|------|-------------|--------------|
| **Owner** | The top-level business owner who runs the platform and manages ISP administrators | Section 4 |
| **Admin (ISP)** | An internet service provider who manages routers, packages, and customers | Section 5 |
| **Customer** | A WiFi subscriber who purchases packages and manages their connection | Section 6 |

### 1.3 Conventions Used in This Manual

- **Bold text** indicates a button, menu item, or field label on screen.
- `Monospace text` indicates something you type exactly as written.
- > **Note:** boxes highlight important tips or warnings.

---

## 2. SYSTEM OVERVIEW

### 2.1 What is Kingstone WiFi Billing Platform?

Kingstone WiFi Billing Platform is an enterprise-grade internet billing and management system built for Kenyan Internet Service Providers (ISPs). It automates the entire cycle of WiFi service delivery — from creating packages and connecting MikroTik routers, to receiving MPESA payments and managing customer accounts.

### 2.2 Key Capabilities

- **MPESA Integration** — Customers pay via Till Number or Paybill directly from their phones. The system automatically activates their package on payment.
- **MikroTik Router Management** — Routers are configured and controlled from the platform. Hotspot, PPPoE, and Static IP services are all supported.
- **Three-Tier User Hierarchy** — Owner manages Admins; Admins manage Customers. Each level has its own secure dashboard.
- **Real-Time Monitoring** — Live tracking of connected users, router status, and revenue.
- **SMS Notifications** — Automated SMS alerts sent to customers for account activity.
- **Voucher System** — Generate and distribute access vouchers for hotspot zones.

### 2.3 System Architecture (User-Facing)

```
OWNER DASHBOARD
    │
    ├── Creates and manages Admin accounts
    │
ADMIN DASHBOARD (one per ISP)
    │
    ├── Manages MikroTik routers
    ├── Creates packages and vouchers
    ├── Handles customer accounts
    │
CUSTOMER PORTAL
    │
    └── Purchases packages, views usage, manages account
```

---

## 3. ACCESSING THE PLATFORM

### 3.1 System Requirements

| Requirement | Minimum |
|-------------|---------|
| Internet Browser | Google Chrome, Mozilla Firefox, Microsoft Edge (latest version) |
| Internet Connection | Any stable connection |
| Device | Computer, tablet, or smartphone |
| Screen Resolution | 1024 × 768 or higher recommended |

### 3.2 Opening the Platform

1. Open your web browser.
2. Type the platform URL into the address bar and press **Enter**.
3. The **Kingstone WiFi Billing Platform** landing page will appear.

### 3.3 Login Pages

From the home page, choose the correct login option for your role:

- Click **Owner Login** to access the Owner dashboard.
- Click **Admin Login** to access the Admin dashboard.
- Click **Client Login** (or scan a hotspot QR code) to access the Customer portal.

> **Note:** Each role has a separate, secure login page. Do not attempt to use another role's login link — it will not work.

### 3.4 Logging In

1. Enter your **Username** in the first field.
2. Enter your **Password** in the second field.
3. Click the **Login** button.

If your credentials are correct, you will be taken directly to your dashboard. If login fails, double-check your username and password. Contact your system administrator if you remain unable to log in.

### 3.5 First-Time Login

If you are logging in for the first time (or your password was reset by an administrator), you will be prompted to **change your password** before proceeding. This is a mandatory security step.

1. Enter the temporary password you were given.
2. Enter your new password in the **New Password** field.
3. Confirm the new password in the **Confirm Password** field.
4. Click **Save New Password**.

> **Note:** Your new password must be at least 8 characters long and should include a mix of letters and numbers for security.

---

## 4. OWNER USER GUIDE

### 4.1 Understanding the Owner Role

The Owner is the highest-level user on the platform. As an Owner, you:
- Register once on the platform to create your business account.
- Create and manage Administrator (ISP) accounts under your business.
- Assign MikroTik routers to administrators.
- Monitor the overall performance of the entire platform.
- Control subscription tiers and billing settings for administrators.

### 4.2 Owner Dashboard Overview

After logging in, the Owner Dashboard displays a summary of the entire platform:

| Card / Section | What It Shows |
|----------------|---------------|
| **Total Admins** | Number of ISP administrators under your account |
| **Active Admins** | How many admins are currently on active subscriptions |
| **Total Revenue** | Platform-wide payment totals |
| **MikroTik Devices** | Total number of routers registered on the system |

The left sidebar contains all main navigation sections.

### 4.3 Managing Administrator Accounts

#### 4.3.1 Viewing All Admins

1. Click **Admin Management** in the left sidebar.
2. A table appears showing all administrators — their name, username, email, phone, subscription status, and registration date.
3. Use the **Search** bar at the top to find a specific admin by name or username.

#### 4.3.2 Creating a New Admin Account

1. In the **Admin Management** section, click the **Add Admin** button.
2. Fill in the required fields:
   - **Full Name** — The administrator's full name.
   - **Business Name** — The name of their ISP business.
   - **Username** — A unique login name (letters and numbers only, no spaces).
   - **Email** — A valid email address.
   - **Phone Number** — A valid Kenyan phone number (e.g. `0712345678`).
3. Click **Create Admin**.
4. The system will create the account with a default password of `Kingstone123`. The admin must change this on first login.

> **Note:** Communicate the username and default password to the admin securely (e.g., via phone call or in person).

#### 4.3.3 Editing an Admin Account

1. Find the admin in the table.
2. Click the **Edit** (pencil) icon on their row.
3. Update the required fields.
4. Click **Save Changes**.

#### 4.3.4 Resetting an Admin's Password

1. Find the admin in the table.
2. Click **Reset Password** on their row.
3. Confirm the action in the dialog that appears.
4. The password is reset to `Kingstone123`. Inform the admin so they can log in and change it.

#### 4.3.5 Deactivating or Deleting an Admin

- To **temporarily deactivate** an admin (blocking their access without deleting data), click the **Deactivate** toggle on their row.
- To **permanently delete** an admin account, click the **Delete** (trash) icon and confirm in the dialog. This action cannot be undone.

### 4.4 Managing MikroTik Routers

1. Click **Mikrotik Management** in the sidebar.
2. You can see all routers registered on the platform and which admin they belong to.
3. To assign a router to a specific admin, click **Assign** and select the admin from the dropdown.

### 4.5 Subscription Management

1. Click **Subscriptions** in the sidebar.
2. View all admin subscriptions — their tier, start date, expiry, and status.
3. To change a subscription tier for an admin, click their row and select a new tier.
4. Trial periods can be granted or revoked from this screen.

### 4.6 Notification Templates

1. Click **Notification Templates** in the sidebar.
2. Edit the SMS and email templates used when sending automated messages to admins (e.g., password reset notices, subscription alerts).
3. Use placeholders like `{admin_name}` and `{username}` in the template text — these are replaced automatically with real values when messages are sent.

### 4.7 System Analytics

1. Click **Analytics** in the sidebar.
2. View charts showing admin growth over time, revenue trends, and router distribution.

### 4.8 Activity Logs

1. Click **Activity Logs** in the sidebar.
2. A detailed, timestamped log of all actions taken on the platform is shown.
3. Use the filters to narrow down by date or action type for security auditing.

### 4.9 Logging Out

Click your **profile icon or username** in the top right corner, then click **Logout**.

---

## 5. ADMIN (ISP) USER GUIDE

### 5.1 Understanding the Admin Role

As an Admin (ISP operator), you are responsible for:
- Connecting your MikroTik routers to the platform.
- Creating internet packages for your customers.
- Managing customer accounts and payments.
- Monitoring your network in real time.

### 5.2 Admin Dashboard Overview

The Admin Dashboard provides a real-time overview of your business:

| Card | What It Shows |
|------|---------------|
| **Total Users** | Number of registered WiFi customers |
| **Active Users** | Customers with a currently active package |
| **Today's Revenue** | MPESA payments received today |
| **Online Routers** | How many of your MikroTik routers are currently connected |

Charts below the cards display revenue trends and user growth over the past 7 days.

### 5.3 Setting Up Your MikroTik Router

Before anything else, you must add your MikroTik router to the system.

1. Click **Mikrotiks** in the left sidebar, then select **Add Router**.
2. Fill in the router details:
   - **Router Name** — A friendly name (e.g. "Main Office Hotspot").
   - **IP Address** — The public or local IP address of the router.
   - **API Port** — Typically `8728` (default MikroTik API port).
   - **Username / Password** — The router's admin API credentials.
   - **MPESA Till / Paybill Number** — The number your customers will pay to for this specific router's zone.
3. Click **Save Router**.
4. The system will attempt to connect to the router. A green **Online** badge confirms a successful connection.

> **Note:** For automated configuration, use the **Self-Install** option. This generates a script that you paste into the MikroTik terminal — it configures the hotspot settings automatically.

### 5.4 Creating Internet Packages

1. Click **Packages** in the sidebar.
2. Click **Add Package**.
3. Fill in the package details:

| Field | Description |
|-------|-------------|
| **Package Name** | A clear name customers will see (e.g. "Daily 1GB") |
| **Price (KES)** | How much the customer pays |
| **Duration** | How long the package lasts (hours or days) |
| **Package Type** | Hotspot, PPPoE, or Static |
| **Bandwidth Limit** | Upload and download speed limits (optional) |

4. Click **Save Package**.

> **Note:** Hotspot packages are the most common — customers pay via MPESA and get immediate WiFi access through the login portal. PPPoE and Static packages are for dedicated, always-on connections.

### 5.5 Managing WiFi Users (Hotspot Customers)

#### 5.5.1 Viewing Active Users

1. Click **WiFi Users** → **Manage Users** in the sidebar.
2. A live list of customers who currently have active accounts is shown.
3. Search by username or phone number using the search bar.

#### 5.5.2 Creating a User Account Manually

1. Click **WiFi Users** → **Manage Users**.
2. Click **Add User**.
3. Enter a **Username** and **Password** for the customer.
4. Optionally, enter their **Phone Number** for SMS notifications.
5. Click **Save**.
6. Share the credentials with the customer. They can log in at your hotspot portal or the Client Login page.

#### 5.5.3 Activating / Deactivating a User

1. Find the user in the list.
2. Click the **Power** (activate/deactivate) icon on their row.
3. If activating, set the duration (e.g. 24 hours, 7 days).
4. Click **Confirm**.

#### 5.5.4 Assigning a Package to a User

1. Find the user in the list.
2. Click the **Package** icon on their row.
3. Select the desired package from the dropdown.
4. Click **Assign Package**.

#### 5.5.5 Deleting a User

1. Find the user.
2. Click the **Delete** (trash) icon.
3. Confirm the deletion in the dialog. The user's account will be removed.

### 5.6 User Accounts List

The **User Accounts List** section shows all registered users with more detailed management options, including:
- Editing usernames, passwords, and phone numbers.
- Copying the customer's portal login link to share with them.
- Sending an SMS with their login credentials.

### 5.7 Voucher Management

Vouchers are one-time access codes — ideal for selling internet bundles at a counter or kiosk.

1. Click **Vouchers** in the sidebar.
2. Click **Generate Vouchers**.
3. Select the **Package** these vouchers will apply to.
4. Enter the **Quantity** of vouchers to generate.
5. Click **Generate**.
6. A list of voucher codes appears. Print or distribute them to customers.

> **Note:** Each voucher code can only be used once. When a customer enters the code at the hotspot login page, they are immediately granted access for the package duration.

### 5.8 Payment History

1. Click **Payments** in the sidebar.
2. All MPESA transactions are listed with: date, customer phone, package purchased, amount, MPESA receipt number, and status.
3. Use the **Search** bar to find a specific transaction.
4. Filter by **Status** (Completed, Pending, Failed) using the dropdown.

### 5.9 Failed & Pending Transactions

1. Click **Recycle Bin** in the sidebar to view failed, cancelled, or pending transactions.
2. If a transaction shows as **Pending** but the customer's MPESA was deducted, you can manually click **Mark as Completed** to resolve it.
3. Transactions that are clearly erroneous can be permanently deleted.

### 5.10 Reconnection Manager

1. Click **Reconnections** in the sidebar.
2. Customers whose packages have expired but have requested reconnection appear here.
3. Review and approve or reject reconnection requests.

### 5.11 Real-Time Monitor

1. Click **Real-Time Monitor** in the sidebar.
2. Live data shows currently connected devices, their IP addresses, and data usage.
3. You can disconnect individual users from this screen if needed.

### 5.12 SMS Settings

1. Click **SMS Settings** in the sidebar.
2. Configure your SMS gateway (API key and sender name).
3. Compose and send bulk SMS messages to all or selected customers.

### 5.13 Business Contact Information

1. Click **Business Contact** in the sidebar.
2. Update your business phone number and email address.
3. This information is displayed to customers on the hotspot login portal.

### 5.14 WiFi Settings

1. Click **WiFi Settings** in the sidebar.
2. Adjust technical network settings for your hotspot or PPPoE service.

### 5.15 Account Settings & Password Change

1. Click **Account Settings** in the sidebar (or your username at the top right).
2. Update your personal details or change your password.
3. For password change: enter your **Current Password**, then your **New Password** twice, and click **Save**.

### 5.16 Subscription Status

1. Click **Subscription** in the sidebar.
2. View your current subscription tier, expiry date, and payment history with the platform.
3. Contact the Owner if you need to upgrade or renew.

### 5.17 Logging Out

Click your username or profile icon at the top right of the page, then click **Logout**.

---

## 6. CUSTOMER (WIFI SUBSCRIBER) USER GUIDE

### 6.1 Understanding the Customer Role

As a WiFi customer, you use the platform to:
- Pay for internet packages via MPESA.
- Check your remaining data and time.
- View your payment history.
- Manage your account password.

### 6.2 Connecting for the First Time (Hotspot)

1. Connect your device to the WiFi network provided by your ISP.
2. Open a web browser. You will be automatically redirected to the **Hotspot Login Portal**, or you can visit the ISP's portal link directly.
3. You will see options to **Login** (existing customers) or **Pay & Connect** (new customers).

#### 6.2.1 Paying for a Package (New Customer)

1. On the portal page, browse the available packages and their prices.
2. Click **Buy** on the package you want.
3. Enter your **MPESA phone number** (e.g. `0712345678`).
4. Click **Pay Now**.
5. An **MPESA STK Push** prompt will appear on your phone — enter your MPESA PIN to confirm payment.
6. Within a few seconds, your payment is confirmed and your internet connection is activated automatically.

> **Note:** Make sure your phone has the MPESA app and sufficient balance before starting.

#### 6.2.2 Logging In (Existing Customer)

1. On the portal login page, enter your **Username** and **Password** (provided by your ISP).
2. Click **Login**.
3. Your connection will be activated and you will be taken to the confirmation page.

### 6.3 The Client Portal

The Client Portal is your personal account management area. To access it:

1. Visit the **Client Login** page (your ISP will provide the link, or it is on the main portal).
2. Enter your **Username** and **Password**.
3. Click **Login**.

#### 6.3.1 Dashboard / Overview

The main screen shows:
- Your **current package** name and price.
- **Time remaining** on your current package (e.g. "2 days, 4 hours").
- Your **data usage** if a data limit applies.
- **Connection status** (Active or Inactive).

#### 6.3.2 Billing & Payments

1. Click **Billing** in the navigation menu.
2. See a full list of your past payments with dates, amounts, and MPESA receipt numbers.
3. To buy a new package, click **Buy Package**, choose a package, and follow the MPESA payment steps.

#### 6.3.3 Account Settings

1. Click **Account Settings** in the navigation menu.
2. Update your **phone number** or **email address**.
3. To change your password: enter your **Current Password**, then your **New Password** twice, and click **Save**.

> **Note:** Keep your password secure and do not share it with others.

---

## 7. COMMON TASKS & WORKFLOWS

### 7.1 Workflow: Customer Purchases a Package (End-to-End)

```
Customer connects to WiFi hotspot
    ↓
Hotspot portal loads in browser
    ↓
Customer selects a package and enters phone number
    ↓
MPESA STK Push sent to customer's phone
    ↓
Customer enters MPESA PIN
    ↓
System receives payment confirmation
    ↓
Package activated automatically on MikroTik router
    ↓
Customer has working internet access
```

### 7.2 Workflow: Admin Adds a New Router

```
Admin receives a new MikroTik router
    ↓
Admin logs into the Admin Dashboard
    ↓
Goes to Mikrotiks → Add Router
    ↓
Enters router IP, API credentials, and MPESA payment number
    ↓
System connects to router and confirms status "Online"
    ↓
Admin creates packages for that router's zone
    ↓
Customers can now use the portal and pay via MPESA
```

### 7.3 Workflow: Owner Creates a New ISP Admin

```
New ISP contacts the Owner
    ↓
Owner logs into Owner Dashboard
    ↓
Goes to Admin Management → Add Admin
    ↓
Fills in ISP details and creates account
    ↓
Owner communicates the username and default password to the ISP
    ↓
ISP logs in, is prompted to change password
    ↓
ISP sets up their routers and packages
```

---

## 8. TROUBLESHOOTING

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Cannot log in | Wrong username or password | Double-check credentials. Ask your administrator to reset your password. |
| MPESA payment sent but no internet | Payment confirmation delayed | Wait 1–2 minutes and refresh the portal. If still not connected, contact your ISP with the MPESA receipt number. |
| Router shows "Offline" in dashboard | Router lost connection | Check that the router is powered on and internet is available at its location. Verify the router's IP address has not changed. |
| Voucher code not working | Voucher already used or wrong code | Confirm the code is entered correctly. Check the vouchers list — if it shows "Used", issue a new voucher. |
| SMS not received by customer | Wrong phone number or SMS gateway issue | Verify the customer's phone number in their account. Check the SMS settings and gateway balance. |
| "Failed" payments appear | MPESA timeout or customer cancelled | Check the Payments section. If the customer's balance was deducted, manually mark the transaction as Completed. |
| Page not loading | Browser cache issue | Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac) to hard-refresh the browser. |
| Cannot create a user account | Required fields missing | Ensure all required fields (username, password) are filled in. Username must not contain spaces or special characters. |

---

## 9. SECURITY GUIDELINES

### 9.1 Password Security

- Never use simple passwords like `1234`, `password`, or your name.
- Change your password immediately after your first login.
- Do not share your password with anyone, including colleagues.
- Change passwords regularly — at least every 3 months.

### 9.2 Protecting Your Account

- Always **log out** when you finish using the platform, especially on shared computers.
- Do not access the platform on unsecured public WiFi networks.
- If you suspect your account has been accessed without your knowledge, change your password immediately and inform your administrator.

### 9.3 Admin-Specific Security

- Review the **Activity Logs** regularly for any unusual actions.
- Remove or deactivate admin accounts for staff who have left the organisation immediately.
- Keep your MikroTik router API credentials private — do not share them.
- Ensure your router's admin password is strong and different from the platform password.

### 9.4 Owner-Specific Security

- Only create admin accounts for verified, trusted ISP partners.
- Regularly audit the admin list and remove inactive or unauthorised accounts.
- Review system-wide activity logs monthly for security anomalies.

---

## 10. GLOSSARY OF TERMS

| Term | Definition |
|------|-----------|
| **Admin** | An Internet Service Provider (ISP) who has an account on the Kingstone platform to manage their own routers and customers. |
| **API** | Application Programming Interface — the method the platform uses to communicate with MikroTik routers remotely. |
| **Bandwidth** | The maximum speed of an internet connection, measured in Mbps (Megabits per second). |
| **Captive Portal** | The web page that appears when a customer connects to a hotspot, prompting them to log in or pay. |
| **Hotspot** | A shared WiFi zone where customers connect wirelessly and authenticate through a portal. |
| **MPESA** | A mobile money payment service by Safaricom used to pay for internet packages. |
| **MikroTik** | A brand of networking hardware (routers) commonly used by ISPs in Kenya to manage internet access. |
| **Owner** | The top-level user on the platform — the business that operates the Kingstone system and manages all ISP admins. |
| **Package** | An internet service plan with a specific price, speed, and duration (e.g. "Daily 500MB for KES 50"). |
| **Paybill** | An MPESA payment option where customers enter a business number and account number to pay. |
| **PPPoE** | Point-to-Point Protocol over Ethernet — a method for delivering dedicated broadband internet to a specific customer. |
| **RPC** | Remote Procedure Call — internal system mechanism used to run operations on the database. |
| **STK Push** | MPESA's "SIM Toolkit Push" — a payment prompt that appears directly on a customer's phone screen. |
| **Static IP** | A fixed, permanent IP address assigned to a specific customer's connection. |
| **Subscription** | The fee an Admin pays to the Owner to use the Kingstone platform. |
| **Till Number** | An MPESA payment option where customers pay directly to a registered till number (common for retail/hotspot payments). |
| **Voucher** | A printed or digital access code that gives a customer internet access for a set duration without requiring a personal account. |
| **WiFi User** | A customer registered on the platform with a username and password for accessing the internet. |

---

*End of User Training Manual*

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Software Development Team | Initial release |

---

*Kingstone WiFi Billing Platform — Empowering Internet Service Providers across Kenya*
