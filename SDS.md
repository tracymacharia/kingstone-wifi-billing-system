# SOFTWARE DESIGN SPECIFICATION (SDS)
# Kingstone WiFi Billing System

**Document Version:** 1.0.0  
**Date:** March 31, 2026  
**Prepared By:** Development Team  
**Status:** Production Ready  

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architectural Design](#3-architectural-design)
4. [Database Design](#4-database-design)
5. [Interface Design](#5-interface-design)
6. [Component Design](#6-component-design)
7. [Security Design](#7-security-design)
8. [Integration Design](#8-integration-design)
9. [Deployment Design](#9-deployment-design)
10. [Testing Strategy](#10-testing-strategy)
11. [Appendices](#11-appendices)

---

## 1. INTRODUCTION

### 1.1 Purpose

This Software Design Specification (SDS) document provides a comprehensive technical description of the Kingstone WiFi Billing System. It serves as the authoritative reference for developers, testers, project managers, and stakeholders involved in the development, deployment, and maintenance of the system.

### 1.2 Scope

The Kingstone WiFi Billing System is a comprehensive hotspot management and billing platform designed for Internet Service Providers (ISPs) and WiFi hotspot operators in Kenya. The system enables:

- Automated user authentication and access control
- M-Pesa payment integration for seamless transactions
- Real-time session management and monitoring
- Multi-tenant administration with role-based access
- Mikrotik router integration for network control
- SMS notifications and OTP verification

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| **SDS** | Software Design Specification |
| **ISP** | Internet Service Provider |
| **M-Pesa** | Mobile money transfer service by Safaricom |
| **STK Push** | Secure Transaction Key Push (M-Pesa payment method) |
| **Mikrotik** | Network router hardware and RouterOS software |
| **RLS** | Row Level Security (PostgreSQL feature) |
| **RPC** | Remote Procedure Call |
| **CORS** | Cross-Origin Resource Sharing |
| **JWT** | JSON Web Token |
| **PPPoE** | Point-to-Point Protocol over Ethernet |
| **SMS** | Short Message Service |
| **OTP** | One-Time Password |
| **KES** | Kenyan Shilling |
| **API** | Application Programming Interface |

### 1.4 References

1. Supabase Documentation - https://supabase.com/docs
2. M-Pesa Daraja API - https://developer.safaricom.co.ke
3. Mikrotik RouterOS API - https://help.mikrotik.com/docs/display/ROS/REST+API
4. React Documentation - https://react.dev
5. PostgreSQL Documentation - https://postgresql.org/docs

### 1.5 Document Overview

This SDS describes the complete system architecture, database schema, component interactions, security measures, and deployment strategies. It is intended to be used throughout the software development lifecycle.

---

## 2. SYSTEM OVERVIEW

### 2.1 System Context

The Kingstone WiFi Billing System operates within the following ecosystem:

```
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ENTITIES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │   End Users  │  │  Administrators │                         │
│  │  (WiFi Users)│  │   (Operators) │                           │
│  └──────┬───────┘  └──────┬───────┘                           │
│         │                  │                  │                 │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │  M-Pesa API  │  │   Mikrotik   │  │  SMS Gateway │         │
│  │  (Safaricom) │  │   Routers    │  │  (Africa's   │         │
│  │              │  │              │  │   Talking)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   KINGSTONE      │
                    │   WiFi Billing   │
                    │   System         │
                    └──────────────────┘
```

### 2.2 System Functions

#### 2.2.1 User Management
- Self-registration via payment portal
- Automatic account creation upon payment
- Voucher-based authentication
- Session management and timeout
- Account suspension and reactivation

#### 2.2.2 Payment Processing
- M-Pesa STK Push integration
- Payment verification (triple-layer)
- Transaction logging and audit
- Refund processing
- Revenue tracking and reporting

#### 2.2.3 Package Management
- Configurable internet packages
- Time-based and data-based plans
- Dynamic pricing
- Promotional offers
- Package activation and renewal

#### 2.2.4 Router Management
- Mikrotik hotspot configuration
- User synchronization
- Bandwidth control
- Session monitoring
- Remote router management

#### 2.2.5 Administrative Functions
- Admin dashboard and management
- Package and user management
- Payment tracking and reporting
- Router configuration and monitoring
- System analytics and audit logs

### 2.3 User Classes and Characteristics

| User Class | Characteristics | Permissions |
|------------|----------------|-------------|
| **WiFi User** | General public, mobile devices | Purchase packages, view usage, manage sessions |
| **Admin** | Business operators, hotspot owners | Full system access: manage packages, users, routers, payments, view analytics |
| **System** | Automated processes | Background jobs, payment processing, notifications |

### 2.4 Operating Environment

#### 2.4.1 Frontend
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** React Context API
- **Build Tool:** Vite
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 versions)

#### 2.4.2 Backend
- **Platform:** Supabase (Serverless)
- **Database:** PostgreSQL 15+
- **Edge Functions:** Deno runtime
- **Authentication:** Custom session-based with JWT
- **API:** RESTful with RPC functions

#### 2.4.3 Infrastructure
- **Hosting:** Supabase Cloud / VPS
- **CDN:** Supabase Edge Network
- **Routers:** Mikrotik RouterOS 7+
- **Payment Gateway:** M-Pesa Daraja API
- **SMS Gateway:** Africa's Talking

### 2.5 Design Constraints

1. **Network Dependency:** Requires stable internet connection for M-Pesa and API calls
2. **Router Compatibility:** Limited to Mikrotik RouterOS devices
3. **Payment Region:** M-Pesa integration limited to Kenya and supported regions
4. **Session Storage:** Browser sessionStorage for tokens (no persistent cookies)
5. **CORS Policy:** Restricted to authorized domains only

### 2.6 Assumptions and Dependencies

1. Users have M-Pesa registered phone numbers
2. Mikrotik routers are properly configured and accessible
3. M-Pesa Daraja API credentials are valid and active
4. SMS gateway credentials are configured
5. Database migrations are applied in sequence
6. Environment variables are properly configured

---

## 3. ARCHITECTURAL DESIGN

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Frontend (config/src)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │   Admin  │  │  Payment │  │   User   │              │   │
│  │  │Dashboard │  │  Portal  │  │  Portal  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   API Gateway    │
                    │   (Supabase)     │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Edge Functions                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  M-Pesa  │  │   SMS    │  │   Auth   │              │   │
│  │  │  STK     │  │  Gateway │  │  Validate│              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Data Access    │
                    │   (RLS Policies) │
                    └────────┬─────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           PostgreSQL Database (Supabase)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Admin   │  │ Payment  │ │  User    │              │   │
│  │  │  Tables  │  │  Tables  │ │  Tables  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 18+ | UI rendering and state management |
| **Language** | TypeScript | 5+ | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 3+ | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Latest | Pre-built accessible components |
| **Backend Platform** | Supabase | Latest | BaaS with PostgreSQL |
| **Database** | PostgreSQL | 15+ | Relational database with RLS |
| **Edge Functions** | Deno | 1.40+ | Serverless function runtime |
| **Router OS** | Mikrotik RouterOS | 7+ | Network access control |
| **Payment API** | M-Pesa Daraja | Latest | Payment processing |
| **SMS API** | Africa's Talking | Latest | SMS notifications |

### 3.3 Architecture Patterns

#### 3.3.1 Model-View-Controller (MVC)
- **Model:** Database tables with RLS policies
- **View:** React components with TypeScript
- **Controller:** Edge functions and RPC procedures

#### 3.3.2 Repository Pattern
- Database access abstracted through Supabase client
- Consistent data access patterns across components
- Centralized error handling and logging

#### 3.3.3 Event-Driven Architecture
- M-Pesa callbacks trigger payment updates
- SMS events logged and tracked
- Session events monitored for security

### 3.4 System Flow Diagrams

#### 3.4.1 User Registration and Payment Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │Frontend │    │  Edge   │    │  M-Pesa │    │Database │
│  Device │    │ (React) │    │Function │    │   API   │    │         │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │              │
     │ 1. Connect   │              │              │              │
     │    to WiFi   │              │              │              │
     │─────────────▶│              │              │              │
     │              │              │              │              │
     │ 2. Redirect  │              │              │              │
     │    to Portal │              │              │              │
     │◀─────────────│              │              │              │
     │              │              │              │              │
     │ 3. Select    │              │              │              │
     │    Package   │              │              │              │
     │─────────────▶│              │              │              │
     │              │              │              │              │
     │ 4. Enter     │              │              │              │
     │    Phone     │              │              │              │
     │─────────────▶│              │              │              │
     │              │              │              │              │
     │              │ 5. STK Push  │              │              │
     │              │    Request   │              │              │
     │              │─────────────▶│              │              │
     │              │              │              │              │
     │              │              │ 6. STK Push  │              │
     │              │              │    to Phone  │              │
     │              │              │─────────────▶│              │
     │              │              │              │              │
     │ 7. Enter PIN │              │              │              │
     │◀───────────────────────────────────────────│              │
     │              │              │              │              │
     │              │              │ 8. Payment   │              │
     │              │              │    Processed │              │
     │              │              │◀─────────────│              │
     │              │              │              │              │
     │              │              │ 9. Callback  │              │
     │              │              │◀─────────────│              │
     │              │              │              │              │
     │              │              │ 10. Update   │              │
     │              │              │     Payment  │              │
     │              │              │────────────────────────────▶│
     │              │              │              │              │
     │              │ 11. Poll    │              │              │
     │              │     Status   │              │              │
     │              │──────────────────────────────────────────▶│
     │              │              │              │              │
     │ 12. Success  │              │              │              │
     │     Page     │              │              │              │
     │◀─────────────│              │              │              │
     │              │              │              │              │
```

#### 3.4.2 Authentication Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Admin  │    │Frontend │    │Supabase │    │Database │
│  User   │    │ (React) │    │  Auth   │    │         │
└────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘
     │              │              │              │
     │ 1. Enter     │              │              │
     │    Credentials              │              │
     │─────────────▶│              │              │
     │              │              │              │
     │              │ 2. Query     │              │
     │              │    system_  │              │
     │              │    credentials             │
     │              │───────────────────────────▶│
     │              │              │              │
     │              │              │ 3. Verify    │
     │              │              │    Password  │
     │              │              │─────────────▶│
     │              │              │              │
     │              │              │ 4. Hash Match│
     │              │              │◀─────────────│
     │              │              │              │
     │              │ 5. Create    │              │
     │              │    Session   │              │
     │              │◀─────────────│              │
     │              │              │              │
     │ 6. Store     │              │              │
     │    Token     │              │              │
     │◀─────────────│              │              │
     │              │              │              │
     │ 7. Redirect  │              │              │
     │    to Dashboard            │              │
     │◀─────────────│              │              │
     │              │              │              │
```

---

## 4. DATABASE DESIGN

### 4.1 Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE ER DIAGRAM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │system_       │1                                            │
│  │credentials   │├────────────────────────┐                    │
│  ├──────────────┤                         │                    │
│  │id (PK)       │                         │                    │
│  │username      │                         │                    │
│  │password_hash │                         │                    │
│  │role          │                         │                    │
│  │admin_id (FK) │─────┐                   │                    │
│  └──────────────┘     │                   │                    │
│                       │                   │                    │
│  ┌──────────────┐     │1                  │N                   │
│  │admins        │1────┤                   │              ┌──────────────┐
│  ├──────────────┤     │              ┌──────────────┐    │user_sessions │
│  │id (PK)       │     │              │payments      │    ├──────────────┤
│  │username      │     │              ├──────────────┤    │id (PK)       │
│  │email         │     │              │id (PK)       │    │session_token │
│  │phone         │     │              │admin_id (FK) │    │admin_id (FK) │
│  │business_name │     │              │user_phone    │    │role          │
│  └──────┬───────┘     │              │amount        │    │expires_at    │
│         │             │              │status        │    └──────────────┘
│         │1            │              │mpesa_receipt │
│         │             │              └──────────────┘
│         │N                                                             
│         │             │              ┌──────────────┐                   
│  ┌──────▼────────┐    │              │mikrotiks     │                   
│  │packages       │    │1             ├──────────────┤                   
│  ├───────────────┤    └─────────────▶│id (PK)       │                   
│  │id (PK)        │                   │admin_id (FK) │                   
│  │admin_id (FK)  │                   │name          │                   
│  │name           │                   │ip_address    │                   
│  │type           │                   │api_port      │                   
│  │duration       │                   └──────┬───────┘                   
│  │price          │                          │                           
│  └───────────────┘                          │N                          
│                                              │                           
│  ┌──────────────┐                           │                           
│  │wifi_users    │1──────────────────────────┘                           
│  ├──────────────┤                                                       
│  │id (PK)       │                                                       
│  │admin_id (FK) │                                                       
│  │username      │                                                       
│  │password      │                                                       
│  │package_id(FK)│                                                       
│  │expires_at    │                                                       
│  └──────────────┘                                                       
│                                                                         
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Table Specifications

#### 4.2.1 system_credentials

Stores admin authentication credentials with password hashing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| username | TEXT | NOT NULL, UNIQUE | Admin username |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | TEXT | NOT NULL, DEFAULT 'admin' | User role (admin) |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | Linked admin record |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Triggers:**
- `trigger_hash_password_insert`: Hashes password on INSERT
- `trigger_hash_password_update`: Hashes password on UPDATE

**RLS Policies:**
- SELECT: Authenticated users only
- INSERT: System only
- UPDATE: Admin or self

#### 4.2.2 admins

Stores admin profile and business information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| username | TEXT | NOT NULL, UNIQUE | Admin username |
| email | TEXT | UNIQUE | Email address |
| phone | TEXT | UNIQUE | Phone number |
| business_name | TEXT | | Business name |
| is_trial | BOOLEAN | DEFAULT false | Trial account flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**RLS Policies:**
- SELECT: Admin or self
- INSERT: Public (registration)
- UPDATE: Admin or self

#### 4.2.3 user_sessions

Manages active user sessions for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| session_token | TEXT | NOT NULL, UNIQUE | JWT session token |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | Session admin |
| role | TEXT | NOT NULL | User role |
| expires_at | TIMESTAMPTZ | NOT NULL | Session expiration |
| is_active | BOOLEAN | DEFAULT true | Session status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**RLS Policies:**
- SELECT: Authenticated users
- INSERT: System only
- UPDATE: System only
- DELETE: System or expired

#### 4.2.4 mikrotiks

Stores Mikrotik router configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | Router admin |
| name | TEXT | NOT NULL | Router name |
| router_id | TEXT | | Router identifier |
| ip_address | TEXT | NOT NULL | Router IP address |
| api_port | INTEGER | DEFAULT 8728 | API port |
| api_user | TEXT | | API username |
| api_password | TEXT | | API password |
| mpesa_type | TEXT | DEFAULT 'paybill' | Payment type |
| mpesa_number | TEXT | | M-Pesa number |
| is_active | BOOLEAN | DEFAULT true | Router status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**RLS Policies:**
- SELECT: Admin
- INSERT: Admin
- UPDATE: Admin
- DELETE: Admin

#### 4.2.5 packages

Defines internet package offerings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | Package admin |
| name | TEXT | NOT NULL | Package name |
| type | TEXT | NOT NULL | Package type (time/data) |
| duration | INTEGER | NOT NULL | Duration in minutes |
| price | DECIMAL(10,2) | NOT NULL | Price in KES |
| is_active | BOOLEAN | DEFAULT true | Package status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**RLS Policies:**
- SELECT: Public
- INSERT: Admin
- UPDATE: Admin
- DELETE: Admin

#### 4.2.6 payments

Records all payment transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | Payment admin |
| mikrotik_id | UUID | FOREIGN KEY REFERENCES mikrotiks(id) | Associated router |
| user_phone | TEXT | NOT NULL | User phone number |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| status | TEXT | DEFAULT 'pending' | Payment status |
| transaction_id | TEXT | UNIQUE | M-Pesa transaction ID |
| mpesa_receipt_number | TEXT | | M-Pesa receipt |
| package_name | TEXT | | Purchased package |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_payments_transaction_id`: For M-Pesa callback lookups
- `idx_payments_mikrotik`: For router-based queries

**RLS Policies:**
- SELECT: Admin
- INSERT: System only
- UPDATE: System only

#### 4.2.7 wifi_users

Stores WiFi user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| admin_id | UUID | FOREIGN KEY REFERENCES admins(id) | User admin |
| username | TEXT | NOT NULL, UNIQUE | Username (phone) |
| password | TEXT | NOT NULL | Password |
| package_id | UUID | FOREIGN KEY REFERENCES packages(id) | Active package |
| expires_at | TIMESTAMPTZ | | Account expiration |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**RLS Policies:**
- SELECT: Admin
- INSERT: System only
- UPDATE: System only
- DELETE: System only

### 4.3 Database Functions (RPC)

#### 4.3.1 create_admin_account

Creates a new admin account with credentials.

```sql
CREATE FUNCTION create_admin_account(
  p_username TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_password TEXT,
  p_business_name TEXT DEFAULT NULL
) RETURNS UUID;
```

**Parameters:**
- `p_username`: Admin username
- `p_email`: Email address
- `p_phone`: Phone number
- `p_password`: Plain text password (hashed internally)
- `p_business_name`: Optional business name

**Returns:** UUID of created admin record

#### 4.3.2 authenticate_wifi_user

Authenticates WiFi user credentials.

```sql
CREATE FUNCTION authenticate_wifi_user(
  p_username TEXT,
  p_password TEXT
) RETURNS TABLE (
  is_valid BOOLEAN,
  user_id UUID,
  expires_at TIMESTAMPTZ
);
```

**Parameters:**
- `p_username`: User's username
- `p_password`: User's password

**Returns:** Validation status and user details

#### 4.3.3 validate_session

Validates admin session token.

```sql
CREATE FUNCTION validate_session(
  p_session_token TEXT
) RETURNS UUID;
```

**Parameters:**
- `p_session_token`: JWT session token

**Returns:** admin_id if valid, NULL otherwise

#### 4.3.4 get_client_portal_data_by_username

Retrieves client portal data.

```sql
CREATE FUNCTION get_client_portal_data_by_username(
  p_username TEXT
) RETURNS TABLE (
  user_id UUID,
  package_name TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
);
```

### 4.4 Data Integrity Constraints

#### 4.4.1 Unique Constraints
- `system_credentials.username`: Prevents duplicate usernames
- `admins.email`: Prevents duplicate email addresses
- `admins.phone`: Prevents duplicate phone numbers
- `payments.transaction_id`: Prevents duplicate transactions
- `wifi_users.username`: Prevents duplicate user accounts

#### 4.4.2 Foreign Key Constraints
- All `admin_id` references cascade on DELETE
- All `package_id` references restrict DELETE
- All `mikrotik_id` references set NULL on DELETE

#### 4.4.3 Check Constraints
- `packages.price >= 0`: Prevents negative pricing
- `packages.duration > 0`: Ensures valid duration
- `payments.amount > 0`: Validates payment amounts

---

## 5. INTERFACE DESIGN

### 5.1 User Interfaces

#### 5.1.1 Admin Dashboard

**URL:** `/admin/dashboard`

**Purpose:** Primary interface for admin users to manage WiFi billing operations.

**Components:**
- Sidebar navigation
- Revenue analytics graphs
- User management tables
- Package configuration forms
- Router status indicators
- Payment history logs

**Key Features:**
- Real-time dashboard metrics
- CRUD operations for all entities
- Export functionality (CSV/PDF)
- Responsive design for mobile/tablet

#### 5.1.2 Payment Portal

**URL:** `/portal/{admin_username}`

**Purpose:** Customer-facing interface for purchasing internet packages.

**Components:**
- Package selection cards
- M-Pesa payment form
- Phone number input with validation
- Payment status indicator
- Success/failure modals

**Key Features:**
- Dynamic package loading
- Real-time STK Push status
- Automatic session creation
- SMS credential delivery

#### 5.1.3 User Portal

**URL:** `/user/login`

**Purpose:** WiFi user self-service portal.

**Components:**
- Login form
- Session status display
- Usage statistics
- Package renewal options
- Logout functionality

**Key Features:**
- Session timeout warnings
- Usage history graphs
- One-click renewal
- Password change capability

#### 5.1.4 Admin Analytics Dashboard

**URL:** `/admin/analytics`

**Purpose:** System-wide analytics and reporting for administrators.

**Components:**
- Revenue analytics and charts
- User growth metrics
- Payment history reports
- Router performance monitoring
- Export functionality (CSV/PDF)

**Key Features:**
- Real-time revenue tracking
- Historical data analysis
- Multi-router comparison
- Custom date range selection

### 5.2 API Interfaces

#### 5.2.1 Supabase Client API

**Base URL:** `https://{project-ref}.supabase.co/rest/v1`

**Authentication:** Bearer token (anon key or service role)

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/v1/admins` | List admins |
| POST | `/rest/v1/admins` | Create admin |
| GET | `/rest/v1/packages` | List packages |
| POST | `/rest/v1/packages` | Create package |
| GET | `/rest/v1/payments` | List payments |
| POST | `/rest/v1/wifi_users` | Create user |
| POST | `/rest/v1/rpc/validate_session` | Validate session |
| POST | `/rest/v1/rpc/create_admin_account` | Create admin |

#### 5.2.2 Edge Functions API

**Base URL:** `https://{project-ref}.supabase.co/functions/v1`

**Authentication:** JWT session token in headers

**Endpoints:**

| Function | Method | Description |
|----------|--------|-------------|
| `/mpesa-stk-push` | POST | Initiate M-Pesa payment |
| `/mpesa-callback` | POST | Receive M-Pesa callback |
| `/check-stk-status` | POST | Query STK Push status |
| `/send-sms` | POST | Send SMS notification |
| `/send-otp-email` | POST | Send OTP email |

**Request Format:**
```json
{
  "phone": "0708374149",
  "amount": 100,
  "account_number": "PKG001"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "ws_CO_123456789",
    "checkout_request_id": "ws_123456",
    "message": "STK push sent"
  }
}
```

#### 5.2.3 M-Pesa Daraja API

**Base URL:** `https://sandbox.safaricom.co.ke` (Sandbox)  
**Base URL:** `https://api.safaricom.co.ke` (Production)

**Authentication:** OAuth 2.0 Bearer Token

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/oauth/v1/generate` | Generate access token |
| POST | `/mpesa/stkpush/v1/processrequest` | STK Push |
| POST | `/mpesa/stkpushquery/v1/query` | Query STK status |
| POST | `/mpesa/c2b/v1/registerurl` | Register callback |

### 5.3 Hardware Interfaces

#### 5.3.1 Mikrotik Router Integration

**Protocol:** REST API over HTTPS

**Port:** 8728 (HTTP), 8729 (HTTPS)

**Authentication:** Basic Auth (username/password)

**Operations:**

| Operation | API Endpoint | Description |
|-----------|-------------|-------------|
| Create User | `/rest/ip/hotspot/user` | Add hotspot user |
| Remove User | `/rest/ip/hotspot/user/:id` | Remove hotspot user |
| List Users | `/rest/ip/hotspot/user` | List all users |
| Create Profile | `/rest/ip/hotspot/user/profile` | Create rate profile |
| List Profiles | `/rest/ip/hotspot/user/profile` | List profiles |

**Request Example:**
```http
POST /rest/ip/hotspot/user HTTP/1.1
Host: 192.168.88.1:8729
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Content-Type: application/json

{
  "name": "0708374149",
  "password": "TXN123456",
  "profile": "default"
}
```

### 5.4 Communication Interfaces

#### 5.4.1 SMS Gateway (Africa's Talking)

**Base URL:** `https://api.africastalking.com`

**Authentication:** API Key in headers

**Endpoint:** `/messaging`

**Request Format:**
```json
{
  "to": "+254708374149",
  "message": "Your WiFi credentials: Username: 0708374149, Password: TXN123456"
}
```

**Response Format:**
```json
{
  "status": "success",
  "messageId": "SMS_123456",
  "recipientCount": 1
}
```

#### 5.4.2 Email Service (SMTP)

**Protocol:** SMTP with TLS

**Port:** 587 (TLS), 465 (SSL)

**Authentication:** Username/Password

**Features:**
- OTP email delivery
- Password reset emails
- Account notifications

---

## 6. COMPONENT DESIGN

### 6.1 Frontend Components

#### 6.1.1 App Component (App.tsx)

**Purpose:** Root component with routing configuration.

**Props:** None

**State:**
- `isAdminAuthenticated`: boolean
- `adminId`: UUID | null
- `role`: string | null

**Dependencies:**
- React Router DOM
- AuthContext
- AdminSidebar component

**Code Location:** `config/src/App.tsx`

#### 6.1.2 AuthContext

**Purpose:** Manages authentication state and session validation.

**Methods:**
- `login(username, password)`: Authenticate admin
- `logout()`: Clear session and redirect
- `validateSession()`: Check token validity
- `refreshToken()`: Refresh expired token

**State:**
- `sessionToken`: string | null
- `adminId`: UUID | null
- `role`: string | null

**Code Location:** `config/src/contexts/AuthContext.tsx`

#### 6.1.3 AdminDashboard

**Purpose:** Main admin interface with analytics and navigation.

**Props:** None

**Components:**
- AdminSidebar
- GraphDashboard
- QuickStats cards

**Code Location:** `config/src/pages/AdminDashboard.tsx`

#### 6.1.4 PaymentPortal

**Purpose:** Customer-facing payment interface.

**Props:**
- `adminUsername`: string (from URL parameter)

**State:**
- `selectedPackage`: Package | null
- `phoneNumber`: string
- `paymentStatus`: 'pending' | 'processing' | 'completed' | 'failed'
- `transactionId`: string | null

**Methods:**
- `initiateStkPush()`: Start payment flow
- `pollPaymentStatus()`: Check payment status
- `verifyPayment()`: Manual verification

**Code Location:** `config/src/pages/PaymentPortal.tsx`

#### 6.1.5 PackageCards

**Purpose:** Display available packages in grid layout.

**Props:**
- `packages`: Package[]
- `onSelectPackage`: (pkg: Package) => void

**Code Location:** `config/src/components/shared/PackageCards.tsx`

#### 6.1.6 MikrotikManager

**Purpose:** Manage Mikrotik router configurations.

**Props:** None

**State:**
- `routers`: Mikrotik[]
- `isLoading`: boolean
- `error`: string | null

**Methods:**
- `addRouter()`: Create new router
- `updateRouter()`: Modify router config
- `deleteRouter()`: Remove router
- `testConnection()`: Verify router connectivity

**Code Location:** `config/src/pages/AdminMikrotikMgr.tsx`

### 6.2 Backend Components (Edge Functions)

#### 6.2.1 mpesa-stk-push

**Purpose:** Initiate M-Pesa STK Push payment.

**Location:** `supabase/functions/mpesa-stk-push/index.ts`

**Input:**
```typescript
{
  phone: string;
  amount: number;
  account_number: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  data: {
    transaction_id: string;
    checkout_request_id: string;
  };
}
```

**Dependencies:**
- M-Pesa OAuth token
- Mikrotik configuration
- Payments table

**Error Handling:**
- Invalid phone format
- Insufficient M-Pesa balance
- Network timeouts
- API rate limits

#### 6.2.2 mpesa-callback

**Purpose:** Receive and process M-Pesa payment callbacks.

**Location:** `supabase/functions/mpesa-callback/index.ts`

**Input:** M-Pesa callback payload

**Processing:**
1. Validate callback authenticity
2. Parse transaction result
3. Update payment status
4. Create WiFi user account
5. Log transaction

**Output:**
```typescript
{
  ResultCode: "0",
  ResultDesc: "Accepted"
}
```

**Security:**
- Idempotency check (prevent duplicate processing)
- Signature verification
- CheckoutRequestID validation

#### 6.2.3 check-stk-status

**Purpose:** Query M-Pesa for STK Push status.

**Location:** `supabase/functions/check-stk-status/index.ts`

**Input:**
```typescript
{
  transaction_id: string;
  shortcode: string;
}
```

**Output:**
```typescript
{
  status: "completed" | "pending" | "failed",
  receipt_number?: string
}
```

**Use Case:** Fallback when callback fails or is delayed

#### 6.2.4 send-sms

**Purpose:** Send SMS notifications via Africa's Talking.

**Location:** `supabase/functions/send-sms/index.ts`

**Input:**
```typescript
{
  recipient: string;
  message: string;
}
```

**Output:**
```typescript
{
  success: boolean,
  messageId: string
}
```

### 6.3 Utility Components

#### 6.3.1 Validators (validators.ts)

**Location:** `config/src/lib/validators.ts`

**Functions:**
- `validateEmail(email: string): boolean`
- `validatePhone(phone: string): boolean`
- `validateAmount(amount: number): boolean`
- `sanitizeInput(input: string): string`

#### 6.3.2 M-Pesa Utilities (mpesa.ts)

**Location:** `config/src/lib/mpesa.ts`

**Functions:**
- `formatPhoneNumber(phone: string): string`
- `generateAccountNumber(): string`
- `parseCallback(xml: string): object`

#### 6.3.3 Session Storage (session.ts)

**Location:** `config/src/lib/session.ts`

**Functions:**
- `setSessionToken(token: string): void`
- `getSessionToken(): string | null`
- `clearSession(): void`
- `isTokenExpired(token: string): boolean`

---

## 7. SECURITY DESIGN

### 7.1 Authentication Security

#### 7.1.1 Password Management

**Hashing Algorithm:** bcrypt  
**Cost Factor:** 10  
**Storage:** password_hash column (never plain text)

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION hash_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 7.1.2 Session Management

**Token Format:** JWT (JSON Web Token)  
**Expiration:** 24 hours  
**Storage:** sessionStorage (client-side)  
**Validation:** RPC function `validate_session`

**Token Structure:**
```json
{
  "admin_id": "uuid",
  "role": "admin",
  "exp": 1234567890,
  "iat": 1234564290
}
```

#### 7.1.3 Rate Limiting

**Login Attempts:** Maximum 5 per 15 minutes  
**Lockout Duration:** 30 minutes  
**Tracking:** `login_attempts` table

**Implementation:**
```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Authorization Security

#### 7.2.1 Row Level Security (RLS)

All tables implement RLS policies to restrict data access.

**Example Policy:**
```sql
CREATE POLICY "Admins can view own data"
ON payments
FOR SELECT
USING (
  auth.uid() IN (
    SELECT admin_id FROM admins WHERE id = auth.uid()
  )
);
```

#### 7.2.2 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **WiFi User** | View own sessions, purchase packages |
| **Admin** | Full system access: manage routers, users, packages, payments, view analytics |

#### 7.2.3 Function Security

All RPC functions use `SECURITY DEFINER` to execute with elevated privileges.

**Example:**
```sql
CREATE FUNCTION create_admin_account(...)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- Executes with definer's privileges
AS $$
...
$$;
```

### 7.3 Data Protection

#### 7.3.1 Encryption at Rest

- **Database:** Supabase-managed encryption
- **Passwords:** bcrypt hashing
- **API Keys:** Environment variables (never in code)

#### 7.3.2 Encryption in Transit

- **HTTPS/TLS:** All API communications
- **WSS:** WebSocket connections for real-time updates
- **Certificate Validation:** Strict SSL verification

#### 7.3.3 Input Validation

**Client-Side:**
```typescript
function validatePaymentInput(input: PaymentInput): boolean {
  if (!isValidPhone(input.phone)) return false;
  if (input.amount <= 0) return false;
  if (input.amount > 100000) return false;
  return true;
}
```

**Server-Side:**
```typescript
// Edge function validation
if (!phone || !amount) {
  return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
}
```

### 7.4 API Security

#### 7.4.1 CORS Policy

**Allowed Origins:**
- `http://localhost:5173` (development)
- `https://billing.kingstone.com` (production)

**Headers:**
- `Content-Type`
- `Authorization`
- `X-Session-Token`

#### 7.4.2 M-Pesa Callback Security

**Authentication:**
1. Verify callback source IP (Safaricom IPs)
2. Validate CheckoutRequestID format
3. Check transaction_id uniqueness (idempotency)
4. Verify signature (if available)

**Implementation:**
```typescript
// Idempotency check
const existing = await supabase
  .from('payments')
  .select('id')
  .eq('transaction_id', transactionId)
  .single();

if (existing && existing.status === 'completed') {
  return; // Already processed
}
```

#### 7.4.3 API Key Management

**Storage:** Supabase Secrets (never in code)

**Deployment:**
```bash
supabase secrets set MPESA_CONSUMER_KEY="your-key"
supabase secrets set MPESA_CONSUMER_SECRET="your-secret"
```

**Usage in Edge Functions:**
```typescript
const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
```

### 7.5 Audit Logging

#### 7.5.1 Logged Events

- Admin login/logout
- Payment transactions
- User creation/deletion
- Package modifications
- Router configuration changes
- SMS sent

#### 7.5.2 Log Retention

- **Payment logs:** 7 years (regulatory)
- **Session logs:** 90 days
- **Audit logs:** 2 years

#### 7.5.3 Log Query Example

```sql
SELECT * FROM payments
WHERE admin_id = 'uuid'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 8. INTEGRATION DESIGN

### 8.1 M-Pesa Integration

#### 8.1.1 OAuth Authentication

**Endpoint:** `/oauth/v1/generate`

**Request:**
```http
POST /oauth/v1/generate
Authorization: Basic base64(consumer_key:consumer_secret)
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": "3599"
}
```

#### 8.1.2 STK Push Request

**Endpoint:** `/mpesa/stkpush/v1/processrequest`

**Request:**
```json
{
  "BusinessShortCode": "174379",
  "Password": "base64_encoded_password",
  "Timestamp": "20240331120000",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": 100,
  "PartyA": "254708374149",
  "PartyB": "174379",
  "PhoneNumber": "254708374149",
  "CallBackURL": "https://api.kingstone.com/functions/v1/mpesa-callback",
  "AccountReference": "PKG001",
  "TransactionDesc": "Internet Package"
}
```

#### 8.1.3 Callback Processing

**Callback Payload:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "12345",
      "CheckoutRequestID": "ws_123456",
      "ResultCode": 0,
      "ResultDesc": "Accepted",
      "CallbackMetadata": {
        "Item": [
          {"Name": "MpesaReceiptNumber", "Value": "QGH123456"},
          {"Name": "Amount", "Value": 100},
          {"Name": "TransactionId", "Value": "TXN123456"},
          {"Name": "PhoneNumber", "Value": "254708374149"}
        ]
      }
    }
  }
}
```

### 8.2 Mikrotik Integration

#### 8.2.1 Router Authentication

**Method:** Basic Auth over HTTPS

**Configuration:**
```typescript
const routerConfig = {
  host: '192.168.88.1',
  port: 8729,
  username: 'api_user',
  password: 'api_password'
};
```

#### 8.2.2 User Creation

**Endpoint:** `/rest/ip/hotspot/user`

**Request:**
```http
POST /rest/ip/hotspot/user HTTP/1.1
Host: 192.168.88.1:8729
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
Content-Type: application/json

{
  "name": "0708374149",
  "password": "TXN123456",
  "profile": "default",
  "comment": "Package: 1 Hour"
}
```

**Response:**
```json
[
  {
    "ret": ".id=*12345"
  }
]
```

#### 8.2.3 User Removal

**Endpoint:** `/rest/ip/hotspot/user/*12345`

**Request:**
```http
DELETE /rest/ip/hotspot/user/*12345 HTTP/1.1
Host: 192.168.88.1:8729
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

### 8.3 SMS Gateway Integration

#### 8.3.1 Africa's Talking API

**Endpoint:** `/messaging`

**Request:**
```http
POST /messaging HTTP/1.1
Host: api.africastalking.com
Content-Type: application/json
apiKey: your_api_key

{
  "username": "your_username",
  "to": "+254708374149",
  "message": "Your WiFi credentials: Username: 0708374149, Password: TXN123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "messageId": "SMS_123456",
  "recipientCount": 1
}
```

### 8.4 Integration Error Handling

#### 8.4.1 Retry Logic

**M-Pesa API:**
- Maximum retries: 3
- Backoff: Exponential (1s, 2s, 4s)
- Timeout: 30 seconds per attempt

**Mikrotik API:**
- Maximum retries: 2
- Backoff: Linear (1s, 2s)
- Timeout: 10 seconds per attempt

#### 8.4.2 Fallback Strategies

**M-Pesa Callback Failure:**
1. Poll STK status every 5 seconds
2. After 3 failed polls, query M-Pesa API directly
3. Show manual verification button to user
4. Log error for admin review

**Mikrotik Connection Failure:**
1. Retry connection twice
2. Mark router as offline
3. Queue user creation for retry
4. Notify admin via dashboard alert

---

## 9. DEPLOYMENT DESIGN

### 9.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Cloud Platform                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │PostgreSQL│  │Edge Func.│  │   Auth   │              │   │
│  │  │ Database │  │  (Deno)  │  │  Service │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Frontend Hosting (Vercel/Netlify)          │   │
│  │  ┌──────────────────────────────────────────┐           │   │
│  │  │         React SPA (Static Files)         │           │   │
│  │  └──────────────────────────────────────────┘           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              External Services                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  M-Pesa  │  │  Mikrotik│  │   SMS    │              │   │
│  │  │  Daraja  │  │ Routers  │  │ Gateway  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Environment Configuration

#### 9.2.1 Environment Variables

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://mpjezwlweapgltrimtqy.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PORTAL_URL=https://billing.kingstone.com
VITE_MOCK_PAYMENT_MODE=false
```

**Edge Functions (Supabase Secrets):**
```bash
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://mpjezwlweapgltrimtqy.supabase.co/functions/v1/mpesa-callback
AFRICAS_TALKING_USERNAME=your_username
AFRICAS_TALKING_API_KEY=your_api_key
```

#### 9.2.2 Database Configuration

**Connection String:**
```
postgresql://postgres:[PASSWORD]@db.mpjezwlweapgltrimtqy.supabase.co:5432/postgres
```

**Migration Order:**
1. `database/01_FIX_PAYMENTS.sql`
2. `database/02_FIX_MIKROTIKS.sql`
3. `database/03_FIX_PASSWORD_TRIGGERS.sql`
4. `database/04_CREATE_RPC_FUNCTIONS.sql`
5. `database/05_ADD_CONSTRAINTS_INDEXES.sql`

### 9.3 Deployment Steps

#### 9.3.1 Database Deployment

```bash
# 1. Connect to Supabase SQL Editor
# 2. Run migrations in order
psql -h db.mpjezwlweapgltrimtqy.supabase.co \
     -U postgres \
     -d postgres \
     -f database/01_FIX_PAYMENTS.sql

psql -h db.mpjezwlweapgltrimtqy.supabase.co \
     -U postgres \
     -d postgres \
     -f database/02_FIX_MIKROTIKS.sql

# ... repeat for all migrations
```

#### 9.3.2 Edge Functions Deployment

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref mpjezwlweapgltrimtqy

# Set secrets
supabase secrets set MPESA_CONSUMER_KEY="your_key"
supabase secrets set MPESA_CONSUMER_SECRET="your_secret"

# Deploy functions
supabase functions deploy mpesa-stk-push
supabase functions deploy mpesa-callback
supabase functions deploy check-stk-status
supabase functions deploy send-sms
supabase functions deploy send-otp-email
```

#### 9.3.3 Frontend Deployment

```bash
# Navigate to frontend directory
cd config

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

### 9.4 CI/CD Pipeline

#### 9.4.1 GitHub Actions Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
        working-directory: ./config
      
      - name: Build
        run: npm run build
        working-directory: ./config
      
      - name: Deploy to Supabase
        uses: supabase/setup-cli@v1
        with:
          project-ref: mpjezwlweapgltrimtqy
      
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy mpesa-stk-push
          supabase functions deploy mpesa-callback
```

### 9.5 Monitoring and Logging

#### 9.5.1 Supabase Logs

```bash
# View function logs
supabase functions logs mpesa-stk-push

# Stream logs in real-time
supabase functions logs mpesa-callback --tail
```

#### 9.5.2 Database Monitoring

**Key Metrics:**
- Active sessions count
- Payment success rate
- Average response time
- Error rate by function

**Dashboard Query:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### 9.5.3 Alerting

**Critical Alerts:**
- M-Pesa callback failures > 10/hour
- Payment success rate < 90%
- Database connection errors
- Router offline status

**Notification Channels:**
- Email (admin)
- SMS (urgent)
- Dashboard alerts

---

## 10. TESTING STRATEGY

### 10.1 Testing Levels

#### 10.1.1 Unit Testing

**Scope:** Individual functions and components

**Tools:**
- Jest (frontend)
- Deno test (edge functions)
- pgTAP (database)

**Example:**
```typescript
// Test payment validation
describe('validatePaymentInput', () => {
  it('should accept valid phone number', () => {
    expect(validatePaymentInput({
      phone: '0708374149',
      amount: 100
    })).toBe(true);
  });

  it('should reject invalid amount', () => {
    expect(validatePaymentInput({
      phone: '0708374149',
      amount: -50
    })).toBe(false);
  });
});
```

#### 10.1.2 Integration Testing

**Scope:** Component interactions

**Test Cases:**
- STK Push → M-Pesa → Callback → Database update
- User registration → WiFi user creation → Mikrotik sync
- Admin login → Session creation → Dashboard access

**Example:**
```typescript
// Test payment flow
describe('Payment Flow Integration', () => {
  it('should complete payment end-to-end', async () => {
    // Initiate STK push
    const response = await initiateStkPush({
      phone: '0708374149',
      amount: 100
    });

    // Verify transaction created
    expect(response.transaction_id).toBeDefined();

    // Simulate callback
    await simulateCallback({
      transaction_id: response.transaction_id,
      status: 'completed'
    });

    // Verify database update
    const payment = await getPayment(response.transaction_id);
    expect(payment.status).toBe('completed');
  });
});
```

#### 10.1.3 System Testing

**Scope:** Complete system workflows

**Test Scenarios:**
1. User connects to WiFi → Payment → Internet access
2. Admin creates package → User purchases → Revenue tracking
3. Router offline → Queue → Retry → Success

#### 10.1.4 Acceptance Testing

**Scope:** User acceptance criteria

**Checklist:**
- [ ] Payment completes within 30 seconds
- [ ] Credentials delivered via SMS
- [ ] Internet access granted immediately
- [ ] Dashboard shows real-time metrics
- [ ] Admin can manage all entities

### 10.2 Test Data Management

#### 10.2.1 Test Accounts

**Admin:**
- Username: `testadmin`
- Password: `Test123!`
- Email: `test@kingstone.com`

**WiFi User:**
- Username: `0708374149`
- Password: `TXN123456`

#### 10.2.2 Test M-Pesa Numbers

**Sandbox:**
- Phone: `0708374149`
- PIN: `1234`

**Production:**
- Use real M-Pesa accounts only

### 10.3 Performance Testing

#### 10.3.1 Load Testing

**Tools:** k6, Apache JMeter

**Scenarios:**
- 100 concurrent users purchasing packages
- 1000 concurrent session validations
- 50 concurrent M-Pesa callbacks

**Metrics:**
- Response time < 2 seconds
- Error rate < 1%
- Throughput > 100 requests/second

#### 10.3.2 Stress Testing

**Break Points:**
- Database connection pool exhaustion
- M-Pesa API rate limits
- Mikrotik router capacity

### 10.4 Security Testing

#### 10.4.1 Penetration Testing

**Areas:**
- SQL injection prevention
- XSS vulnerability assessment
- CSRF token validation
- Authentication bypass attempts

#### 10.4.2 Vulnerability Scanning

**Tools:**
- OWASP ZAP
- Burp Suite
- npm audit

**Frequency:** Monthly

### 10.5 Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Frontend Components | 80% |
| Edge Functions | 90% |
| Database Functions | 85% |
| API Endpoints | 95% |
| **Overall** | **85%** |

---

## 11. APPENDICES

### Appendix A: Database Migration Scripts

**Location:** `database/` directory

**Files:**
1. `01_FIX_PAYMENTS.sql` - Add missing payment columns
2. `02_FIX_MIKROTIKS.sql` - Add name column to mikrotiks
3. `03_FIX_PASSWORD_TRIGGERS.sql` - Password hashing triggers
4. `04_CREATE_RPC_FUNCTIONS.sql` - RPC function definitions
5. `05_ADD_CONSTRAINTS_INDEXES.sql` - Constraints and indexes

### Appendix B: Edge Function Code

**Location:** `supabase/functions/` directory

**Functions:**
- `mpesa-stk-push/index.ts`
- `mpesa-callback/index.ts`
- `check-stk-status/index.ts`
- `send-sms/index.ts`
- `send-otp-email/index.ts`

### Appendix C: API Reference

**Complete API documentation available at:**
- Supabase Dashboard: https://supabase.com/dashboard/project/mpjezwlweapgltrimtqy
- M-Pesa Daraja: https://developer.safaricom.co.ke/APIs/
- Mikrotik REST API: https://help.mikrotik.com/docs/display/ROS/REST+API

### Appendix D: Troubleshooting Guide

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| M-Pesa callback fails | Incorrect callback URL | Update in Supabase secrets |
| Session validation fails | Expired token | Implement token refresh |
| Mikrotik connection timeout | Firewall blocking | Allow port 8729 |
| Payment stuck in pending | Callback not received | Use manual verification |

### Appendix E: Glossary

| Term | Definition |
|------|-----------|
| **Hotspot** | WiFi access point with authentication |
| **Voucher** | Pre-paid access code |
| **STK Push** | M-Pesa payment prompt on phone |
| **Callback** | M-Pesa server-to-server notification |
| **CheckoutRequestID** | Unique M-Pesa transaction identifier |
| **RLS** | Row Level Security - database access control |
| **Edge Function** | Serverless function running at edge |

### Appendix F: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-31 | Development Team | Initial release |
| | | | |

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Project Manager** | | | |
| **Technical Lead** | | | |
| **Quality Assurance** | | | |
| **System Administrator** | | | |

---

**END OF SOFTWARE DESIGN SPECIFICATION**
