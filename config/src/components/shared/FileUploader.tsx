import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, Check } from 'lucide-react';
import { useFileStorage } from '@/hooks/useFileStorage';

interface FileUploaderProps {
  bucket: 'ovpn-files' | 'hotspot-assets';
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  onUploadComplete?: (results: any[]) => void;
  className?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  uploadResult?: any;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  bucket,
  folder,
  allowedTypes,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUploadComplete,
  className
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { uploading, error, uploadFile } = useFileStorage();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (!multiple && files.length > 1) {
      files.splice(1);
    }

    const filesWithPreview = files.map(file => {
      const fileWithPreview = file as FileWithPreview;
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      return fileWithPreview;
    });

    setSelectedFiles(prev => multiple ? [...prev, ...filesWithPreview] : filesWithPreview);
  }, [multiple]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const file = newFiles[index];
      
      // Revoke preview URL to prevent memory leak
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    const results = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      try {
        // Simulate progress (in real implementation, you'd track actual progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
          }));
        }, 100);

        const result = await uploadFile(file, {
          bucket,
          folder,
          allowedTypes,
          maxSize
        });

        clearInterval(progressInterval);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        // Store result with file
        (selectedFiles[i] as FileWithPreview).uploadResult = result;
        results.push({ file, result });

      } catch (err) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        results.push({ 
          file, 
          result: { 
            success: false, 
            error: err instanceof Error ? err.message : 'Upload failed' 
          } 
        });
      }
    }

    onUploadComplete?.(results);
  }, [selectedFiles, uploadFile, bucket, folder, allowedTypes, maxSize, onUploadComplete]);

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    } else if (file.type.includes('openvpn') || file.name.endsWith('.ovpn')) {
      return '🔐';
    } else if (file.type.startsWith('text/')) {
      return '📄';
    }
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload - {bucket.replace('-', ' ').toUpperCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="file-upload">Select Files</Label>
          <Input
            id="file-upload"
            type="file"
            multiple={multiple}
            accept={allowedTypes?.join(',')}
            onChange={handleFileSelect}
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Max size: {formatFileSize(maxSize)}
            {allowedTypes && ` • Allowed: ${allowedTypes.join(', ')}`}
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="text-2xl">{getFileTypeIcon(file)}</div>
                
                {file.preview && (
                  <img 
                    src={file.preview} 
                    alt="Preview" 
                    className="h-10 w-10 object-cover rounded"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {uploadProgress[file.name] !== undefined && (
                    <div className="mt-2">
                      <Progress value={uploadProgress[file.name]} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadProgress[file.name]}% uploaded
                      </p>
                    </div>
                  )}
                  
                  {file.uploadResult && (
                    <div className="mt-2 flex items-center gap-1">
                      {file.uploadResult.success ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600">Uploaded successfully</span>
                        </>
                      ) : (
                        <span className="text-xs text-red-600">
                          Error: {file.uploadResult.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <Button 
            onClick={handleUpload} 
            disabled={uploading || selectedFiles.every(f => f.uploadResult?.success)}
            className="w-full"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};