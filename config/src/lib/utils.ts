import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting for Kenyan Shillings - Global KES enforcement
export function formatKES(amount: number): string {
  if (amount === 0) {
    return 'FREE';
  }
  if (amount < 0) {
    return 'INVALID';
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Alternative simple format for KES
export function formatKESSimple(amount: number): string {
  if (amount === 0) {
    return 'FREE';
  }
  if (amount < 0) {
    return 'INVALID';
  }
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Validate payment amount (allows zero for demo/testing)
export function validatePaymentAmount(amount: number): boolean {
  return amount >= 0; // Allow zero and positive amounts
}
