
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AccountSettingsProps {
  adminData: {
    email: string;
    businessName: string;
    profilePicture?: string;
  };
  onUpdateProfile: (data: { businessName: string; profilePicture?: string }) => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AccountSettings = ({ adminData, onUpdateProfile, onChangePassword }: AccountSettingsProps) => {
  const [businessName, setBusinessName] = useState(adminData.businessName || "");
  const [profilePicture, setProfilePicture] = useState(adminData.profilePicture || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file (PNG or JPG)");
      return;
    }

    setIsUploading(true);
    
    // Create a local URL for preview (in real app, upload to server)
    const imageUrl = URL.createObjectURL(file);
    setProfilePicture(imageUrl);
    
    setTimeout(() => {
      setIsUploading(false);
      toast.success("Profile picture updated successfully!");
    }, 1000);
  };

  const handleSaveProfile = () => {
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    onUpdateProfile({
      businessName: businessName.trim(),
      profilePicture
    });
    toast.success("Profile updated successfully!");
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    try {
      const success = await onChangePassword(oldPassword, newPassword);
      if (success) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password changed successfully!");
      } else {
        toast.error("Failed to change password. Please try again.");
      }
    } catch (error: any) {
      // Show specific error message from the server
      const errorMessage = error.message || "Failed to change password";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your business profile and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20 flex-shrink-0">
              <AvatarImage src={profilePicture} alt="Profile" />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="profilePicture" className="cursor-pointer">
                <Button variant="outline" disabled={isUploading} className="w-full sm:w-auto">
                  <Camera className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{isUploading ? "Uploading..." : "Change Picture"}</span>
                  <span className="sm:hidden">{isUploading ? "Uploading..." : "Change"}</span>
                </Button>
              </Label>
              <Input
                id="profilePicture"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePictureUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PNG or JPG, max 2MB
              </p>
            </div>
          </div>

          {/* Business Name */}
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter your WiFi business name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be shown to clients during payment
            </p>
          </div>

          <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Save Profile</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password for security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="oldPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={handleChangePassword} className="w-full sm:w-auto">
            <span className="hidden sm:inline">Change Password</span>
            <span className="sm:hidden">Change Password</span>
          </Button>
        </CardContent>
      </Card>

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Client View Preview</CardTitle>
          <CardDescription>
            How your profile will appear to clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profilePicture} alt="Business" />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {businessName || "Your Business Name"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  WiFi Packages Available
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
