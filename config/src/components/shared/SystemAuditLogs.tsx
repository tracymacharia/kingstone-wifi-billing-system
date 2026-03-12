import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity, User, Package, Router, DollarSign, Shield } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string | null;
  table_name: string | null;
  record_id: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
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

      if (userRole === 'admin' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        if ((error as any).code === '42P01') {
          setLoading(false);
          return;
        }
        console.error('Error loading audit logs:', error);
        setLoading(false);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string | null) => {
    const a = (action || '').toUpperCase();
    if (a.includes('INSERT') || a.includes('CREATE')) return <Activity className="w-4 h-4 text-green-500" />;
    if (a.includes('UPDATE')) return <Activity className="w-4 h-4 text-blue-500" />;
    if (a.includes('DELETE')) return <Activity className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4" />;
  };

  const getEntityIcon = (tableName: string | null) => {
    const t = tableName || '';
    if (t.includes('admin')) return <User className="w-4 h-4" />;
    if (t.includes('wifi') || t.includes('user')) return <User className="w-4 h-4" />;
    if (t.includes('package')) return <Package className="w-4 h-4" />;
    if (t.includes('mikrotik')) return <Router className="w-4 h-4" />;
    if (t.includes('payment')) return <DollarSign className="w-4 h-4" />;
    if (t.includes('session') || t.includes('credential')) return <Shield className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActionBadgeVariant = (action: string | null) => {
    const a = (action || '').toUpperCase();
    if (a.includes('DELETE')) return 'destructive' as const;
    if (a.includes('UPDATE')) return 'secondary' as const;
    return 'default' as const;
  };

  const formatAction = (action: string | null) => {
    return (action || 'UNKNOWN').toUpperCase();
  };

  const formatTable = (tableName: string | null) => {
    return (tableName || 'unknown').replace(/_/g, ' ');
  };

  const hasDetails = (log: AuditLog) => {
    return (log.new_value && Object.keys(log.new_value).length > 0) ||
           (log.old_value && Object.keys(log.old_value).length > 0);
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
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No activity logs yet</p>
              <p className="text-xs mt-1">Actions taken in the system will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-1 mt-1">
                    {getActionIcon(log.action)}
                    {getEntityIcon(log.table_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                      <span className="text-sm font-medium">
                        on <span className="text-primary">{formatTable(log.table_name)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {log.record_id && (
                        <span>Record: {log.record_id.slice(0, 8)}…</span>
                      )}
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                      <span>{format(new Date(log.created_at), 'PPp')}</span>
                    </div>
                    {hasDetails(log) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details className="cursor-pointer">
                          <summary className="hover:text-foreground">View changes</summary>
                          <div className="mt-1 space-y-1">
                            {log.old_value && Object.keys(log.old_value).length > 0 && (
                              <pre className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-[10px] overflow-auto">
                                Before: {JSON.stringify(log.old_value, null, 2)}
                              </pre>
                            )}
                            {log.new_value && Object.keys(log.new_value).length > 0 && (
                              <pre className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-[10px] overflow-auto">
                                After: {JSON.stringify(log.new_value, null, 2)}
                              </pre>
                            )}
                          </div>
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
