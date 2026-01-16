import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { MqttUser } from "@/types/mqttUser";
import { mqttUsersApi } from "../api/mqttUsersApi";

export function useMqttUserActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<MqttUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [originalPassword, setOriginalPassword] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    customer_name: "",
    customer_id: null as number | null,
  });
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    is_active: true,
  });

  const openAddModal = () => {
    setAddForm({ username: "", password: "", customer_name: "", customer_id: null });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (user: MqttUser) => {
    setSelectedUser(user);
    setOriginalPassword(null);
    setEditForm({
      username: user.username || "",
      password: "",
      is_active: !!user.is_active,
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setOriginalPassword(null);
    setActionError(null);
  };

  const openDeleteModal = (user: MqttUser) => {
    setSelectedUser(user);
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
    setActionError(null);
  };

  const addMutation = useMutation({
    mutationFn: ({ username, password, customer_id }: { username: string; password: string; customer_id: number }) =>
      mqttUsersApi.create({ username, password, customer_id }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to add MQTT user";
      setActionError(message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { username?: string; password?: string; is_active?: boolean } }) =>
      mqttUsersApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to update MQTT user";
      setActionError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mqttUsersApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to delete MQTT user";
      setActionError(message);
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.username.trim()) {
      setActionError("Username is required.");
      return false;
    }
    if (!addForm.password.trim()) {
      setActionError("Password is required.");
      return false;
    }
    if (!addForm.customer_id) {
      setActionError("Invalid customer.");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({
        username: addForm.username.trim(),
        password: addForm.password,
        customer_id: addForm.customer_id,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add MQTT user";
      setActionError(message);
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedUser) return false;
    if (!editForm.username.trim()) {
      setActionError("Username is required.");
      return false;
    }

    const payload: { username?: string; password?: string; is_active?: boolean } = {
      is_active: editForm.is_active,
    };

    if (editForm.username.trim()) payload.username = editForm.username.trim();
    if (editForm.password.trim()) {
      if (originalPassword === null || editForm.password !== originalPassword) {
        payload.password = editForm.password;
      }
    }

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedUser.id, payload });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update MQTT user";
      setActionError(message);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return false;
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedUser.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete MQTT user";
      setActionError(message);
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  return {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedUser,
    actionError,
    actionLoading,
    originalPassword,
    setOriginalPassword,
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
