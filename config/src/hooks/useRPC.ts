import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RPCRequest {
  method: string;
  params?: Record<string, any>;
}

interface RPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface RPCHook {
  loading: boolean;
  error: string | null;
  call: <T = any>(request: RPCRequest) => Promise<RPCResponse<T>>;
}

export const useRPC = (): RPCHook => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const call = useCallback(async <T = any>(request: RPCRequest): Promise<RPCResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      // Get session token from sessionStorage (custom auth system)
      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      const { data, error: functionError } = await supabase.functions.invoke('rpc-api', {
        body: {
          method: request.method,
          params: request.params || {},
          sessionToken
        }
      });

      if (functionError) {
        const errorMsg = functionError.message || 'RPC call failed';
        setError(errorMsg);
        return { success: false, error: errorMsg, code: 'FUNCTION_ERROR' };
      }

      if (!data.success) {
        setError(data.error || 'Unknown error');
        return data;
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'NETWORK_ERROR' };
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { loading, error, call };
};