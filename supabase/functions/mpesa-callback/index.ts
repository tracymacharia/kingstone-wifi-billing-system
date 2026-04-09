import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration - restrict to known origins in production
const getCorsHeaders = (origin?: string) => {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",");
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : (Deno.env.get("DEV_MODE") === "true" ? "*" : ""),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
};

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    console.log("Callback received at:", new Date().toISOString());

    // Safaricom doesn't send auth headers - accept the callback
    // In production, we would verify the request source IP
    
    const callbackData: MpesaCallback = await req.json();
    console.log("Callback data:", JSON.stringify(callbackData, null, 2));
    const stkCallback = callbackData.Body.stkCallback;

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Server configuration error: Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find payment record by CheckoutRequestID (transaction_id)
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("transaction_id", stkCallback.CheckoutRequestID)
      .single();

    if (fetchError || !payment) {
      console.error("Payment record not found:", stkCallback.CheckoutRequestID);
      throw new Error("Payment record not found");
    }

    // IDEMPOTENCY: Check if already processed
    if (payment.status === "completed" || payment.status === "failed" || payment.status === "cancelled") {
      console.log(`Payment ${payment.id} already processed with status: ${payment.status}`);
      return new Response(
        JSON.stringify({ success: true, message: "Callback already processed" }),
        { status: 200, headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" } }
      );
    }

    // Check if payment was successful (ResultCode 0 = success)
    if (stkCallback.ResultCode === 0) {
      // Extract callback metadata with null checks
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const getMetadataValue = (name: string) => {
        const item = metadata.find((item) => item.Name === name);
        return item ? item.Value : null;
      };

      const mpesaReceiptNumber = getMetadataValue("MpesaReceiptNumber");
      const transactionDate = getMetadataValue("TransactionDate");
      const amount = getMetadataValue("Amount");

      if (!mpesaReceiptNumber) {
        throw new Error("Missing receipt number in callback - cannot verify payment");
      }

      // Update payment record as completed
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          mpesa_receipt_number: mpesaReceiptNumber as string,
          transaction_id: stkCallback.CheckoutRequestID,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (updateError) {
        throw new Error("Failed to update payment status");
      }

      console.log(`Payment completed: ${payment.id}, Receipt: ${mpesaReceiptNumber}`);
    } else {
      // Payment failed or cancelled
      const status = stkCallback.ResultCode === 1032 ? "cancelled" : "failed";

      await supabase
        .from("payments")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.log(`Payment ${status}: ${payment.id}, Reason: ${stkCallback.ResultDesc}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Callback processed successfully",
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mpesa-callback function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      }
    );
  }
});
