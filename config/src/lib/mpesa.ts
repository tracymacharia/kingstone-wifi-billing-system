/**
 * M-Pesa Payment Integration Helper
 * Handles STK Push and payment verification
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { normalizeKenyanPhone, isValidKenyanPhone } from "@/lib/validators";

export interface PaymentRequest {
  admin_id: string;
  phone_number: string;
  amount: number;
  package_id: string;
  package_name: string;
}

export interface PaymentStatus {
  id: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  amount: number;
  mpesa_receipt_number?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Initiate M-Pesa STK Push
 */
export async function initiateSTKPush(request: PaymentRequest): Promise<{
  success: boolean;
  message?: string;
  payment_id?: string;
  checkout_request_id?: string;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(request),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to initiate STK Push");
    }

    return {
      success: true,
      message: result.message,
      payment_id: result.payment_id,
      checkout_request_id: result.checkout_request_id,
    };
  } catch (error: any) {
    logger.error("STK Push error:", error);
    throw error; // Throw instead of returning to make errors visible
  }
}

/**
 * Check payment status - throws on error instead of returning null
 */
export async function checkPaymentStatus(
  paymentId: string
): Promise<PaymentStatus> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Payment not found");
    }

    return {
      id: data.id,
      status: data.status,
      amount: Number(data.amount),
      mpesa_receipt_number: data.mpesa_receipt_number,
      transaction_id: data.transaction_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    logger.error("Error checking payment status:", error);
    throw error; // Throw instead of returning null
  }
}

/**
 * Poll payment status until completed or failed
 */
export async function pollPaymentStatus(
  paymentId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<PaymentStatus> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await checkPaymentStatus(paymentId);

      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      logger.error(`Polling error on attempt ${attempts + 1}:`, error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }

  // Timeout - throw error instead of returning null
  throw new Error("Payment polling timed out after maximum attempts");
}

/**
 * Get all payments for an admin
 */
export async function getAdminPayments(adminId: string): Promise<PaymentStatus[]> {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map((payment) => ({
      id: payment.id,
      status: payment.status,
      amount: Number(payment.amount),
      mpesa_receipt_number: payment.mpesa_receipt_number,
      transaction_id: payment.transaction_id,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    }));
  } catch (error) {
    logger.error("Error fetching payments:", error);
    throw error;
  }
}

/**
 * Format M-Pesa phone number to 254XXXXXXXXX format
 */
export function formatMpesaPhoneNumber(phone: string): string {
  return normalizeKenyanPhone(phone);
}

/**
 * Validate M-Pesa phone number
 */
export function validateMpesaPhoneNumber(phone: string): boolean {
  return isValidKenyanPhone(phone);
}

export default {
  initiateSTKPush,
  checkPaymentStatus,
  pollPaymentStatus,
  getAdminPayments,
  formatMpesaPhoneNumber,
  validateMpesaPhoneNumber,
};
