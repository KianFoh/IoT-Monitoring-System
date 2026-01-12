import { useState } from "react";
import type { Device } from "@/types/dashboard";
import { devicesApi } from "../api/devicesApi";

export function useDeviceActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", uid: "" });
  const [editForm, setEditForm] = useState({ name: "", department_id: "", is_online: false, is_active: false });

  const openAddModal = () => {
    setAddForm({ name: "", uid: "" });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
    setActionLoading(false);
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setEditForm({ name: device.name || "", department_id: "", is_online: !!device.is_online, is_active: !!device.is_active });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDevice(null);
    setActionError(null);
    setActionLoading(false);
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedDevice(null);
    setActionError(null);
    setActionLoading(false);
  };

  const handleAddSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!addForm.name.trim() || !addForm.uid.trim()) {
      setActionError("Name and UID are required.");
      return false;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      await devicesApi.create({ name: addForm.name.trim(), uid: addForm.uid.trim() });
      closeAddModal();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add device";
      setActionError(message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedDevice) return false;

    const payload: { name?: string; department_id?: number | null; is_online: boolean; is_active: boolean } = {
      is_online: editForm.is_online,
      is_active: editForm.is_active,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();
    if (editForm.department_id.trim()) payload.department_id = Number(editForm.department_id);

    try {
      setActionLoading(true);
      setActionError(null);
      await devicesApi.update(selectedDevice.id, payload);
      closeEditModal();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update device";
      setActionError(message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return false;
    try {
      setActionLoading(true);
      setActionError(null);
      await devicesApi.remove(selectedDevice.id);
      closeDeleteModal();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete device";
      setActionError(message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDevice,
    actionError,
    actionLoading,
    addForm,
    setAddForm,
    editForm,
    setEditForm,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleAddSubmit,
    handleEditSubmit,
    handleDelete,
  } as const;
}
