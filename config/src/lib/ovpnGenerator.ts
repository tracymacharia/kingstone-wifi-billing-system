import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface VPNCredentials {
  username: string;
  password: string;
}

export interface OVPNConfig {
  mikrotikId: string;
  adminId: string;
  routerId: string;
  serverAddress: string;
  serverPort: number;
  credentials: VPNCredentials;
  caCertificate: string;
  adminDetails: {
    name: string;
    mpesaType: 'till' | 'paybill';
    mpesaNumber: string;
    location?: string;
  };
}

// Generate unique VPN credentials for a Mikrotik
export const generateVPNCredentials = (mikrotikId: string, routerId: string): VPNCredentials => {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return {
    username: `Kingstone_${routerId.toLowerCase()}_${timestamp}`,
    password: `${routerId}_${randomSuffix}_${timestamp}`.substring(0, 16)
  };
};

// Generate CA certificate (mock for demonstration)
export const generateCACertificate = (): string => {
  return `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUX8f9CxGZJ9pLm7V1R2QvGYM8ZnwwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCS0UxEzARBgNVBAgMCk5haXJvYmkgUzETMBEGA1UEBwwK
TmFpcm9iaSBDMQwwCgYDVQQKDANJTVcwHhcNMjQwMTAxMDAwMDAwWhcNMjkwMTAx
MDAwMDAwWjBFMQswCQYDVQQGEwJLRTETMBEGA1UECAwKTmFpcm9iaSBTMRMwEQYD
VQQHDApOYWlyb2JpIEMxDDAKBgNVBAoMA0lNVzCCASIwDQYJKoZIhvcNAQEBBQAD
ggEPADCCAQoCggEBALGJf8VQ5pHFxQJ2YoM8QfR5L3V9sNzKWE4Z7tG8vPY3nJ9R
XqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5L3V9sNzKWE4Z7tG8vPY3nJ9R
XqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5L3V9sNzKWE4Z7tG8vPY3nJ9R
XqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5L3V9sNzKWE4Z7tG8vPY3nJ9R
XqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5L3V9sNzKWE4Z7tG8vPY3nJ9R
XqKjQ8wL5dV3nQ9YzL7jN8kQIDAQABo1MwUTAdBgNVHQ4EFgQUX8f9CxGZJ9pLm7
V1R2QvGYM8ZnwwHwYDVR0jBBgwFoAUX8f9CxGZJ9pLm7V1R2QvGYM8ZnwwDwYDVR
0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEALGJf8VQ5pHFxQJ2YoM8QfR5
L3V9sNzKWE4Z7tG8vPY3nJ9RXqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5
L3V9sNzKWE4Z7tG8vPY3nJ9RXqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5
L3V9sNzKWE4Z7tG8vPY3nJ9RXqKjQ8wL5dV3nQ9YzL7jN8kQ5pHFxQJ2YoM8QfR5
L3V9sNzKWE4Z7tG8vPY3nJ9RXqKjQ8wL5dV3nQ9YzL7jN8kQ
-----END CERTIFICATE-----`;
};

// Generate OVPN configuration content
export const generateOVPNContent = (config: OVPNConfig): string => {
  return `client
dev tun
proto tcp
remote ${config.serverAddress} ${config.serverPort}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth-user-pass credentials.txt
cipher AES-256-CBC
auth SHA256
verb 3
mute 20

<ca>
${config.caCertificate}
</ca>

# Kingstone WiFi Billing System Configuration
# ==========================================
# Mikrotik ID: ${config.mikrotikId}
# Router ID: ${config.routerId}
# Admin ID: ${config.adminId}
# Admin: ${config.adminDetails.name}
# MPESA: ${config.adminDetails.mpesaType.toUpperCase()} - ${config.adminDetails.mpesaNumber}
# Location: ${config.adminDetails.location || 'Not specified'}
# Generated: ${new Date().toISOString()}
#
# Hotspot Portal: https://billing.yobrazlyan.com/portal/${config.routerId}
# Payment Gateway: ${config.adminDetails.mpesaType === 'till' ? 'Till Number' : 'Paybill'} ${config.adminDetails.mpesaNumber}
`;
};

// Generate hotspot login page with admin-specific details
export const generateHotspotLogin = (config: OVPNConfig): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="3; url=https://billing.yobrazlyan.com/portal/${config.routerId}?mac=$(mac)&ip=$(ip)&router_id=MIKROTIK_${config.routerId}&admin_id=${config.adminId}&mpesa_type=${config.adminDetails.mpesaType}&mpesa_number=${config.adminDetails.mpesaNumber}&link_login=$(link-login-only)&link_orig=$(link-orig)">
    <title>Yobrazlyan WiFi - ${config.adminDetails.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #D32F2F 0%, #FBC02D 50%, #1976D2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        }
        
        .container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            color: #333;
            backdrop-filter: blur(10px);
        }
        
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            color: white;
        }
        
        h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 2rem;
            font-size: 1rem;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #D32F2F;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .status {
            color: #666;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        
        .manual-link {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #D32F2F, #FBC02D);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        
        .manual-link:hover {
            transform: translateY(-2px);
        }
        
        .info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: #666;
        }
        
        .admin-info {
            background: #e3f2fd;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            font-size: 0.85rem;
            color: #1565c0;
            border-left: 4px solid #2196f3;
        }
        
        @media (max-width: 480px) {
            .container {
                margin: 1rem;
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Y</div>
        <h1>Yobrazlyan WiFi</h1>
        <p class="subtitle">Managed by ${config.adminDetails.name}</p>
        
        <div class="spinner"></div>
        <p class="status">Redirecting to payment portal...</p>
        
        <a href="https://billing.yobrazlyan.com/portal/${config.routerId}?mac=$(mac)&ip=$(ip)&router_id=MIKROTIK_${config.routerId}&admin_id=${config.adminId}&mpesa_type=${config.adminDetails.mpesaType}&mpesa_number=${config.adminDetails.mpesaNumber}&link_login=$(link-login-only)&link_orig=$(link-orig)" class="manual-link">
            Continue Manually
        </a>
        
        <div class="admin-info">
            <strong>Service Provider:</strong><br>
            ${config.adminDetails.name}<br>
            Payment: ${config.adminDetails.mpesaType === 'till' ? 'Till' : 'Paybill'} ${config.adminDetails.mpesaNumber}
            ${config.adminDetails.location ? `<br>Location: ${config.adminDetails.location}` : ''}
        </div>
        
        <div class="info">
            <strong>Connection Info:</strong><br>
            MAC: $(mac)<br>
            IP: $(ip)<br>
            Router: ${config.routerId}
        </div>
    </div>
    
    <script>
        // Fallback redirect if meta refresh fails
        setTimeout(function() {
            if (!document.hidden) {
                window.location.href = "https://billing.yobrazlyan.com/portal/${config.routerId}?mac=$(mac)&ip=$(ip)&router_id=MIKROTIK_${config.routerId}&admin_id=${config.adminId}&mpesa_type=${config.adminDetails.mpesaType}&mpesa_number=${config.adminDetails.mpesaNumber}&link_login=$(link-login-only)&link_orig=$(link-orig)";
            }
        }, 5000);
        
        // Show connection status
        document.addEventListener('DOMContentLoaded', function() {
            const status = document.querySelector('.status');
            let dots = 0;
            
            setInterval(function() {
                dots = (dots + 1) % 4;
                status.textContent = 'Redirecting to payment portal' + '.'.repeat(dots);
            }, 500);
        });
    </script>
</body>
</html>`;
};

// Generate success page
export const generateSuccessPage = (config: OVPNConfig): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connected Successfully - ${config.adminDetails.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            color: #333;
            backdrop-filter: blur(10px);
        }
        .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, #4caf50, #8bc34a);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: white;
        }
        h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #4caf50, #8bc34a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .session-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: left;
            font-size: 0.9rem;
        }
        .close-btn {
            background: linear-gradient(135deg, #4caf50, #8bc34a);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>Connected Successfully!</h1>
        <p>Welcome to ${config.adminDetails.name} WiFi</p>
        
        <div class="session-info">
            <strong>Session Details:</strong><br>
            Username: $(username)<br>
            IP Address: $(ip)<br>
            Session Time: $(session-time)<br>
            Uptime: $(uptime)
        </div>
        
        <button class="close-btn" onclick="window.close()">Close Window</button>
    </div>
    
    <script>
        setTimeout(function() {
            window.close();
        }, 5000);
    </script>
</body>
</html>`;
};

// Generate credentials file content
export const generateCredentialsContent = (credentials: VPNCredentials): string => {
  return `${credentials.username}
${credentials.password}`;
};

// Create and download OVPN package with hotspot portal files
export const downloadOVPNPackage = async (mikrotik: any): Promise<void> => {
  try {
    
    // Handle both camelCase and snake_case property names
    const config: OVPNConfig = {
      mikrotikId: mikrotik.id,
      adminId: mikrotik.adminId || mikrotik.admin_id || 'unknown-admin',
      routerId: mikrotik.routerId || mikrotik.router_id || mikrotik.id,
      serverAddress: 'vpn.yobrazlyan.com',
      serverPort: 1194,
      credentials: generateVPNCredentials(mikrotik.id, mikrotik.routerId || mikrotik.router_id || mikrotik.id),
      caCertificate: generateCACertificate(),
      adminDetails: {
        name: mikrotik.name || 'Unknown Admin',
        mpesaType: mikrotik.mpesaType || mikrotik.mpesa_type || 'till',
        mpesaNumber: mikrotik.mpesaNumber || mikrotik.mpesa_number || 'Not Set',
        location: mikrotik.location || undefined
      }
    };

    // Validate config before proceeding
    if (!validateOVPNConfig(config)) {
      logger.error('Invalid OVPN config:', config);
      toast.error('Invalid mikrotik configuration. Missing required fields.');
      return;
    }

    const ovpnContent = generateOVPNContent(config);
    const credentialsContent = generateCredentialsContent(config.credentials);
    const loginHtml = generateHotspotLogin(config);
    const successHtml = generateSuccessPage(config);

    // Create files as blobs
    const ovpnBlob = new Blob([ovpnContent], { type: 'text/plain' });
    const credentialsBlob = new Blob([credentialsContent], { type: 'text/plain' });
    const loginBlob = new Blob([loginHtml], { type: 'text/html' });
    const successBlob = new Blob([successHtml], { type: 'text/html' });

    // Download files with delay between each
    const downloadFile = (blob: Blob, filename: string, delay: number) => {
      setTimeout(() => {
        try {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          logger.error('Error downloading file:', filename, error);
          toast.error(`Failed to download ${filename}`);
        }
      }, delay);
    };

    // Download all files
    const routerIdLower = (config.routerId || 'unknown').toLowerCase();
    downloadFile(ovpnBlob, `yobrazlyan-${routerIdLower}.ovpn`, 0);
    downloadFile(credentialsBlob, 'credentials.txt', 500);
    downloadFile(loginBlob, 'login.html', 1000);
    downloadFile(successBlob, 'alogin.html', 1500);

    // Show setup instructions
    const instructions = `
OVPN & Hotspot Setup Instructions for ${config.adminDetails.name}:

📁 Files Downloaded:
1. ${routerIdLower}.ovpn - VPN configuration
2. credentials.txt - VPN authentication
3. login.html - Hotspot login portal
4. alogin.html - Success page

🔧 Mikrotik Setup:
1. Upload login.html and alogin.html to Files → hotspot/
2. Configure hotspot to use login.html as login page
3. Upload .ovpn and credentials.txt for VPN access
4. Configure OpenVPN client if needed

🌐 Portal Features:
- Auto-redirect to billing system
- Admin-specific payment details
- ${config.adminDetails.mpesaType.toUpperCase()}: ${config.adminDetails.mpesaNumber}
- Mobile-responsive design

🛡️ VPN Access:
Server: ${config.serverAddress}:${config.serverPort}
Username: ${config.credentials.username}
Router ID: ${config.routerId}
Admin: ${config.adminDetails.name}

For detailed setup instructions, visit: https://docs.yobrazlyan.com/mikrotik-setup
    `;

    toast.success(`OVPN package downloaded for ${config.adminDetails.name}`, {
      description: "4 files downloaded: OVPN config, credentials, and hotspot portal pages"
    });

    // Show instructions in a modal or alert
    if (confirm("OVPN package downloaded successfully! Would you like to see setup instructions?")) {
      alert(instructions);
    }

  } catch (error) {
    logger.error('Error generating OVPN package:', error);
    toast.error('Failed to generate OVPN package', {
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

// Validate OVPN configuration
export const validateOVPNConfig = (config: OVPNConfig): boolean => {
  const isValid = !!(
    config.mikrotikId &&
    config.adminId &&
    config.routerId &&
    config.serverAddress &&
    config.serverPort &&
    config.credentials.username &&
    config.credentials.password &&
    config.caCertificate &&
    config.adminDetails.name &&
    config.adminDetails.mpesaType &&
    config.adminDetails.mpesaNumber
  );
  
  if (!isValid) {
    logger.error('OVPN config validation failed:', {
      mikrotikId: !!config.mikrotikId,
      adminId: !!config.adminId,
      routerId: !!config.routerId,
      serverAddress: !!config.serverAddress,
      serverPort: !!config.serverPort,
      username: !!config.credentials.username,
      password: !!config.credentials.password,
      caCertificate: !!config.caCertificate,
      adminName: !!config.adminDetails.name,
      mpesaType: !!config.adminDetails.mpesaType,
      mpesaNumber: !!config.adminDetails.mpesaNumber
    });
  }
  
  return isValid;
};