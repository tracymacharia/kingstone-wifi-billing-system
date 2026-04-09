import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from "@/lib/logger";

interface FileUploadOptions {
  bucket: 'ovpn-files' | 'hotspot-assets';
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
}

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface FileStorageHook {
  uploading: boolean;
  error: string | null;
  uploadFile: (file: File, options: FileUploadOptions) => Promise<UploadResult>;
  deleteFile: (bucket: string, path: string) => Promise<boolean>;
  getFileUrl: (bucket: string, path: string) => string;
  listFiles: (bucket: string, folder?: string) => Promise<any[]>;
}

export const useFileStorage = (): FileStorageHook => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const uploadFile = useCallback(async (
    file: File, 
    options: FileUploadOptions
  ): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    setUploading(true);
    setError(null);

    try {
      // Validate file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed`);
      }

      // Validate file size
      if (options.maxSize && file.size > options.maxSize) {
        throw new Error(`File size exceeds ${options.maxSize} bytes`);
      }

      // Create file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const folder = options.folder || user.id;
      const filePath = `${folder}/${timestamp}_${sanitizedName}`;

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL for public buckets
      let publicUrl = '';
      if (options.bucket === 'hotspot-assets') {
        const { data: { publicUrl: url } } = supabase.storage
          .from(options.bucket)
          .getPublicUrl(filePath);
        publicUrl = url;
      }

      // For OVPN files, record in database
      if (options.bucket === 'ovpn-files') {
        const { error: dbError } = await supabase
          .from('ovpn_files')
          .insert({
            admin_id: user.role === 'admin' ? user.id : null,
            owner_id: user.role === 'owner' ? user.id : null,
            filename: file.name,
            storage_path: filePath,
            bucket_id: options.bucket,
            file_size: file.size,
            mime_type: file.type
          });

        if (dbError) {
          logger.error('Database record error:', dbError);
          // Continue despite DB error - file is uploaded
        }
      }

      return {
        success: true,
        url: publicUrl,
        path: filePath
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUploading(false);
    }
  }, [user]);

  const deleteFile = useCallback(async (bucket: string, path: string): Promise<boolean> => {
    if (!user) {
      setError('Authentication required');
      return false;
    }

    setError(null);

    try {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Remove from database if OVPN file
      if (bucket === 'ovpn-files') {
        await supabase
          .from('ovpn_files')
          .delete()
          .eq('storage_path', path);
      }

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMsg);
      return false;
    }
  }, [user]);

  const getFileUrl = useCallback((bucket: string, path: string): string => {
    if (bucket === 'hotspot-assets') {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      return publicUrl;
    }

    // For private files, generate signed URL (would need additional logic)
    return '';
  }, []);

  const listFiles = useCallback(async (bucket: string, folder?: string): Promise<any[]> => {
    if (!user) {
      setError('Authentication required');
      return [];
    }

    setError(null);

    try {
      const { data, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder || user.id);

      if (listError) {
        throw new Error(listError.message);
      }

      return data || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'List files failed';
      setError(errorMsg);
      return [];
    }
  }, [user]);

  return {
    uploading,
    error,
    uploadFile,
    deleteFile,
    getFileUrl,
    listFiles
  };
};