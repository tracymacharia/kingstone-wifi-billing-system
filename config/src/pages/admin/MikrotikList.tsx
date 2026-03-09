import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Router,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Activity,
  Terminal,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Mikrotik {
  id: string;
  name: string;
  router_name: string | null;
  router_id: string | null;
  status: 'pending' | 'active' | 'offline' | 'online';
  public_ip: string | null;
  vpn_ip: string | null;
  script_path: string | null;
  self_install_mode: boolean;
  last_heartbeat_at: string | null;
  created_at: string;
  admin_id: string;
}

const AdminMikrotikList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mikrotiks, setMikrotiks] = useState<Mikrotik[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  useEffect(() => {
    loadMikrotiks();
  }, []);

  const loadMikrotiks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mikrotiks')
        .select('*')
        .eq('admin_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMikrotiks(data || []);
    } catch (error: any) {
      console.error('Error loading mikrotiks:', error);
      toast.error('Failed to load routers: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMikrotiks();
  };

  const handleAddRouter = () => {
    navigate('/admin/mikrotiks/add');
  };

  const handleSelfInstall = () => {
    navigate('/admin/mikrotiks/self-install');
  };

  const handleViewRouter = (mikrotik: Mikrotik) => {
    navigate(`/admin/mikrotik/${mikrotik.id}`);
  };

  const handleRegenerateScript = async (mikrotik: Mikrotik) => {
    try {
      // Get session token for custom auth
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      const { data: { session } } = await supabase.auth.getSession();
      const tokenToUse = session?.access_token || sessionToken;

      if (!tokenToUse) {
        toast.error('Session expired. Please login again.');
        navigate('/admin');
        return;
      }

      // Use fetch directly to pass custom auth headers (edge function requires X-Session-Token, X-User-ID)
      const response = await fetch(
        'https://hloxkbcxpolhshegjjou.supabase.co/functions/v1/generate-mikrotik-script',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`,
            'X-Session-Token': tokenToUse,
            'X-User-ID': user?.id || '',
            'X-User-Email': user?.email || '',
          },
          body: JSON.stringify({
            routerName: mikrotik.router_name || mikrotik.name || 'Router',
            billingServerUrl: window.location.origin,
            apiPort: mikrotik.api_port || 8728
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/admin');
        } else {
          throw new Error(data.error || 'Failed to regenerate script');
        }
        return;
      }

      if (data.success) {
        toast.success('Script regenerated! Redirecting...');
        navigate(`/admin/mikrotiks/self-install/${data.routerId}`);
      } else {
        throw new Error(data.error || 'Failed to regenerate script');
      }
    } catch (error: any) {
      console.error('Regenerate script error:', error);
      toast.error(error.message || 'Failed to regenerate script');
    }
  };

  const handleDownloadScript = async (mikrotik: Mikrotik) => {
    try {
      if (!mikrotik.script_path) {
        toast.error('No script available for this router');
        return;
      }

      const { data: urlData } = await supabase.storage
        .from('mikrotik-scripts')
        .createSignedUrl(mikrotik.script_path, 300);

      if (urlData && urlData.signedUrl) {
        // Open in new tab or download
        window.open(urlData.signedUrl, '_blank');
        toast.success('Script downloaded!');
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (error: any) {
      console.error('Download script error:', error);
      toast.error('Failed to download script: ' + error.message);
    }
  };

  const handleDelete = async (mikrotik: Mikrotik) => {
    if (!confirm(`Are you sure you want to delete "${mikrotik.router_name || mikrotik.name || 'Unnamed Router'}"? This will also delete all associated vouchers, packages, and users. This action cannot be undone.`)) {
      return;
    }

    try {
      const sessionToken = sessionStorage.getItem('kingstone_session_token');
      if (!sessionToken) {
        toast.error('Session expired. Please login again.');
        navigate('/admin');
        return;
      }

      const { data, error } = await supabase.rpc('admin_delete_mikrotik', {
        p_mikrotik_id: mikrotik.id,
        p_session_token: sessionToken
      });

      if (error) {
        throw error;
      }

      const result = data as any;
      if (result.success) {
        toast.success('Router deleted successfully');
        await loadMikrotiks();
      } else {
        throw new Error(result.error || 'Failed to delete router');
      }
    } catch (error: any) {
      console.error('Error deleting router:', error);
      toast.error(error.message || 'Failed to delete router');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> {status}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> {status}</Badge>;
      case 'offline':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredMikrotiks = mikrotiks.filter(mk => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      mk.name?.toLowerCase().includes(search) ||
      mk.router_name?.toLowerCase().includes(search) ||
      mk.router_id?.toLowerCase().includes(search) ||
      mk.public_ip?.toLowerCase().includes(search)
    );
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col w-full">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-2">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Router className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">MikroTik Routers</h1>
                <p className="text-xs text-muted-foreground truncate">Manage your router fleet</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleAddRouter}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Add Router</CardTitle>
                      <CardDescription className="text-xs">Manually register a router</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleSelfInstall}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Self Install</CardTitle>
                      <CardDescription className="text-xs">Generate config script</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* List Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Router List
                    </CardTitle>
                    <CardDescription>
                      {filteredMikrotiks.length} of {mikrotiks.length} routers shown
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search routers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading routers...</p>
                  </div>
                ) : filteredMikrotiks.length === 0 ? (
                  <div className="text-center py-8">
                    <Router className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Routers Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first router'}
                    </p>
                    {!searchTerm && (
                      <div className="flex gap-2 justify-center">
                        <Button onClick={handleAddRouter} size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Router
                        </Button>
                        <Button onClick={handleSelfInstall} variant="outline" size="sm">
                          <Terminal className="w-4 h-4 mr-2" />
                          Self Install
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMikrotiks.map((mikrotik) => (
                      <div
                        key={mikrotik.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Router className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium truncate">
                                  {mikrotik.router_name || mikrotik.name || 'Unnamed Router'}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                  {mikrotik.router_id ? `ID: ${mikrotik.router_id}` : 'No router ID'}
                                </p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{formatDate(mikrotik.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Status:</span>
                                {getStatusBadge(mikrotik.status)}
                              </div>
                              {mikrotik.public_ip && (
                                <div className="flex items-center gap-2">
                                  <Router className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">IP:</span>
                                  <span className="font-mono">{mikrotik.public_ip}</span>
                                </div>
                              )}
                              {mikrotik.last_heartbeat_at && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Last seen:</span>
                                  <span className="text-xs">
                                    {new Date(mikrotik.last_heartbeat_at).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="ml-4 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRouter(mikrotik)}
                            >
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewRouter(mikrotik)}>
                                  <Activity className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {mikrotik.script_path && (
                                  <DropdownMenuItem onClick={() => handleDownloadScript(mikrotik)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Script
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleRegenerateScript(mikrotik)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Regenerate Script
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(mikrotik)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Router
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminMikrotikList;
