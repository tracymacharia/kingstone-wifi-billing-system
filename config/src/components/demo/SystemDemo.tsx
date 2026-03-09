import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Package, CreditCard, Router, FileText, Upload } from 'lucide-react';
import { useRPC } from '@/hooks/useRPC';
import { useAuth } from '@/contexts/AuthContext';
import { FileUploader } from '@/components/shared/FileUploader';

export const SystemDemo: React.FC = () => {
  const { user } = useAuth();
  const { loading, error, call } = useRPC();
  const [results, setResults] = useState<Record<string, any>>({});
  
  // WiFi User Management
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    phone_number: '',
    user_type: 'wifi'
  });

  // Package Management
  const [newPackage, setNewPackage] = useState({
    name: '',
    price: 0,
    duration_value: 1,
    duration_type: 'hours',
    package_type: 'wifi',
    download_speed_mbps: 10,
    upload_speed_mbps: 5
  });

  // System Health
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Fetch system health on component mount
  useEffect(() => {
    if (user?.role === 'owner') {
      handleGetSystemHealth();
    }
  }, [user]);

  const handleCreateWifiUser = async () => {
    const result = await call({
      method: 'createWifiUser',
      params: newUser
    });
    setResults(prev => ({ ...prev, createUser: result }));
    
    if (result.success) {
      setNewUser({ username: '', password: '', phone_number: '', user_type: 'wifi' });
    }
  };

  const handleGetWifiUsers = async () => {
    const result = await call({
      method: 'getWifiUsers',
      params: { page: 1, limit: 10 }
    });
    setResults(prev => ({ ...prev, users: result }));
  };

  const handleCreatePackage = async () => {
    const result = await call({
      method: 'createPackage',
      params: newPackage
    });
    setResults(prev => ({ ...prev, createPackage: result }));
    
    if (result.success) {
      setNewPackage({
        name: '',
        price: 0,
        duration_value: 1,
        duration_type: 'hours',
        package_type: 'wifi',
        download_speed_mbps: 10,
        upload_speed_mbps: 5
      });
    }
  };

  const handleGetPackages = async () => {
    const result = await call({
      method: 'getPackages',
      params: { active: true }
    });
    setResults(prev => ({ ...prev, packages: result }));
  };

  const handleGetMikrotiks = async () => {
    const result = await call({
      method: 'getMikrotiks',
      params: {}
    });
    setResults(prev => ({ ...prev, mikrotiks: result }));
  };

  const handleGetSystemHealth = async () => {
    const result = await call({
      method: 'getSystemHealth',
      params: {}
    });
    if (result.success) {
      setSystemHealth(result.data);
    }
    setResults(prev => ({ ...prev, systemHealth: result }));
  };

  const handleFileUploadComplete = (uploadResults: any[]) => {
    setResults(prev => ({ ...prev, fileUploads: uploadResults }));
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>Please log in to access the system demo.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kingstone System Demo
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{user.role.toUpperCase()}</Badge>
            <Badge variant="secondary">{user.username}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {systemHealth && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{systemHealth.users}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{systemHealth.packages}</div>
                  <div className="text-sm text-muted-foreground">Packages</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{systemHealth.payments}</div>
                  <div className="text-sm text-muted-foreground">Payments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Router className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{systemHealth.activeConnections}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="mikrotiks">Mikrotiks</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WiFi User Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+254700000000"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateWifiUser} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create User
                </Button>
                <Button variant="outline" onClick={handleGetWifiUsers} disabled={loading}>
                  Get Users
                </Button>
              </div>

              {results.users && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Users ({results.users.data?.pagination?.total || 0})</h4>
                  <div className="space-y-2">
                    {results.users.data?.users?.map((user: any) => (
                      <div key={user.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.phone_number}</div>
                        </div>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Package Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="package-name">Package Name</Label>
                  <Input
                    id="package-name"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Basic WiFi"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (KES)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (Hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newPackage.duration_value}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, duration_value: Number(e.target.value) }))}
                    placeholder="24"
                  />
                </div>
                <div>
                  <Label htmlFor="speed">Download Speed (Mbps)</Label>
                  <Input
                    id="speed"
                    type="number"
                    value={newPackage.download_speed_mbps}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, download_speed_mbps: Number(e.target.value) }))}
                    placeholder="10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreatePackage} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Package
                </Button>
                <Button variant="outline" onClick={handleGetPackages} disabled={loading}>
                  Get Packages
                </Button>
              </div>

              {results.packages && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Packages ({results.packages.data?.length || 0})</h4>
                  <div className="space-y-2">
                    {results.packages.data?.map((pkg: any) => (
                      <div key={pkg.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-muted-foreground">
                              KES {pkg.price} • {pkg.duration_value} {pkg.duration_type}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {pkg.download_speed_mbps}Mbps down / {pkg.upload_speed_mbps}Mbps up
                            </div>
                          </div>
                          <Badge variant={pkg.is_active ? "default" : "secondary"}>
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mikrotiks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mikrotik Routers</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGetMikrotiks} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get Mikrotiks
              </Button>

              {results.mikrotiks && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Mikrotiks ({results.mikrotiks.data?.length || 0})</h4>
                  <div className="space-y-2">
                    {results.mikrotiks.data?.map((mikrotik: any) => (
                      <div key={mikrotik.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{mikrotik.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {mikrotik.ip_address}:{mikrotik.api_port}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Router ID: {mikrotik.router_id}
                            </div>
                          </div>
                          <Badge variant={mikrotik.status === 'online' ? "default" : "secondary"}>
                            {mikrotik.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className="grid gap-6">
            <FileUploader
              bucket="ovpn-files"
              allowedTypes={['application/x-openvpn-profile', 'text/plain', '.ovpn']}
              maxSize={1024 * 1024} // 1MB
              onUploadComplete={handleFileUploadComplete}
            />
            
            <FileUploader
              bucket="hotspot-assets"
              allowedTypes={['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']}
              maxSize={5 * 1024 * 1024} // 5MB
              multiple
              onUploadComplete={handleFileUploadComplete}
            />
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};