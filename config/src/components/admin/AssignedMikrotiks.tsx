
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KingstoneIcon } from "@/components/ui/Kingstone-icon";
import { Router, MapPin, DollarSign, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LocationViewer from "@/components/admin/LocationViewer";

interface Mikrotik {
  id: string;
  name: string;
  routerId: string;
  ipAddress: string;
  status: 'online' | 'offline';
  mpesaType: 'till' | 'paybill';
  mpesaNumber: string;
  location?: string;
  totalEarnings?: number;
  activeUsers?: number;
}

interface AssignedMikrotiksProps {
  mikrotiks: Mikrotik[];
  onManageMikrotik?: (mikrotikId: string) => void;
}

const AssignedMikrotiks = ({ mikrotiks, onManageMikrotik }: AssignedMikrotiksProps) => {
  const navigate = useNavigate();
  const [selectedMikrotik, setSelectedMikrotik] = useState<{name: string, location: string} | null>(null);
  const [showLocationViewer, setShowLocationViewer] = useState(false);
  
  const getStatusColor = (status: string) => {
    return status === 'online' ? 'default' : 'destructive';
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? 'bg-green-500' : 'bg-red-500';
  };

  const handleManage = (mikrotikId: string) => {
    // Navigate to the MikroTik management page
    navigate(`/admin/mikrotik/${mikrotikId}`);
  };

  const handleLocationClick = (mikrotikName: string, location: string) => {
    setSelectedMikrotik({ name: mikrotikName, location });
    setShowLocationViewer(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Mikrotik Routers</CardTitle>
          <CardDescription>
            Manage routers assigned to your admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mikrotiks.length === 0 ? (
            <div className="text-center py-8">
              <Router className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Mikrotik Routers Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first Mikrotik router to start managing your network
              </p>
              <Button asChild>
                <Link to="/admin/mikrotiks/add">
                  Add Mikrotik Router
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mikrotiks.map((mikrotik) => (
                <div key={mikrotik.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusIcon(mikrotik.status)}`} />
                          <h3 className="font-medium">{mikrotik.name}</h3>
                        </div>
                        <Badge variant={getStatusColor(mikrotik.status)}>
                          {mikrotik.status}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <KingstoneIcon className="w-4 h-4" />
                            <span className="text-muted-foreground">IP:</span>
                            <span className="font-mono">{mikrotik.ipAddress}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Router ID:</span>
                            <span className="font-mono">{mikrotik.routerId}</span>
                          </div>
                          {mikrotik.location && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 hover:bg-transparent"
                                onClick={() => handleLocationClick(mikrotik.name, mikrotik.location)}
                                title="View on map and get directions"
                              >
                                <MapPin className="w-4 h-4 text-primary hover:text-primary/80 cursor-pointer" />
                              </Button>
                              <span className="text-muted-foreground">Location:</span>
                              <span 
                                className="truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleLocationClick(mikrotik.name, mikrotik.location)}
                                title="Click to view on map"
                              >
                                {mikrotik.location}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Earnings:</span>
                            <span className="font-medium">
                              KSh {(mikrotik.totalEarnings || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Active Users:</span>
                            <span className="font-medium">{mikrotik.activeUsers || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button
                        onClick={() => handleManage(mikrotik.id)}
                        size="sm"
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Settings (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle>MPESA Payment Settings</CardTitle>
          <CardDescription>
            Configure payment destinations for your routers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mikrotiks.map((mikrotik) => (
              <div key={mikrotik.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{mikrotik.name}</h4>
                  <p className="text-sm text-muted-foreground">Router ID: {mikrotik.routerId}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {mikrotik.mpesaType.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-lg">{mikrotik.mpesaNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payments go to this {mikrotik.mpesaType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Viewer Modal */}
      {selectedMikrotik && (
        <LocationViewer
          open={showLocationViewer}
          onOpenChange={setShowLocationViewer}
          location={selectedMikrotik.location}
          mikrotikName={selectedMikrotik.name}
        />
      )}
    </div>
  );
};

export default AssignedMikrotiks;
