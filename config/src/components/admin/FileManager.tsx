import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  FolderOpen,
  Shield,
  Image,
  Loader2
} from 'lucide-react';
import { useRPC } from '@/hooks/useRPC';
import { useFileStorage } from '@/hooks/useFileStorage';
import { FileUploader } from '@/components/shared/FileUploader';
import { useAuth } from '@/contexts/AuthContext';

interface FileItem {
  id: string;
  filename: string;
  storage_path: string;
  bucket_id: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  mikrotik_id?: string;
}

export const FileManager: React.FC = () => {
  const { user } = useAuth();
  const { call, loading: rpcLoading } = useRPC();
  const { getFileUrl, deleteFile, listFiles, uploading } = useFileStorage();
  
  const [ovpnFiles, setOVPNFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch OVPN files
  const fetchOVPNFiles = async () => {
    const result = await call({
      method: 'getOVPNFiles',
      params: {}
    });
    
    if (result.success && result.data) {
      setOVPNFiles(result.data);
    }
  };

  useEffect(() => {
    fetchOVPNFiles();
  }, [refreshKey]);

  const handleFileUploadComplete = (results: any[]) => {
    console.log('Files uploaded:', results);
    setRefreshKey(prev => prev + 1); // Refresh file list
  };

  const handleViewFile = async (file: FileItem) => {
    setSelectedFile(file);
    setShowFileDialog(true);
    
    // For text files, try to load content
    if (file.mime_type === 'text/plain' || file.filename.endsWith('.ovpn')) {
      // In a real implementation, you would fetch the file content from storage
      setFileContent('# OVPN file content would be loaded here\n# This is a placeholder');
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.filename}?`)) {
      return;
    }

    const success = await deleteFile(file.bucket_id, file.storage_path);
    if (success) {
      setRefreshKey(prev => prev + 1); // Refresh file list
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileItem) => {
    if (file.mime_type?.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.filename.endsWith('.ovpn') || file.mime_type?.includes('openvpn')) {
      return <Shield className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (!user) {
    return (
      <Alert>
        <AlertDescription>Please log in to access the file manager.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            File Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ovpn" className="space-y-4">
            <TabsList>
              <TabsTrigger value="ovpn">OVPN Files</TabsTrigger>
              <TabsTrigger value="hotspot">Hotspot Assets</TabsTrigger>
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
            </TabsList>

            <TabsContent value="ovpn" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">OpenVPN Configuration Files</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  disabled={rpcLoading}
                >
                  {rpcLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Refresh
                </Button>
              </div>

              {ovpnFiles.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No OVPN files found. Upload files using the Upload tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {ovpnFiles.map((file) => (
                    <Card key={file.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file)}
                            <div>
                              <div className="font-medium">{file.filename}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)} • 
                                {new Date(file.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(file)}
                              disabled={uploading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hotspot" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Hotspot Assets</h3>
                <Badge variant="outline">Public Files</Badge>
              </div>
              
              <Alert>
                <AlertDescription>
                  Hotspot assets are publicly accessible files like logos, backgrounds, and stylesheets.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Upload OVPN Files</h3>
                  <FileUploader
                    bucket="ovpn-files"
                    allowedTypes={['application/x-openvpn-profile', 'text/plain']}
                    maxSize={1024 * 1024} // 1MB
                    onUploadComplete={handleFileUploadComplete}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Upload Hotspot Assets</h3>
                  <FileUploader
                    bucket="hotspot-assets"
                    allowedTypes={['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'text/css', 'application/javascript']}
                    maxSize={5 * 1024 * 1024} // 5MB
                    multiple
                    onUploadComplete={handleFileUploadComplete}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* File View Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && getFileIcon(selectedFile)}
              {selectedFile?.filename}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>File Size</Label>
                  <div>{formatFileSize(selectedFile.file_size)}</div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div>{new Date(selectedFile.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Type</Label>
                  <div>{selectedFile.mime_type || 'Unknown'}</div>
                </div>
                <div>
                  <Label>Bucket</Label>
                  <div>{selectedFile.bucket_id}</div>
                </div>
              </div>

              {fileContent && (
                <div>
                  <Label>File Content</Label>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                    {fileContent}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};