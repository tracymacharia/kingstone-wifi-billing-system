import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity, User, Package, Router, DollarSign, Shield, LogIn, LogOut } from "lucide-react";

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: any;
  success: boolean;
  created_at: string;
}

interface SystemAuditLogsProps {
  userRole: 'owner' | 'admin';
  userId?: string;
}

const SystemAuditLogs = ({ userRole, userId }: SystemAuditLogsProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [userRole, userId]);

  const loadAuditLogs = async () => {
    try {
      let query = supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Admins only see their own logs
      if (userRole === 'admin' && userId) {
        query = query.eq('actor_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading audit logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'LOGIN':
        return <LogIn className="w-4 h-4" />;
      case 'LOGOUT':
        return <LogOut className="w-4 h-4" />;
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'admin':
      case 'wifi_user':
      case 'broadband_user':
        return <User className="w-4 h-4" />;
      case 'package':
        return <Package className="w-4 h-4" />;
      case 'mikrotik':
        return <Router className="w-4 h-4" />;
      case 'payment':
        return <DollarSign className="w-4 h-4" />;
      case 'session':
        return <Shield className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string, success: boolean) => {
    if (!success) return 'destructive';
    switch (actionType) {
      case 'CREATE':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'outline';
      case 'LOGIN':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatLogMessage = (log: AuditLog) => {
    const action = log.action_type.toLowerCase();
    const entity = log.entity_type.replace('_', ' ');
    const name = log.entity_name || 'item';
    
    return `${action}d ${entity}: ${name}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Activity Log
        </CardTitle>
        <CardDescription>
          {userRole === 'owner' 
            ? 'All system activities and changes' 
            : 'Your account activities'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activity logs found</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mt-1">
                    {getActionIcon(log.action_type)}
                    {getEntityIcon(log.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionColor(log.action_type, log.success)}>
                        {log.action_type}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {formatLogMessage(log)}
                      </span>
                      {!log.success && (
                        <Badge variant="destructive" className="text-xs">Failed</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>By: {log.actor_role}</span>
                      <span>•</span>
                      <span>{format(new Date(log.created_at), 'PPp')}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details className="cursor-pointer">
                          <summary className="hover:text-foreground">View details</summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SystemAuditLogs;
