
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import type { User } from "@/types/user";
import { useAuth } from "@/features/auth/context/AuthContext";
import { config } from "@/config";
import { getApiErrorDetail } from "@/utils/apiErrors";
import { usersApi } from "../api/usersApi";
import styles from "../styles/dashboard.module.css";

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

  useEffect(() => {
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    setProfileObjectUrl(null);
    setUsername(user?.username ?? "");
    setProfilePreview(resolveProfileUrl(user?.profile_picture));
    setProfileFile(null);
    setRemoveProfile(false);
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditModalOpen(false);
    setIsPasswordModalOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    setProfileObjectUrl(null);
    setUsername(user?.username ?? "");
    setProfilePreview(resolveProfileUrl(user?.profile_picture));
    setProfileFile(null);
    setRemoveProfile(false);
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    setProfileObjectUrl(null);
    setUsername(user?.username ?? "");
    setProfilePreview(resolveProfileUrl(user?.profile_picture));
    setProfileFile(null);
    setRemoveProfile(false);
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditModalOpen(false);
  };

  const handleOpenPassword = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordModalOpen(true);
  };

  const handleClosePassword = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setProfileObjectUrl(objectUrl);
    setProfilePreview(objectUrl);
    setProfileFile(file);
    setRemoveProfile(false);
    setSaveError(null);
  };

  const handleRemoveImage = () => {
    if (profileObjectUrl) {
      URL.revokeObjectURL(profileObjectUrl);
    }
    setProfileObjectUrl(null);
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

      <Modal isOpen={isEditModalOpen} onClose={handleCloseEdit} title="Edit profile">
        <form className={styles["settings-modal-form"]} onSubmit={handleSave}>
          <div className={styles["settings-modal-avatar"]}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles["settings-file-input"]}
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={handlePickImage}
              className={[
                styles["settings-avatar"],
                styles["settings-avatar-editable"],
                styles["settings-avatar-modal"],
              ].join(" ")}
              aria-label="Change profile picture"
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" />
              ) : (
                <span className={styles["settings-avatar-placeholder"]}>{initials}</span>
              )}
              <span className={styles["settings-avatar-overlay"]}>Edit</span>
            </button>
            <span className={styles["settings-modal-help"]}>PNG/JPG up to 2MB.</span>
            {profilePreview && (
              <button
                type="button"
                className={styles["settings-avatar-remove"]}
                onClick={handleRemoveImage}
              >
                Remove photo
              </button>
            )}
          </div>

          <Input
            id="settings-username"
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            inputClassName={styles["settings-input"]}
          />

          {saveError && <p className={styles["dashboard-modal-error"]}>{saveError}</p>}

          <div className={styles["settings-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={handleCloseEdit}
              className={styles["settings-action-button"]}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} className={styles["settings-action-button"]}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={handleClosePassword} title="Change password">
        <form className={styles["settings-modal-form"]} onSubmit={handlePasswordSave}>
          <Input
            id="settings-old-password"
            label="Old password"
            type={showOldPassword ? "text" : "password"}
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            rightIcon={showOldPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showOldPassword ? "Hide password" : "Show password"}
            onRightIconClick={() => setShowOldPassword((prev) => !prev)}
            inputClassName={styles["settings-input"]}
          />
          <Input
            id="settings-new-password"
            label="New password"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            rightIcon={showNewPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showNewPassword ? "Hide password" : "Show password"}
            onRightIconClick={() => setShowNewPassword((prev) => !prev)}
            inputClassName={styles["settings-input"]}
          />
          <Input
            id="settings-confirm-password"
            label="Confirm new password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            rightIcon={showConfirmPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showConfirmPassword ? "Hide password" : "Show password"}
            onRightIconClick={() => setShowConfirmPassword((prev) => !prev)}
            inputClassName={styles["settings-input"]}
          />

          {passwordError && <p className={styles["dashboard-modal-error"]}>{passwordError}</p>}

          <div className={styles["settings-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={handleClosePassword}
              className={styles["settings-action-button"]}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={passwordSaving} className={styles["settings-action-button"]}>
              Update password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
