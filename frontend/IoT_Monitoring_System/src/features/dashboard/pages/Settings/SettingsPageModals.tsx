import type { ChangeEvent, FormEvent, RefObject } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { Modal } from "@/components/Modal/Modal";
import styles from "./SettingsPage.module.css";
import formStyles from "../../components/DashboardForm/DashboardForm.module.css";

type SettingsPageModalsProps = {
  modalState: {
    isEditOpen: boolean;
    isPasswordOpen: boolean;
    saveError: string | null;
    saving: boolean;
    passwordError: string | null;
    passwordSaving: boolean;
  };
  profile: {
    fileInputRef: RefObject<HTMLInputElement | null>;
    profilePreview: string | null;
    initials: string;
    username: string;
    onUsernameChange: (value: string) => void;
    onPickImage: () => void;
    onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
  };
  password: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
    showOldPassword: boolean;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    onOldPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onToggleOldPassword: () => void;
    onToggleNewPassword: () => void;
    onToggleConfirmPassword: () => void;
  };
  actions: {
    onCloseEdit: () => void;
    onClosePassword: () => void;
    onSaveProfile: (event: FormEvent) => void;
    onSavePassword: (event: FormEvent) => void;
  };
};

export function SettingsPageModals({
  modalState,
  profile,
  password,
  actions,
}: SettingsPageModalsProps) {
  const { isEditOpen, isPasswordOpen, saveError, saving, passwordError, passwordSaving } =
    modalState;
  const {
    fileInputRef,
    profilePreview,
    initials,
    username,
    onUsernameChange,
    onPickImage,
    onImageChange,
    onRemoveImage,
  } = profile;
  const {
    oldPassword,
    newPassword,
    confirmPassword,
    showOldPassword,
    showNewPassword,
    showConfirmPassword,
    onOldPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onToggleOldPassword,
    onToggleNewPassword,
    onToggleConfirmPassword,
  } = password;
  const { onCloseEdit, onClosePassword, onSaveProfile, onSavePassword } = actions;

  return (
    <>
      <Modal isOpen={isEditOpen} onClose={onCloseEdit} title="Edit profile">
        <form className={styles["settings-modal-form"]} onSubmit={onSaveProfile}>
          <div className={styles["settings-modal-avatar"]}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles["settings-file-input"]}
              onChange={onImageChange}
            />
            <button
              type="button"
              onClick={onPickImage}
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
                onClick={onRemoveImage}
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
            onChange={(e) => onUsernameChange(e.target.value)}
            inputClassName={styles["settings-input"]}
          />

          {saveError && <p className={formStyles["dashboard-modal-error"]}>{saveError}</p>}

          <div className={styles["settings-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={onCloseEdit}
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

      <Modal isOpen={isPasswordOpen} onClose={onClosePassword} title="Change password">
        <form className={styles["settings-modal-form"]} onSubmit={onSavePassword}>
          <Input
            id="settings-old-password"
            label="Old password"
            type={showOldPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter current password"
            value={oldPassword}
            onChange={(e) => onOldPasswordChange(e.target.value)}
            rightIcon={showOldPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showOldPassword ? "Hide password" : "Show password"}
            onRightIconClick={onToggleOldPassword}
            inputClassName={styles["settings-input"]}
          />
          <Input
            id="settings-new-password"
            label="New password"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            rightIcon={showNewPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showNewPassword ? "Hide password" : "Show password"}
            onRightIconClick={onToggleNewPassword}
            inputClassName={styles["settings-input"]}
          />
          <Input
            id="settings-confirm-password"
            label="Confirm new password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Enter new password again"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            rightIcon={showConfirmPassword ? FaEyeSlash : FaEye}
            rightIconLabel={showConfirmPassword ? "Hide password" : "Show password"}
            onRightIconClick={onToggleConfirmPassword}
            inputClassName={styles["settings-input"]}
          />

          {passwordError && <p className={formStyles["dashboard-modal-error"]}>{passwordError}</p>}

          <div className={styles["settings-actions"]}>
            <Button
              type="button"
              variant="cancel"
              onClick={onClosePassword}
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
    </>
  );
}
