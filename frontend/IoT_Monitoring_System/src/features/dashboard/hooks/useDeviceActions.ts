import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Device } from "@/types/device";
import { devicesApi } from "../api/devicesApi";

export function useDeviceActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", uid: "" });
  const [editForm, setEditForm] = useState({ name: "", department_id: "", is_active: false });

  const openAddModal = () => {
    setAddForm({ name: "", uid: "" });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setEditForm({ name: device.name || "", department_id: "", is_active: !!device.is_active });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDevice(null);
    setActionError(null);
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
  };

  const addMutation = useMutation({
    mutationFn: ({ name, uid }: { name: string; uid: string }) => devicesApi.create({ name, uid }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to add device";
      setActionError(message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; department_id?: number | null; is_active: boolean } }) =>
      devicesApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to update device";
      setActionError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => devicesApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to delete device";
      setActionError(message);
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.name.trim() || !addForm.uid.trim()) {
      setActionError("Name and UID are required.");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({ name: addForm.name.trim(), uid: addForm.uid.trim() });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add device";
      setActionError(message);
      return false;
    }
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedDevice) return false;

    const payload: { name?: string; department_id?: number | null; is_active: boolean } = {
      is_active: editForm.is_active,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();
    if (editForm.department_id.trim()) payload.department_id = Number(editForm.department_id);

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedDevice.id, payload });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update device";
      setActionError(message);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return false;
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedDevice.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete device";
      setActionError(message);
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

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
