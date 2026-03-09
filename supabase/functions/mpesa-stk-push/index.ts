import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STKPushRequest {
  admin_id: string;
  phone_number: string;
  amount: number;
  package_id: string;
  package_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const { admin_id, phone_number, amount, package_id, package_name }: STKPushRequest = await req.json();

    // Validate required fields
    if (!admin_id || !phone_number || !amount || !package_id || !package_name) {
      throw new Error("Missing required fields");
    }

    // Validate phone number (Kenyan format)
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      throw new Error("Invalid phone number format. Use 0712345678 or +254712345678");
    }

    // Format phone number for M-Pesa (2547XXXXXXXX)
    const formattedPhone = phone_number.startsWith("+254") 
      ? phone_number.substring(1) 
      : phone_number.startsWith("0") 
        ? "254" + phone_number.substring(1) 
        : phone_number;

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpesaConsumerKey = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
    const mpesaConsumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
    const mpesaPasskey = Deno.env.get("MPESA_PASSKEY") ?? "";
    const mpesaShortcode = Deno.env.get("MPESA_SHORTCODE") ?? "";
    const mpesaEnvironment = Deno.env.get("MPESA_ENVIRONMENT") ?? "sandbox";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Server configuration error: Missing Supabase credentials");
    }

    if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaPasskey || !mpesaShortcode) {
      throw new Error("Server configuration error: Missing M-Pesa credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get M-Pesa access token
    const tokenResponse = await fetch(
      mpesaEnvironment === "production"
        ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${btoa(`${mpesaConsumerKey}:${mpesaConsumerSecret}`)}`,
        },
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to get M-Pesa access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate password for STK Push
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${mpesaShortcode}${mpesaPasskey}${timestamp}`);

    // Create payment record in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        admin_id: admin_id,
        user_phone: phone_number,
        amount: amount,
        package_name: package_name,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error("Failed to create payment record");
    }

    // Initiate STK Push
    const stkResponse = await fetch(
      mpesaEnvironment === "production"
        ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: mpesaShortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.floor(amount),
          PartyA: formattedPhone,
          PartyB: mpesaShortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: `${supabaseUrl}/functions/v1/mpesa-callback`,
          AccountReference: `KingstoneWiFi-${paymentRecord.id}`,
          TransactionDesc: `Payment for ${package_name} package`,
        }),
      }
    );

    const stkData = await stkResponse.json();

    if (!stkResponse.ok) {
      throw new Error(stkData.errorMessage || "Failed to initiate STK Push");
    }

    // Update payment record with CheckoutRequestID
    await supabase
      .from("payments")
      .update({
        transaction_id: stkData.CheckoutRequestID,
      })
      .eq("id", paymentRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push initiated successfully. Please check your phone.",
        checkout_request_id: stkData.CheckoutRequestID,
        payment_id: paymentRecord.id,
        merchant_request_id: stkData.MerchantRequestID,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mpesa-stk-push function:", error);

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
