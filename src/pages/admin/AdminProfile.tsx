import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Key, Eye, EyeOff, User, Camera } from "lucide-react";
import { db, storage, logActivity } from "../../utils/storage";
import type { User as UserType } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminProfile() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo || null);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setError("");
    setSuccess("");
    
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }
    
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    
    setIsLoading(true);
    
    const users = db.getAll<UserType>("users");
    const currentUser = users.find(u => u.id === user?.id);
    
    if (currentUser) {
      db.update<UserType>("users", currentUser.id, {
        name: formData.name,
        email: formData.email,
        photo: photoPreview,
      });
      
      const storedUser = storage.get<UserType>("currentUser");
      if (storedUser) {
        storage.set("currentUser", { ...storedUser, name: formData.name, email: formData.email, photo: photoPreview });
      }
      
      if (formData.newPassword) {
        if (formData.currentPassword !== currentUser.password) {
          setError("Current password is incorrect");
          setIsLoading(false);
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError("New passwords do not match");
          setIsLoading(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          setError("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }
        
        db.update<UserType>("users", currentUser.id, { password: formData.newPassword });
        if (storedUser) storage.set("currentUser", { ...storedUser, password: formData.newPassword });
      }
      
      logActivity("Admin updated profile", "admin", currentUser.id, user?.id || "");
      setSuccess("Profile updated successfully!");
      
      setTimeout(() => {
        if (formData.newPassword) {
          logout();
          setLocation("/login");
        } else {
          window.location.reload();
        }
      }, 1500);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/dashboard")} className="p-2 hover:bg-accent rounded"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-foreground">Admin Profile</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {photoPreview ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-primary" />}
            </div>
            <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer">
              <Camera className="w-4 h-4 text-primary-foreground" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click camera to upload photo</p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>}

        <div className="space-y-4">
          <div><label className="text-sm font-medium">Full Name</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-input rounded-lg mt-1" /></div>
          <div><label className="text-sm font-medium">Email Address</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-input rounded-lg mt-1" /></div>
          
          <div className="border-t pt-4 mt-2"><h3 className="font-semibold mb-3">Change Password</h3></div>
          <div><label className="text-sm font-medium">Current Password</label><div className="relative mt-1"><input type={showPassword ? "text" : "password"} value={formData.currentPassword} onChange={e => setFormData({ ...formData, currentPassword: e.target.value })} className="w-full px-3 py-2 border rounded pr-10" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
          <div><label className="text-sm font-medium">New Password</label><div className="relative mt-1"><input type={showNewPassword ? "text" : "password"} value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} className="w-full px-3 py-2 border rounded pr-10" /><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div><p className="text-xs text-muted-foreground mt-1">Leave blank to keep current password</p></div>
          <div><label className="text-sm font-medium">Confirm New Password</label><input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-3 py-2 border rounded mt-1" /></div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={isLoading} className="flex-1 bg-primary text-primary-foreground py-2 rounded font-medium flex items-center justify-center gap-2"><Save className="w-4 h-4" />{isLoading ? "Saving..." : "Save Changes"}</button>
          <button onClick={() => setLocation("/dashboard")} className="flex-1 border border-input py-2 rounded">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}