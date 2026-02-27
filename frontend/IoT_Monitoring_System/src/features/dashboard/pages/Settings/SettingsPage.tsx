import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/Button/Button";
import type { User } from "@/types/user";
import { useAuth } from "@/features/auth/context/AuthContext";
import { config } from "@/config";
import { getApiErrorDetail } from "@/utils/apiErrors";
import { usersApi } from "../../api/usersApi";
import { SettingsPageModals } from "./SettingsPageModals";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState(user?.username ?? "");
  const [profilePreview, setProfilePreview] = useState<string | null>(() => {
    const value = user?.profile_picture;
    if (!value) return null;
    return value.startsWith("http") ? value : `${config.api.baseUrl}${value}`;
  });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileObjectUrl, setProfileObjectUrl] = useState<string | null>(null);
  const [removeProfile, setRemoveProfile] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resolveProfileUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) return value;
    return `${config.api.baseUrl}${value}`;
  };

  const clearProfileObjectUrl = () => {
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    setProfileObjectUrl(null);
  };

  const resetProfileDraft = (options?: { keepSuccess?: boolean }) => {
    clearProfileObjectUrl();
    setUsername(user?.username ?? "");
    setProfilePreview(resolveProfileUrl(user?.profile_picture));
    setProfileFile(null);
    setRemoveProfile(false);
    setSaveError(null);
    if (!options?.keepSuccess) {
      setSaveSuccess(null);
    }
  };

  const resetPasswordDraft = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    resetProfileDraft();
    setIsEditModalOpen(false);
    setIsPasswordModalOpen(false);
    resetPasswordDraft();
  }, [user]);

  const initials = useMemo(() => {
    const trimmedUsername = username.trim();
    if (trimmedUsername) {
      const parts = trimmedUsername.split(/[\s@._-]+/).filter(Boolean);
      const letters = parts.slice(0, 3).map((part: string) => part[0]?.toUpperCase() ?? "");
      return letters.join("") || "U";
    }
    const email = (user?.email || "").trim();
    return email ? email[0]?.toUpperCase() ?? "U" : "U";
  }, [username, user?.email]);

  const displayUsername = user?.username?.trim() || "-";
  const displayEmail = user?.email || "-";
  const displayRole = user?.role || "-";

  const handleOpenEdit = () => {
    resetProfileDraft();
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    resetProfileDraft();
    setIsEditModalOpen(false);
  };

  const handleOpenPassword = () => {
    resetPasswordDraft();
    setIsPasswordModalOpen(true);
  };

  const handleClosePassword = () => {
    resetPasswordDraft();
    setIsPasswordModalOpen(false);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveError("Please select an image file.");
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSaveError("Image must be 2MB or smaller.");
      return;
    }
    clearProfileObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    setProfileObjectUrl(objectUrl);
    setProfilePreview(objectUrl);
    setProfileFile(file);
    setRemoveProfile(false);
    setSaveError(null);
  };

  const handleRemoveImage = () => {
    clearProfileObjectUrl();
    setProfilePreview(null);
    setProfileFile(null);
    setRemoveProfile(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSaveError("User not loaded.");
      return;
    }

    const trimmedUsername = username.trim();
    const hasUsernameChange = trimmedUsername !== (user.username ?? "");
    const hasProfileChange = removeProfile || !!profileFile;

    if (!hasUsernameChange && !hasProfileChange) {
      setSaveError("No changes to save.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      let updatedUser = user;

      if (removeProfile) {
        updatedUser = await usersApi.removeProfilePicture();
      }
      if (profileFile) {
        updatedUser = await usersApi.uploadProfilePicture(profileFile);
      }
      if (hasUsernameChange) {
        updatedUser = await usersApi.update(user.id, {
          username: trimmedUsername.length ? trimmedUsername : null,
        });
      }

      setUser((prev: User | null) => (prev ? { ...prev, ...updatedUser } : updatedUser));
      setProfileFile(null);
      setRemoveProfile(false);
      setSaveSuccess("Profile updated.");
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      setSaveError(getApiErrorDetail(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setPasswordError("User not loaded.");
      return;
    }

    const trimmedOld = oldPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedOld || !trimmedNew || !trimmedConfirm) {
      setPasswordError("Please fill all password fields.");
      return;
    }
    if (trimmedNew.length < 5) {
      setPasswordError("Password must be at least 5 characters.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordError(null);
      await usersApi.changePassword({
        old_password: trimmedOld,
        new_password: trimmedNew,
        confirm_password: trimmedConfirm,
      });
      setSaveSuccess("Password updated.");
      setIsPasswordModalOpen(false);
    } catch (err: unknown) {
      setPasswordError(getApiErrorDetail(err, "Failed to update password."));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className={styles["settings-container"]}>
      <div className={styles["settings-header"]}>
        <h1>Settings</h1>
        <p>Manage your account details</p>
      </div>

      <div className={styles["settings-panel"]}>
        <div className={styles["settings-panel-header"]}>
          <h2>Profile</h2>
        </div>

        <div className={styles["settings-avatar-row"]}>
          <div className={styles["settings-avatar"]} aria-hidden="true">
            {profilePreview ? (
              <img src={profilePreview} alt="Profile" />
            ) : (
              <span className={styles["settings-avatar-placeholder"]}>{initials}</span>
            )}
          </div>
        </div>

        <div className={styles["settings-info-card"]}>
          <div className={styles["settings-form-grid"]}>
            <div className={styles["settings-readonly-item"]}>
              <span className={styles["settings-readonly-label"]}>Username</span>
              <span
                className={[
                  styles["settings-readonly-value"],
                  !user?.username?.trim() ? styles["settings-readonly-muted"] : "",
                ].filter(Boolean).join(" ")}
              >
                {displayUsername}
              </span>
            </div>
            <div className={styles["settings-readonly-item"]}>
              <span className={styles["settings-readonly-label"]}>Email</span>
              <span className={styles["settings-readonly-value"]}>{displayEmail}</span>
            </div>
            <div className={styles["settings-readonly-item"]}>
              <span className={styles["settings-readonly-label"]}>Role</span>
              <span className={styles["settings-readonly-value"]}>{displayRole}</span>
            </div>
          </div>
        </div>

      {saveSuccess && <p className={styles["settings-success"]}>{saveSuccess}</p>}
      </div>

      <div className={styles["settings-secondary-actions"]}>
        <Button
          type="button"
          onClick={handleOpenEdit}
          className={styles["settings-action-button"]}
        >
          Edit profile
        </Button>
        <Button
          type="button"
          onClick={handleOpenPassword}
          className={styles["settings-action-button"]}
        >
          Change password
        </Button>
      </div>

      <SettingsPageModals
        modalState={{
          isEditOpen: isEditModalOpen,
          isPasswordOpen: isPasswordModalOpen,
          saveError,
          saving,
          passwordError,
          passwordSaving,
        }}
        profile={{
          fileInputRef,
          profilePreview,
          initials,
          username,
          onUsernameChange: setUsername,
          onPickImage: handlePickImage,
          onImageChange: handleImageChange,
          onRemoveImage: handleRemoveImage,
        }}
        password={{
          oldPassword,
          newPassword,
          confirmPassword,
          showOldPassword,
          showNewPassword,
          showConfirmPassword,
          onOldPasswordChange: setOldPassword,
          onNewPasswordChange: setNewPassword,
          onConfirmPasswordChange: setConfirmPassword,
          onToggleOldPassword: () => setShowOldPassword((prev) => !prev),
          onToggleNewPassword: () => setShowNewPassword((prev) => !prev),
          onToggleConfirmPassword: () => setShowConfirmPassword((prev) => !prev),
        }}
        actions={{
          onCloseEdit: handleCloseEdit,
          onClosePassword: handleClosePassword,
          onSaveProfile: handleSave,
          onSavePassword: handlePasswordSave,
        }}
      />
    </div>
  );
}
