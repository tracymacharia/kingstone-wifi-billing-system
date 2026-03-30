import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to encode to base64 (Deno-compatible)
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface STKPushRequest {
  phone: string;
  amount: number;
  packageId: string;
  packageName: string;
  packageType?: string;
  durationHours?: number;
  mikrotikId?: string;
  adminId: string;
  mpesaType: "till" | "paybill";
  mpesaNumber: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Log the authorization header for debugging
    const authHeader = req.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);
    if (authHeader) {
      console.log("Auth header type:", authHeader.split(' ')[0]);
    }

    const body: STKPushRequest = await req.json();
    const { phone, amount, packageId, packageName, adminId, mpesaType, mpesaNumber } = body;

    if (!phone || !amount || !packageId || !packageName || !adminId || !mpesaNumber) {
      throw new Error("Missing required fields: phone, amount, packageId, packageName, adminId, mpesaNumber");
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error("Invalid amount: must be greater than zero");
    }
    if (amount > 150000) {
      throw new Error("Invalid amount: exceeds maximum transaction limit (KSh 150,000)");
    }

    const phoneRegex = /^(\+254|0|254)[17]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error("Invalid phone number. Use format 0712345678 or +254712345678");
    }

    const formattedPhone = phone.startsWith("+254")
      ? phone.substring(1)
      : phone.startsWith("0")
        ? "254" + phone.substring(1)
        : phone.startsWith("254")
          ? phone
          : "254" + phone.substring(1);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpesaConsumerKey = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
    const mpesaConsumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
    const mpesaPasskey = Deno.env.get("MPESA_PASSKEY") ?? "";
    const mpesaEnvironment = Deno.env.get("MPESA_ENVIRONMENT") ?? "sandbox";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Server configuration error: Missing Supabase credentials");
    }

    if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaPasskey) {
      throw new Error("MPESA credentials not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY in Supabase Edge Function secrets.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const baseUrl = mpesaEnvironment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    const tokenResponse = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          "Authorization": `Basic ${encodeBase64(`${mpesaConsumerKey}:${mpesaConsumerSecret}`)}`,
        },
      }
    );

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("MPESA token error:", err);
      throw new Error("Failed to get MPESA access token. Check your Consumer Key and Secret.");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = encodeBase64(`${mpesaNumber}${mpesaPasskey}${timestamp}`);

    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        admin_id: adminId,
        mikrotik_id: body.mikrotikId || null,
        user_phone: formattedPhone,
        amount: amount,
        package_name: packageName,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment record error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    const transactionType = mpesaType === "till"
      ? "CustomerBuyGoodsOnline"
      : "CustomerPayBillOnline";

    console.log('Transaction details:', {
      mpesaType,
      mpesaNumber,
      transactionType,
      amount: Math.floor(amount),
      formattedPhone,
      BusinessShortCode: mpesaNumber
    });

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: mpesaNumber,
          Password: password,
          Timestamp: timestamp,
          TransactionType: transactionType,
          Amount: Math.floor(amount),
          PartyA: formattedPhone,
          PartyB: mpesaNumber,
          PhoneNumber: formattedPhone,
          CallBackURL: Deno.env.get("MPESA_CALLBACK_URL") || `${supabaseUrl}/functions/v1/mpesa-callback`,
          AccountReference: `WiFi-${paymentRecord.id.substring(0, 8)}`,
          TransactionDesc: `${packageName} WiFi Package`,
        }),
      }
    );

    const stkData = await stkResponse.json();

    if (!stkResponse.ok || stkData.ResponseCode !== "0") {
      const errMsg = stkData.errorMessage || stkData.ResponseDescription || "STK Push failed";
      console.error("STK push failed:", JSON.stringify(stkData));
      await supabase.from("payments").update({ status: "failed" }).eq("id", paymentRecord.id);
      throw new Error(errMsg);
    }

    await supabase
      .from("payments")
      .update({ transaction_id: stkData.CheckoutRequestID })
      .eq("id", paymentRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push sent. Please check your phone and enter your MPESA PIN.",
        checkout_request_id: stkData.CheckoutRequestID,
        payment_id: paymentRecord.id,
        merchant_request_id: stkData.MerchantRequestID,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in mpesa-stk-push:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
