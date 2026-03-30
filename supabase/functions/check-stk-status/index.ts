import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to encode to base64
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface StatusQueryRequest {
  transaction_id: string;
  shortcode: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const body: StatusQueryRequest = await req.json();
    const { transaction_id, shortcode } = body;

    if (!transaction_id || !shortcode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing transaction_id or shortcode"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get M-Pesa credentials
    const mpesaConsumerKey = Deno.env.get("MPESA_CONSUMER_KEY") ?? "";
    const mpesaConsumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") ?? "";
    const mpesaPasskey = Deno.env.get("MPESA_PASSKEY") ?? "";
    const mpesaEnvironment = Deno.env.get("MPESA_ENVIRONMENT") ?? "sandbox";

    if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaPasskey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "M-Pesa credentials not configured"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const baseUrl = mpesaEnvironment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Step 1: Get OAuth token
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
      const errText = await tokenResponse.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to get OAuth token",
          details: errText
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Step 2: Query STK Push status
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = encodeBase64(`${shortcode}${mpesaPasskey}${timestamp}`);

    const queryResponse = await fetch(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: transaction_id,
        }),
      }
    );

    const queryData = await queryResponse.json();

    // Step 3: Process the response
    if (!queryResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: queryData.errorMessage || queryData.ResponseDescription || "Query failed",
          details: queryData
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Determine payment status
    const resultCode = queryData.ResultCode;
    let status: string;
    let mpesa_receipt_number: string | null = null;

    if (resultCode === 0) {
      // Payment successful
      status = "completed";
      const metadata = queryData.CallbackMetadata?.Item || [];
      const receiptItem = metadata.find((item: any) => item.Name === "MpesaReceiptNumber");
      if (receiptItem) {
        mpesa_receipt_number = String(receiptItem.Value);
      }
    } else if (resultCode === 1032 || resultCode === 1037) {
      // Payment cancelled by user
      status = "cancelled";
    } else {
      // Payment failed
      status = "failed";
    }

    // Step 5: Update database if we have a valid status
    if (status) {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (mpesa_receipt_number) {
        updateData.mpesa_receipt_number = mpesa_receipt_number;
      }

      await supabase
        .from("payments")
        .update(updateData)
        .eq("transaction_id", transaction_id);

      console.log(`Payment ${status} for transaction ${transaction_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        resultCode,
        resultDesc: queryData.ResultDesc,
        mpesa_receipt_number,
        raw_response: queryData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-stk-status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
