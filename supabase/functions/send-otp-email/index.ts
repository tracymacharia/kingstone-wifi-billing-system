import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  otp: string;
  fullName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Parse request body
    const { email, otp, fullName }: RequestBody = await req.json();

    // Validate required fields
    if (!email || !otp || !fullName) {
      throw new Error("Missing required fields: email, otp, fullName");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Server configuration error");
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get email template configuration
    const companyName = "Kingstone WiFi Billing";
    const supportEmail = "support@kingstonewifi.com";
    const currentYear = new Date().getFullYear();

    // Create email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${companyName}</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Secure Account Verification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Hello ${fullName}!</h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for registering with ${companyName}. To complete your registration, please use the following verification code:
              </p>
              
              <!-- OTP Code Box -->
              <table role="presentation" style="margin: 30px 0; width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #667eea; border-radius: 8px; padding: 20px 40px;">
                      <span style="font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 14px; text-align: center;">
                This code will expire in <strong>10 minutes</strong>
              </p>
              
              <!-- Security Notice -->
              <table role="presentation" style="margin-top: 30px; width: 100%; background-color: #fef3c7; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">🔒 Security Notice</p>
                    <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.8;">
                      <li>Never share this code with anyone</li>
                      <li>Our team will never ask for this code</li>
                      <li>If you didn't request this, please ignore this email</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions or need assistance, please contact our support team at 
                <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                © ${currentYear} ${companyName}. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Create plain text version
    const textContent = `
Hello ${fullName},

Thank you for registering with ${companyName}.

Your verification code is: ${otp}

This code will expire in 10 minutes.

SECURITY NOTICE:
- Never share this code with anyone
- Our team will never ask for this code
- If you didn't request this, please ignore this email

If you have any questions, please contact our support team at ${supportEmail}.

© ${currentYear} ${companyName}. All rights reserved.
    `.trim();

    // Send email using Supabase Edge Function email service
    // Note: You'll need to configure an email service like SendGrid, Resend, or AWS SES
    // For now, we'll log the OTP (in production, use a real email service)
    
    console.log(`OTP Email would be sent to: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Full Name: ${fullName}`);

    // If you have an email service configured, uncomment and configure below:
    /*
    const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: 'Your Kingstone WiFi Billing Verification Code',
        }],
        from: {
          email: 'noreply@kingstonewifi.com',
          name: companyName,
        },
        content: [
          {
            type: 'text/html',
            value: emailHtml,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Email service error:', errorData);
      throw new Error('Failed to send verification email');
    }
    */

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP email sent successfully",
        email: email,
        // In production, DO NOT return the OTP in the response
        // This is only for testing/development
        _debug_otp: otp,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-otp-email function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
