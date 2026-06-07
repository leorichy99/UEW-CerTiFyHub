import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";
import { useToast } from "../components/ToastContainer";
import { Camera, User, Lock, Save, Loader2, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        username: user.username || "",
      });
      setAvatarPreview(user.profile?.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...profileForm };
      if (avatarFile) payload.avatar = avatarFile;
      else if (avatarPreview === null) payload.avatar = null;

      await profileAPI.update(payload);
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.username?.[0] || "Failed to update profile.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await profileAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password changed successfully.");
    } catch (err) {
      const msg = err.response?.data?.current_password?.[0] || err.response?.data?.detail || "Failed to change password.";
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : (user?.username?.[0] || "U").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Profile Settings</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Manage your personal information and account security.
        </p>
      </div>

      {/* Profile Information Card */}
      <section className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <User size={20} className="text-[var(--color-text-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile Information</h3>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-[var(--color-border)]">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[#242576]">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-7 w-7 bg-[var(--color-text-primary)] text-white rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-md"
                title="Change photo"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Profile Picture</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-[var(--color-text-primary)] hover:bg-slate-200 transition-colors font-medium"
                >
                  Upload
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, first_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((p) => ({ ...p, last_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={profileForm.username}
                onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] bg-slate-50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-text-primary)] text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Card */}
      <section className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock size={20} className="text-[var(--color-text-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? "text" : "password"}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                required
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => ({ ...s, current: !s.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                required
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? "text" : "password"}
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
                required
                minLength={8}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-text-primary)] text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {changingPassword ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
