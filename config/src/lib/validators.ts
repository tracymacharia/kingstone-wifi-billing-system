// Data validation utilities for the admin system

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Phone number validation (Kenyan format)
// Accepts: 0712345678, 0123456789, +254712345678, +254123456789, 254712345678, 254123456789
export const validatePhoneNumber = (phone: string, required = false): ValidationResult => {
  const errors: string[] = [];

  if (required && !phone) {
    errors.push("Phone number is required");
  } else if (phone) {
    // Remove spaces, dashes, and parentheses for validation
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it matches any valid Kenyan format
    const kenyanFormats = [
      /^0[17]\d{8}$/,           // 0712345678 or 0123456789
      /^\+254[17]\d{8}$/,       // +254712345678 or +254123456789
      /^254[17]\d{8}$/          // 254712345678 or 254123456789
    ];
    
    if (!kenyanFormats.some(pattern => pattern.test(cleaned))) {
      errors.push("Please enter a valid Kenyan phone number (e.g., 0712345678, 0123456789, +254712345678, or 254712345678)");
    }
  }

  return { isValid: errors.length === 0, errors };
};

// IP address validation
export const validateIpAddress = (ip: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!ip) {
    errors.push("IP address is required");
  } else if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
    errors.push("Please enter a valid IP address (e.g., 192.168.1.1)");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Password validation - production-grade with strong requirements
export const validatePassword = (password: string, minLength = 8, maxLength = 128): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
  } else {
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (password.length > maxLength) {
      errors.push(`Password must not exceed ${maxLength} characters`);
    }
    // Require at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    // Require at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    // Require at least one number
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    // Require at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character (!@#$%^&* etc.)");
    }
  }

  return { isValid: errors.length === 0, errors };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!username) {
    errors.push("Username is required");
  } else if (username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, hyphens, and underscores");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Package validation
export const validatePackage = (packageData: {
  name: string;
  price: number;
  duration_value: number;
  download_speed_mbps?: number;
  upload_speed_mbps?: number;
  bandwidth_limit_mb?: number;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!packageData.name?.trim()) {
    errors.push("Package name is required");
  }
  
  if (typeof packageData.price !== 'number' || packageData.price < 0) {
    errors.push("Package price must be a valid positive number");
  }
  
  if (typeof packageData.duration_value !== 'number' || packageData.duration_value <= 0) {
    errors.push("Duration value must be a positive number");
  }
  
  if (packageData.download_speed_mbps !== undefined && 
      (typeof packageData.download_speed_mbps !== 'number' || packageData.download_speed_mbps <= 0)) {
    errors.push("Download speed must be a positive number");
  }
  
  if (packageData.upload_speed_mbps !== undefined && 
      (typeof packageData.upload_speed_mbps !== 'number' || packageData.upload_speed_mbps <= 0)) {
    errors.push("Upload speed must be a positive number");
  }
  
  if (packageData.bandwidth_limit_mb !== undefined && 
      (typeof packageData.bandwidth_limit_mb !== 'number' || packageData.bandwidth_limit_mb <= 0)) {
    errors.push("Bandwidth limit must be a positive number");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Mikrotik validation
export const validateMikrotik = (mikrotikData: {
  name: string;
  routerId: string;
  ipAddress: string;
  username: string;
  password: string;
  apiPort: number;
  mpesaNumber: string;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (!mikrotikData.name?.trim()) {
    errors.push("Mikrotik name is required");
  }
  
  if (!mikrotikData.routerId?.trim()) {
    errors.push("Router ID is required");
  }
  
  const ipValidation = validateIpAddress(mikrotikData.ipAddress);
  if (!ipValidation.isValid) {
    errors.push(...ipValidation.errors);
  }
  
  if (!mikrotikData.username?.trim()) {
    errors.push("Username is required");
  }
  
  const passwordValidation = validatePassword(mikrotikData.password, 6);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }
  
  if (typeof mikrotikData.apiPort !== 'number' || 
      mikrotikData.apiPort < 1 || 
      mikrotikData.apiPort > 65535) {
    errors.push("API port must be a valid port number (1-65535)");
  }
  
  if (!mikrotikData.mpesaNumber?.trim()) {
    errors.push("MPESA number is required");
  } else if (!/^\d{5,10}$/.test(mikrotikData.mpesaNumber)) {
    errors.push("MPESA number must be 5-10 digits");
  }
  
  return { isValid: errors.length === 0, errors };
};

// UUID validation
export const validateUUID = (uuid: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!uuid) {
    errors.push("UUID is required");
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    errors.push("Invalid UUID format");
  }
  
  return { isValid: errors.length === 0, errors };
};

// Sanitize input to prevent injection
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['";]/g, '') // Remove potential SQL injection characters
    .trim();
};

// Normalize Kenyan phone number to standard format (254XXXXXXXXX)
export const normalizeKenyanPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Convert to standard format (254XXXXXXXXX)
  if (cleaned.startsWith('+254')) {
    return cleaned.substring(1); // Remove the + sign
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1); // Replace 0 with 254
  }
  
  return cleaned;
};

// Validate Kenyan phone number (returns boolean)
export const isValidKenyanPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const kenyanFormats = [
    /^0[17]\d{8}$/,           // 0712345678 or 0123456789
    /^\+254[17]\d{8}$/,       // +254712345678 or +254123456789
    /^254[17]\d{8}$/          // 254712345678 or 254123456789
  ];
  
  return kenyanFormats.some(pattern => pattern.test(cleaned));
};

// Validate numeric input
export const validateNumericInput = (value: any, min?: number, max?: number): ValidationResult => {
  const errors: string[] = [];
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    errors.push("Value must be a valid number");
  } else {
    if (min !== undefined && num < min) {
      errors.push(`Value must be at least ${min}`);
    }
    if (max !== undefined && num > max) {
      errors.push(`Value must be at most ${max}`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// Combined validation helper
export const validateMultiple = (...validations: ValidationResult[]): ValidationResult => {
  const allErrors = validations.flatMap(v => v.errors);
  return { 
    isValid: allErrors.length === 0, 
    errors: allErrors 
  };
};