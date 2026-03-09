import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const { email, otp, fullName }: RequestBody = await req.json();

    if (!email || !otp || !fullName) {
      throw new Error("Missing required fields: email, otp, fullName");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const companyName = "Kingstone WiFi Billing";
    const supportEmail = "support@kingstonewifi.com";
    const currentYear = new Date().getFullYear();

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:600;">${companyName}</h1>
              <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Secure Account Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="margin:0 0 20px 0;color:#1f2937;font-size:24px;font-weight:600;">Hello ${fullName}!</h2>
              <p style="margin:0 0 20px 0;color:#4b5563;font-size:16px;line-height:1.6;">
                To complete your registration, use this verification code:
              </p>
              <table role="presentation" style="margin:30px 0;width:100%;">
                <tr>
                  <td style="text-align:center;">
                    <div style="display:inline-block;background-color:#f3f4f6;border:2px dashed #667eea;border-radius:8px;padding:20px 40px;">
                      <span style="font-size:36px;font-weight:700;color:#667eea;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0;color:#4b5563;font-size:14px;text-align:center;">
                This code expires in <strong>10 minutes</strong>
              </p>
              <table role="presentation" style="margin-top:30px;width:100%;background-color:#fef3c7;border-radius:8px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px 0;color:#92400e;font-size:14px;font-weight:600;">Security Notice</p>
                    <ul style="margin:0;padding-left:20px;color:#92400e;font-size:13px;line-height:1.8;">
                      <li>Never share this code with anyone</li>
                      <li>Our team will never ask for this code</li>
                      <li>If you didn't request this, ignore this email</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <p style="margin:30px 0 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                Questions? Contact us at <a href="mailto:${supportEmail}" style="color:#667eea;text-decoration:none;">${supportEmail}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:14px;">© ${currentYear} ${companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set — email not sent. Set it in Supabase Edge Function secrets.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service not configured. Please contact support.",
          _debug_otp: Deno.env.get("SUPABASE_URL")?.includes("localhost") ? otp : undefined,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@kingstonewifi.com>`,
        to: [email],
        subject: `Your ${companyName} verification code: ${otp}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend error:", errorText);
      throw new Error("Failed to send verification email. Please try again.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent to your email.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-otp-email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
