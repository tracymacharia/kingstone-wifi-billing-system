// Custom Supabase client configuration for admin authentication
// This adds the session token to all requests for RLS policies

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Custom fetch wrapper to add session token header
const customFetch = (url: string, options: RequestInit) => {
  // Get the session token from sessionStorage
  const sessionToken = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('kingstone_session_token')
    : null;

  // Clone the headers and add the session token
  const headers = new Headers(options.headers || {});
  if (sessionToken) {
    headers.set('X-Session-Token', sessionToken);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch,
  },
});
