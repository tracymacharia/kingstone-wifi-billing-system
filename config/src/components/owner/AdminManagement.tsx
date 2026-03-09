import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Edit, Trash2, RotateCcw, Clock, Calendar, AlertCircle, X, Users, Key, Share2, Play, ChevronDown, ChevronUp, Router, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  loginUrl: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastReset?: string;
  resetBy?: string;
  mustChangePassword?: boolean;
  subscription_status?: string;
  subscription_type?: string;
  subscription_expires_at?: string;
  earnings_total?: number;
  business_name?: string;
  is_trial?: boolean;
  trial_expires_at?: string;
  trial_activated_at?: string;
}

interface RegistrationCode {
  id: string;
  code: string;
  business_name: string;
  subscription_type: string;
  is_used: boolean;
  used_by?: string;
  expires_at?: string;
  created_at: string;
}

interface AdminManagementProps {
  admins: Admin[];
  onAdminAdd: (admin: Admin) => void;
  onAdminUpdate: (admin: Admin) => void;
  onAdminDelete: (id: string) => void;
  onAdminReset: (id: string) => void;
  onLoadData?: () => void;
  filter?: string | null;
  onClearFilter?: () => void;
  ownerId?: string | null;
  numericOwnerId?: number | null;
}

const AdminManagement = ({ admins, onAdminAdd, onAdminUpdate, onAdminDelete, onAdminReset, onLoadData, filter, onClearFilter, ownerId: propOwnerId, numericOwnerId: propNumericOwnerId }: AdminManagementProps) => {
  const { user } = useAuth();
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminBusinessName, setNewAdminBusinessName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminSubscriptionType, setNewAdminSubscriptionType] = useState<
    "hotspot" | "pppoe" | "static" | "ppoe_static" | "hotspot_pppoe" | "hotspot_static"
  >("hotspot");
  const [resetting, setResetting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(propOwnerId || null);
  const [subscriptionPrices, setSubscriptionPrices] = useState({
    hotspot_below_10000: 500,
    hotspot_above_10000: 1200,
    ppoe_static_price: 2500
  });
  
  // Registration code state
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeBusinessName, setCodeBusinessName] = useState("");
  const [codeSubscriptionType, setCodeSubscriptionType] = useState<"hotspot" | "pppoe" | "static" | "ppoe_static" | "hotspot_pppoe" | "hotspot_static">("hotspot");
  const [codeExpiryDays, setCodeExpiryDays] = useState("7");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<RegistrationCode | null>(null);
  const [registrationCodes, setRegistrationCodes] = useState<RegistrationCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Trial activation state
  const [activatingAdminId, setActivatingAdminId] = useState<string | null>(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [selectedTrialDays, setSelectedTrialDays] = useState("7");
  const [adminToActivate, setAdminToActivate] = useState<Admin | null>(null);

  // Expanded admin state
  const [expandedAdminId, setExpandedAdminId] = useState<string | null>(null);

  // Edit admin state
  const [isEditing, setIsEditing] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filter admins based on filter prop
  const filteredAdmins = admins.filter(admin => {
    if (!filter || filter === 'all') return true;
    return true;
  });

  // Initialize ownerId from props or localStorage
  useEffect(() => {
    if (propOwnerId) {
      setOwnerId(propOwnerId);
      return;
    }

    const cachedOwnerId = localStorage.getItem('ownerId');
    if (cachedOwnerId) {
      setOwnerId(cachedOwnerId);
    } else {
    }
  }, [propOwnerId]);

  // Fetch subscription prices for the owner
  useEffect(() => {
    const fetchSubscriptionPrices = async () => {
      if (!ownerId) return;

      try {
        const { data, error } = await supabase
          .from('owner_subscription_settings')
          .select('*')
          .eq('owner_id', ownerId)
          .single();

        if (data) {
          setSubscriptionPrices({
            hotspot_below_10000: data.hotspot_below_10000,
            hotspot_above_10000: data.hotspot_above_10000,
            ppoe_static_price: data.ppoe_static_price
          });
        }
      } catch (error) {
        console.error('Error fetching subscription prices:', error);
      }
    };

    fetchSubscriptionPrices();
  }, [ownerId]);

  // Load registration codes
  useEffect(() => {
    if (ownerId) {
      loadRegistrationCodes();
    }
  }, [ownerId]);

  // Diagnostic: Check owners table to verify ownerId and auto-fix if missing
  useEffect(() => {
    const checkAndFixOwnerId = async () => {
      const cachedOwnerId = localStorage.getItem('ownerId');
      
      if (!cachedOwnerId) {

        // Get session token from sessionStorage (custom auth system)
        const sessionToken = sessionStorage.getItem('kingstone_session_token');

        if (!sessionToken) {
          return;
        }


        // Use the validate_session RPC to get user info
        const { data: sessionData, error: sessionError } = await supabase
          .rpc('validate_session', { p_session_token: sessionToken });

        if (sessionError || !sessionData || sessionData.length === 0) {
          console.error('Diagnostic: Invalid session:', sessionError);
          return;
        }

        const userData = sessionData[0];

        // For owners, try multiple ways to find the owner record
        if (userData.role === 'owner') {
          const profileId = userData.user_id;

          // Method 1: Try direct profile_id match
          let { data: ownerData, error: ownerError } = await supabase
            .from('owners')
            .select('id, profile_id')
            .eq('profile_id', profileId)
            .single();

          // Method 2: If not found, get ANY owner record (single owner system)
          if (ownerError || !ownerData) {
            
            const { data: allOwners, error: allError } = await supabase
              .from('owners')
              .select('id, profile_id')
              .limit(1);
            
            if (allOwners && allOwners.length > 0) {
              ownerData = allOwners[0];
            } else {
              console.error('Diagnostic: No owner records found at all:', allError);
              toast.error('No owner record found. Please contact support.');
              return;
            }
          }

          if (ownerData) {
            localStorage.setItem('ownerId', ownerData.id);
            setOwnerId(ownerData.id);
            toast.success('Owner ID loaded successfully!');
            return;
          }
        }
        
        toast.error('No owner record found. Please contact support.');
        return;
      }

      
      // Check if this ID exists in owners table
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('id, profile_id')
        .eq('id', cachedOwnerId)
        .single();

      if (ownerError) {
        // Try finding by profile_id
        const { data: byProfileId, error: profileError } = await supabase
          .from('owners')
          .select('id, profile_id')
          .eq('profile_id', cachedOwnerId)
          .single();
        
        if (byProfileId) {
          localStorage.setItem('ownerId', byProfileId.id);
          setOwnerId(byProfileId.id);
          toast.success('Fixed owner ID. Please try generating code again.');
        } else {
          console.error('Diagnostic: Owner not found:', profileError);
          toast.error('Owner record not found. Please contact support.');
        }
      } else if (ownerData) {
      }
    };

    checkAndFixOwnerId();
  }, []);

  const loadRegistrationCodes = async () => {
    const currentOwnerId = ownerId || localStorage.getItem('ownerId');
    
    if (!currentOwnerId) {
      return;
    }

    setLoadingCodes(true);
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('owner_id', currentOwnerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading registration codes:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Failed to load registration codes: ' + error.message);
      } else if (data) {
        setRegistrationCodes(data);
      } else {
        setRegistrationCodes([]);
      }
    } catch (error) {
      console.error('Error loading registration codes:', error);
      setRegistrationCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  };

  const createAdmin = async () => {
    if (!newAdminName || !newAdminEmail || !newAdminBusinessName || !newAdminUsername) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isCreating) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newAdminPhone && !/^(\+254|0)[17]\d{8}$/.test(newAdminPhone)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    setIsCreating(true);

    try {
      const effectiveOwnerId = ownerId || localStorage.getItem('ownerId');
      
      if (!effectiveOwnerId) {
        toast.error("Owner ID not found. Please log in again.");
        setIsCreating(false);
        return;
      }


      const phoneNumber = newAdminPhone || '+254700000000';
      const tempPassword = newAdminPassword || 'Kingstone123';

      // Get session token
      const sessionToken = sessionStorage.getItem('kingstone_session_token');

      if (!sessionToken) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      // Use RPC function instead of Edge Function
      const { data, error } = await supabase.rpc('register_admin_simple', {
        p_session_token: sessionToken,
        p_full_name: newAdminName,
        p_phone: phoneNumber,
        p_email: newAdminEmail,
        p_business_name: newAdminBusinessName,
        p_username: newAdminUsername,
        p_password: tempPassword,
        p_subscription_type: newAdminSubscriptionType,
        p_owner_id: effectiveOwnerId
      });

      if (error) {
        console.error('Failed to create admin via RPC:', error);
        throw new Error(error.message || 'Failed to create admin');
      }

      const result = data as any;

      if (!result.success) {
        console.error('Failed to create admin:', result);
        throw new Error(result.error || 'Failed to create admin');
      }

      if (result.success) {
        // Show appropriate message based on whether this is a new admin or updated existing
        if (result.is_new !== false) {
          toast.success(`Admin "${newAdminUsername}" created successfully!`);
          
          const newAdmin: Admin = {
            id: result.admin_id,
            name: newAdminUsername,
            email: newAdminEmail,
            phone: phoneNumber,
            business_name: newAdminBusinessName,
            loginUrl: `${window.location.origin}/admin-login`,
            status: 'active',
            createdAt: new Date().toISOString(),
            subscription_status: result.subscription_status || 'pending',
            subscription_type: newAdminSubscriptionType,
            subscription_expires_at: null,
            earnings_total: 0
          };
          
          onAdminAdd(newAdmin);
        } else {
          toast.success(`Admin "${newAdminUsername}" updated successfully!`);
        }

        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPhone("");
        setNewAdminBusinessName("");
        setNewAdminUsername("");
        setNewAdminPassword("");

        // Always reload the full admin list to ensure consistency
        if (onLoadData) {
          onLoadData();
        }
      } else {
        toast.error(result.error || 'Failed to create admin');
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin account');
    } finally {
      setIsCreating(false);
    }
  };

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const handleResetAdmin = async (adminId: string) => {
    setResetting(adminId);
    try {
      const admin = admins.find(a => a.id === adminId);
      if (!admin) {
        toast.error("Admin not found");
        return;
      }

      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      if (!sessionToken) {
        toast.error("Authentication session not found. Please log in again.");
        setResetting(null);
        return;
      }

      // Use RPC function instead of Edge Function
      const { data, error: resetError } = await supabase.rpc('owner_reset_admin_password', {
        p_session_token: sessionToken,
        p_admin_id: adminId,
        p_new_password: 'Kingstone123' // Default temporary password
      });

      if (resetError) {
        console.error('Reset error:', resetError);
        toast.error("Failed to reset admin credentials: " + resetError.message);
        return;
      }

      if (!data.success) {
        console.error('Reset error:', data.error);
        toast.error("Failed to reset admin credentials: " + data.error);
        return;
      }

      toast.success("Admin credentials reset! Temporary password: Kingstone123");

      onAdminUpdate({ ...admin, mustChangePassword: true });

      if (onLoadData) {
        onLoadData();
      }

    } catch (error: any) {
      console.error('Error resetting admin:', error);
      toast.error("Failed to reset admin credentials: " + error.message);
    } finally {
      setResetting(null);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin? This will also delete all associated data.')) {
      return;
    }

    try {
      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      if (!sessionToken) {
        toast.error("Authentication session not found. Please log in again.");
        return;
      }


      // Use RPC function instead of Edge Function
      const { data, error } = await supabase.rpc('owner_delete_admin', {
        p_session_token: sessionToken,
        p_admin_id: adminId
      });

      if (error) {
        console.error('Delete error:', error);
        toast.error("Failed to delete admin: " + error.message);
        return;
      }

      if (!data.success) {
        console.error('Delete error:', data.error);
        toast.error("Failed to delete admin: " + data.error);
        return;
      }

      toast.success("Admin deleted successfully!");
      onAdminDelete(adminId);

      if (onLoadData) {
        onLoadData();
      }
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      toast.error("Failed to delete admin: " + (error.message || 'Unknown error'));
    }
  };

  const handleActivateAdmin = async (adminId: string, trialDays: number) => {
    setActivatingAdminId(adminId);
    try {
      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      if (!sessionToken) {
        toast.error("Authentication session not found. Please log in again.");
        setActivatingAdminId(null);
        return;
      }


      // Call the activate_admin_trial RPC function
      const { data, error } = await supabase.rpc('activate_admin_trial', {
        p_session_token: sessionToken,
        p_admin_id: adminId,
        p_trial_days: trialDays
      });

      if (error) {
        console.error('Activation error:', error);
        toast.error("Failed to activate admin: " + error.message);
        setActivatingAdminId(null);
        return;
      }

      // RPC returns JSON directly, not an array
      const result = data as any;

      if (!result) {
        toast.error("Failed to activate admin: No response from server");
        setActivatingAdminId(null);
        return;
      }

      if (result.success) {
        toast.success(`Admin activated successfully! Trial expires in ${trialDays} days`);

        // Update the admin in the local state
        const admin = admins.find(a => a.id === adminId);
        if (admin) {
          onAdminUpdate({
            ...admin,
            subscription_status: 'active',
            is_trial: true,
            trial_activated_at: new Date().toISOString()
          });
        }

        if (onLoadData) {
          onLoadData();
        }

        setShowActivationDialog(false);
        setAdminToActivate(null);
        setSelectedTrialDays("7");
      } else {
        toast.error(result.error || result.message || "Failed to activate admin");
      }
    } catch (error: any) {
      console.error('Error activating admin:', error);
      toast.error("Failed to activate admin: " + error.message);
    } finally {
      setActivatingAdminId(null);
    }
  };

  const handleChangeSubscriptionType = async (adminId: string, newSubscriptionType: string) => {
    try {
      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      if (!sessionToken) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const { data, error } = await supabase.rpc('owner_update_admin_subscription', {
        p_session_token: sessionToken,
        p_admin_id: adminId,
        p_subscription_type: newSubscriptionType
      });

      if (error) {
        console.error('Update subscription error:', error);
        toast.error("Failed to update subscription: " + error.message);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || "Failed to update subscription");
        return;
      }

      toast.success("Subscription type updated successfully!");

      // Update local state
      const admin = admins.find(a => a.id === adminId);
      if (admin) {
        onAdminUpdate({
          ...admin,
          subscription_type: newSubscriptionType
        });
      }

      if (onLoadData) {
        onLoadData();
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error("Failed to update subscription: " + error.message);
    }
  };

  const openActivationDialog = (admin: Admin) => {
    // Check if admin already has active subscription
    if (admin.subscription_status === 'active' && admin.subscription_expires_at) {
      const expiresAt = new Date(admin.subscription_expires_at);
      if (expiresAt > new Date()) {
        toast.info("This admin already has an active subscription");
        return;
      }
    }
    setAdminToActivate(admin);
    setShowActivationDialog(true);
  };

  const openEditDialog = (admin: Admin) => {
    setAdminToEdit(admin);
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      business_name: admin.business_name || ''
    });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!adminToEdit) return;

    if (!editForm.name || !editForm.email || !editForm.business_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (editForm.phone && !/^(\+254|0)[17]\d{8}$/.test(editForm.phone)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    setIsSaving(true);

    try {
      const sessionToken = sessionStorage.getItem("kingstone_session_token");

      if (!sessionToken) {
        toast.error("Authentication session not found. Please log in again.");
        setIsSaving(false);
        return;
      }

      // Update admin in the database using RPC
      const { data, error } = await supabase.rpc('owner_update_admin', {
        p_session_token: sessionToken,
        p_admin_id: adminToEdit.id,
        p_username: editForm.name,
        p_email: editForm.email,
        p_phone: editForm.phone,
        p_business_name: editForm.business_name
      });

      if (error) {
        console.error('Update error:', error);
        toast.error("Failed to update admin: " + error.message);
        setIsSaving(false);
        return;
      }

      if (!data.success) {
        console.error('Update error:', data.error);
        toast.error("Failed to update admin: " + data.error);
        setIsSaving(false);
        return;
      }

      // Update local state
      const updatedAdmin: Admin = {
        ...adminToEdit,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        business_name: editForm.business_name
      };

      onAdminUpdate(updatedAdmin);

      toast.success("Admin updated successfully!");
      setIsEditing(false);
      setAdminToEdit(null);

      if (onLoadData) {
        onLoadData();
      }
    } catch (error: any) {
      console.error('Error updating admin:', error);
      toast.error("Failed to update admin: " + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const copyLoginUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Login URL copied to clipboard!");
    } catch (err) {
      console.error('Failed to copy URL:', err);
      toast.error('Failed to copy URL. Please copy manually.');
    }
  };

  const getSubscriptionBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'expired':
        return 'destructive';
      case 'suspended':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Generate registration code
  const generateRegistrationCode = async () => {
    if (!codeBusinessName) {
      toast.error("Please enter a business name");
      return;
    }

    // Get owner ID - try state first, then localStorage
    const effectiveOwnerId = ownerId || localStorage.getItem('ownerId');
    
    if (!effectiveOwnerId) {
      toast.error("Owner ID not available. Please refresh the page.");
      return;
    }

    setIsGeneratingCode(true);

    try {
      // Generate a random 8-character alphanumeric code
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Format code as XXXX-XXXX
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(codeExpiryDays));

      const { data, error } = await supabase
        .from('registration_codes')
        .insert({
          owner_id: effectiveOwnerId,
          code: formattedCode,
          business_name: codeBusinessName,
          subscription_type: codeSubscriptionType,
          expires_at: expiresAt.toISOString(),
          is_used: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ INSERT FAILED:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a table not found error
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          toast.error('Registration codes table not found. Please run the database migration.');
        } else if (error.message.includes('violates foreign key')) {
          toast.error('Invalid owner ID. Please log out and log in again.');
        } else if (error.message.includes('new row violates row-level security')) {
          toast.error('Permission denied. Check RLS policies in Supabase.');
        } else if (error.message.includes('duplicate key')) {
          toast.error('This code already exists. Please try again.');
        } else {
          toast.error('Failed to save: ' + error.message);
        }
        return;
      }

      setGeneratedCode(data);
      setRegistrationCodes([data, ...registrationCodes]);
      toast.success('Registration code generated and saved!');

      // Reset form
      setCodeBusinessName("");
      setShowCodeForm(false);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('Failed to generate code: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyRegistrationCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Registration code copied to clipboard!');
    } catch (err) {
      console.error('❌ Clipboard API failed:', err);
      // Fallback: try deprecated execCommand method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Registration code copied to clipboard!');
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        toast.error('Failed to copy to clipboard. Please copy manually: ' + code);
      }
    }
  };

  const shareRegistrationCode = async (code: RegistrationCode) => {
    const registrationUrl = `${window.location.origin}/admin/register?code=${code.code}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success('Registration link copied to clipboard! Share it with the potential admin.');
    } catch (err) {
      console.error('❌ Clipboard API failed:', err);
      // Fallback: try deprecated execCommand method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = registrationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Registration link copied to clipboard! Share it with the potential admin.');
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        toast.error('Failed to copy link. Please copy manually: ' + registrationUrl);
      }
    }
  };

  const revokeCode = async (codeId: string) => {
    if (!window.confirm("Are you sure you want to revoke this code? It will no longer be usable.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('registration_codes')
        .update({ is_used: true, revoked: true })
        .eq('id', codeId);

      if (error) {
        toast.error('Failed to revoke code');
        return;
      }

      toast.success('Code revoked successfully');
      loadRegistrationCodes();
    } catch (error: any) {
      console.error('Error revoking code:', error);
      toast.error('Failed to revoke code');
    }
  };

  const deleteCode = async (codeId: string) => {
    if (!window.confirm("Are you sure you want to delete this registration code? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('registration_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('Error deleting code:', error);
        if (error.status === 406 || error.status === 403 || error.code === '42501') {
          // Remove from local state only
          setRegistrationCodes(prev => prev.filter(c => c.id !== codeId));
          toast.success('Code deleted locally!');
          return;
        }
        toast.error('Failed to delete code');
        return;
      }

      toast.success('Code deleted successfully');
      setRegistrationCodes(prev => prev.filter(c => c.id !== codeId));
    } catch (error: any) {
      console.error('Error deleting code:', error);
      toast.error('Failed to delete code');
    }
  };

  const deleteUsedCodes = async () => {
    const usedCount = registrationCodes.filter(c => c.is_used).length;
    if (!window.confirm(`Are you sure you want to delete all ${usedCount} used registration codes? This action cannot be undone.`)) {
      return;
    }

    try {
      const usedCodeIds = registrationCodes.filter(c => c.is_used).map(c => c.id);
      
      const { error } = await supabase
        .from('registration_codes')
        .delete()
        .in('id', usedCodeIds);

      if (error) {
        console.error('Error deleting used codes:', error);
        if (error.status === 406 || error.status === 403 || error.code === '42501') {
          // Remove from local state only
          setRegistrationCodes(prev => prev.filter(c => !c.is_used));
          toast.success(`Deleted ${usedCount} used codes locally!`);
          return;
        }
        toast.error('Failed to delete used codes');
        return;
      }

      toast.success(`Deleted ${usedCount} used codes successfully`);
      setRegistrationCodes(prev => prev.filter(c => !c.is_used));
    } catch (error: any) {
      console.error('Error deleting used codes:', error);
      toast.error('Failed to delete used codes');
    }
  };

  const deleteAllCodes = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${registrationCodes.length} registration codes? This action cannot be undone.`)) {
      return;
    }

    try {
      const allCodeIds = registrationCodes.map(c => c.id);
      
      const { error } = await supabase
        .from('registration_codes')
        .delete()
        .in('id', allCodeIds);

      if (error) {
        console.error('Error deleting all codes:', error);
        if (error.status === 406 || error.status === 403 || error.code === '42501') {
          // Remove from local state only
          setRegistrationCodes([]);
          toast.success(`Deleted all codes locally!`);
          return;
        }
        toast.error('Failed to delete all codes');
        return;
      }

      toast.success(`Deleted all ${registrationCodes.length} codes successfully`);
      setRegistrationCodes([]);
    } catch (error: any) {
      console.error('Error deleting all codes:', error);
      toast.error('Failed to delete all codes');
    }
  };

  const copyRegistrationLink = async (code: string) => {
    const registrationUrl = `${window.location.origin}/admin/register?code=${code}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success('Registration link copied to clipboard!');
    } catch (err) {
      console.error('❌ Clipboard API failed:', err);
      // Fallback: try deprecated execCommand method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = registrationUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Registration link copied to clipboard!');
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        toast.error('Failed to copy link. Please copy manually: ' + registrationUrl);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Registration Code Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generate Registration Code</CardTitle>
              <CardDescription>
                Create a unique code to invite potential admins to register under your business
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCodeForm(!showCodeForm)}
              variant="outline"
            >
              <Key className="w-4 h-4 mr-2" />
              {showCodeForm ? 'Cancel' : 'New Code'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCodeForm && (
            <div className="space-y-4 p-4 bg-muted rounded-lg mb-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="codeBusinessName">Business Name *</Label>
                  <Input
                    id="codeBusinessName"
                    value={codeBusinessName}
                    onChange={(e) => setCodeBusinessName(e.target.value)}
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <Label htmlFor="codeSubscriptionType">Subscription Type</Label>
                  <Select value={codeSubscriptionType} onValueChange={(value: any) => setCodeSubscriptionType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotspot">Hotspot</SelectItem>
                      <SelectItem value="pppoe">PPPoE</SelectItem>
                      <SelectItem value="static">Static</SelectItem>
                      <SelectItem value="ppoe_static">PPPoE & Static</SelectItem>
                      <SelectItem value="hotspot_pppoe">Hotspot & PPPoE</SelectItem>
                      <SelectItem value="hotspot_static">Hotspot & Static</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="codeExpiryDays">Code Expires In (Days)</Label>
                  <Select value={codeExpiryDays} onValueChange={setCodeExpiryDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={generateRegistrationCode}
                disabled={isGeneratingCode || !codeBusinessName}
                className="w-full md:w-auto"
              >
                {isGeneratingCode ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
            </div>
          )}

          {generatedCode && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 mb-2">Registration Code Generated!</p>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-lg font-mono font-bold bg-white px-3 py-1 rounded border border-green-300">
                      {generatedCode.code}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyRegistrationCode(generatedCode.code)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareRegistrationCode(generatedCode)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-600">
                    Expires: {formatDate(generatedCode.expires_at)} | 
                    Business: {generatedCode.business_name} | 
                    Type: {generatedCode.subscription_type}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Share this code or the registration link with the potential admin
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Codes List */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center">
                <Key className="w-4 h-4 mr-2" />
                Recent Registration Codes
              </h4>
              {registrationCodes.length > 0 && (
                <div className="flex gap-1">
                  {registrationCodes.some(c => c.is_used) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deleteUsedCodes}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Used
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deleteAllCodes}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete All
                  </Button>
                </div>
              )}
            </div>
            {loadingCodes ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mx-auto mb-2"></div>
                Loading codes...
              </div>
            ) : registrationCodes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No registration codes generated yet
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {registrationCodes.slice(0, 5).map((code) => (
                  <div key={code.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-medium">{code.code}</code>
                        {code.is_used ? (
                          <Badge variant="secondary" className="text-xs">Used</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {code.business_name} • {code.subscription_type} • Expires: {formatDate(code.expires_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyRegistrationCode(code.code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyRegistrationLink(code.code)}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCode(code.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create New Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Admin</CardTitle>
          <CardDescription>
            Add a new administrator to manage Wi-Fi packages and clients (Owner access required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="adminName">Full Name *</Label>
              <Input
                id="adminName"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="Enter admin full name"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adminBusinessName">Business Name *</Label>
              <Input
                id="adminBusinessName"
                value={newAdminBusinessName}
                onChange={(e) => setNewAdminBusinessName(e.target.value)}
                placeholder="Enter business name"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adminUsername">Username *</Label>
              <Input
                id="adminUsername"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adminEmail">Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adminPhone">Phone (Optional - default will be used if not provided)</Label>
              <Input
                id="adminPhone"
                value={newAdminPhone}
                onChange={(e) => setNewAdminPhone(e.target.value)}
                placeholder="+254700000000"
              />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="adminSubscriptionType">Subscription Type</Label>
              <Select value={newAdminSubscriptionType} onValueChange={(value: "hotspot" | "pppoe" | "static" | "ppoe_static" | "hotspot_pppoe" | "hotspot_static") => setNewAdminSubscriptionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotspot">Hotspot</SelectItem>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="ppoe_static">PPPoE & Static</SelectItem>
                  <SelectItem value="hotspot_pppoe">Hotspot & PPPoE</SelectItem>
                  <SelectItem value="hotspot_static">Hotspot & Static</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button
                onClick={createAdmin}
                className="w-full"
                disabled={isCreating || !newAdminName || !newAdminEmail || !newAdminBusinessName || !newAdminUsername}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Subscription Pricing</p>
                <p className="text-xs text-blue-600 mt-1">
                  Hotspot (≤10K earnings): KES {subscriptionPrices.hotspot_below_10000} |
                  {'Hotspot (>10K earnings): KES '}{subscriptionPrices.hotspot_above_10000} |
                  PPPoE Static: KES {subscriptionPrices.ppoe_static_price}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admins List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Administrator Accounts</CardTitle>
              <CardDescription>
                Manage administrator access and subscription status
              </CardDescription>
            </div>
            {filter && onClearFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilter}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filter
              </Button>
            )}
          </div>
          {filter && (
            <div className="mt-2">
              <Badge variant="secondary" className="capitalize">
                Filter: {filter === 'all' ? 'All Admins' : filter}
                <span className="ml-2 text-xs">({filteredAdmins.length} of {admins.length})</span>
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No admins found</p>
              </div>
            ) : (
              filteredAdmins.map((admin) => (
                <Collapsible
                  key={admin.id}
                  open={expandedAdminId === admin.id}
                  onOpenChange={(isOpen) => setExpandedAdminId(isOpen ? admin.id : null)}
                  className="border rounded-lg"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base">{admin.business_name || admin.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">@{admin.name} • {admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSubscriptionBadgeVariant(admin.subscription_status || 'pending')}>
                          {admin.subscription_status || 'pending'}
                        </Badge>
                        {admin.subscription_type && (
                          <Badge variant="outline" className="capitalize hidden sm:inline-flex">
                            {admin.subscription_type.replace('_', ' ')}
                          </Badge>
                        )}
                        {expandedAdminId === admin.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t">
                      <div className="grid md:grid-cols-2 gap-6 mt-4">
                        {/* Contact Information */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Contact Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Username:</span>
                                <span className="font-medium">@{admin.name}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium">{admin.email}</span>
                              </div>
                              {admin.phone && (
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span className="font-medium">{admin.phone}</span>
                                </div>
                              )}
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Business:</span>
                                <span className="font-medium">{admin.business_name || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Login URL */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Login Access</h4>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate">
                                {admin.loginUrl}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyLoginUrl(admin.loginUrl)}
                                className="shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Subscription & Earnings */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Subscription Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant={getSubscriptionBadgeVariant(admin.subscription_status || 'pending')}>
                                  {admin.subscription_status || 'pending'}
                                </Badge>
                              </div>
                              <div className="flex justify-between py-1 border-b items-center">
                                <span className="text-muted-foreground">Type:</span>
                                <Select
                                  value={admin.subscription_type || 'hotspot'}
                                  onValueChange={(value) => handleChangeSubscriptionType(admin.id, value)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="hotspot">Hotspot</SelectItem>
                                    <SelectItem value="pppoe">PPPoE</SelectItem>
                                    <SelectItem value="static">Static IP</SelectItem>
                                    <SelectItem value="ppoe_static">PPPoE + Static</SelectItem>
                                    <SelectItem value="hotspot_pppoe">Hotspot + PPPoE</SelectItem>
                                    <SelectItem value="hotspot_static">Hotspot + Static</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {admin.subscription_expires_at && (
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-muted-foreground">Expires:</span>
                                  <span className="font-medium">{formatDate(admin.subscription_expires_at)}</span>
                                </div>
                              )}
                              {admin.earnings_total !== undefined && (
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-muted-foreground">Total Earnings:</span>
                                  <span className="font-medium text-green-600">KES {admin.earnings_total.toLocaleString()}</span>
                                </div>
                              )}
                              {admin.is_trial && (
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-muted-foreground">Trial:</span>
                                  <Badge variant="secondary">Active</Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Created Date */}
                          {admin.createdAt && (
                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                              <Calendar className="w-3 h-3" />
                              Created: {formatDate(admin.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(admin);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            openActivationDialog(admin);
                          }}
                          disabled={admin.subscription_status === 'active' && admin.subscription_expires_at && new Date(admin.subscription_expires_at) > new Date()}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Activate Trial
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-200 hover:bg-orange-50 shrink-0"
                              disabled={resetting === admin.id}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reset Credentials
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reset Admin Credentials</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reset <strong>{admin.name}</strong>'s login credentials?
                                <br /><br />
                                New credentials will be:
                                <br />• Username: <strong>{admin.name?.toLowerCase().replace(/\s+/g, '') || 'admin'}</strong>
                                <br />• Password: A temporary password (sent via email/SMS)
                                <br /><br />
                                {admin.email && "📧 Email notification will be sent"}
                                {admin.email && admin.phone && " and "}
                                {admin.phone && "📱 SMS notification will be sent"}
                                <br /><br />
                                The admin will be forced to change their password on next login.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleResetAdmin(admin.id)}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                {resetting === admin.id ? "Resetting..." : "Reset Credentials"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Admin
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{admin.business_name || admin.name}</strong> (@{admin.name})?
                                <br /><br />
                                <strong className="text-red-600">This action cannot be undone.</strong>
                                <br /><br />
                                This will permanently delete:
                                <br />• Admin account and credentials
                                <br />• All associated Mikrotik devices
                                <br />• All managed packages and clients
                                <br />• All payment history and earnings data
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Admin
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trial Activation Dialog */}
      <AlertDialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Admin Trial Period</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {adminToActivate && (
                <>
                  <p>
                    Activate trial access for <strong>{adminToActivate.business_name || adminToActivate.name}</strong>?
                  </p>
                  <p>
                    This will grant immediate access to the system for a trial period before payment.
                    The admin will be able to manage their WiFi hotspot and process payments during this period.
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Trial Period Details</p>
                        <p className="text-xs text-blue-600 mt-1">
                          After the trial period expires, the admin's subscription status will change to "expired" 
                          until they complete payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="trialDays">Select Trial Period</Label>
            <Select value={selectedTrialDays} onValueChange={setSelectedTrialDays}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowActivationDialog(false);
              setAdminToActivate(null);
              setSelectedTrialDays("7");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (adminToActivate) {
                  handleActivateAdmin(adminToActivate.id, parseInt(selectedTrialDays));
                }
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={activatingAdminId !== null}
            >
              {activatingAdminId ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Activating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activate Trial
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Admin Dialog */}
      <AlertDialog open={isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setAdminToEdit(null);
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Admin Information</AlertDialogTitle>
            <AlertDialogDescription>
              Update the admin account details. Changes will be saved immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Username *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-business">Business Name *</Label>
              <Input
                id="edit-business"
                value={editForm.business_name}
                onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                placeholder="Enter business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+254700000000"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Note: Changing username will affect login credentials
            </p>
            <AlertDialogFooter className="border-0 p-0 gap-2">
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEditSave}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminManagement;
