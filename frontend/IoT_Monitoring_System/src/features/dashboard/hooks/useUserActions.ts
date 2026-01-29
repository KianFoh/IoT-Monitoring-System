import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { User, UserRole } from "@/types/user";
import { usersApi } from "../api/usersApi";

export function useUserActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    customer_name: "",
    customer_id: null as number | null,
    department_name: "",
    department_id: null as number | null,
    email: "",
    role: "user" as UserRole,
  });

  const [editForm, setEditForm] = useState({
    email: "",
    role: "user" as UserRole,
    is_verified: false,
    is_active: true,
  });

  const openAddModal = () => {
    setAddForm({
      customer_name: "",
      customer_id: null,
      department_name: "",
      department_id: null,
      email: "",
      role: "user",
    });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email || "",
      role: user.role,
      is_verified: !!user.is_verified,
      is_active: !!user.is_active,
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setActionError(null);
  };

  const openDeleteModal = (user: User) => {
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
    mutationFn: ({ email, department_id, role }: { email: string; department_id: number; role: UserRole }) =>
      usersApi.create({ email, department_id, role }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to add user";
      setActionError(message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { email?: string; role?: UserRole; is_verified?: boolean; is_active?: boolean };
    }) => usersApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to update user";
      setActionError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setActionError(message);
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.email.trim()) {
      setActionError("Email is required.");
      return false;
    }
    if (!addForm.customer_id) {
      setActionError("Customer is required.");
      return false;
    }
    if (!addForm.department_id) {
      setActionError("Department is required.");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({
        email: addForm.email.trim(),
        department_id: addForm.department_id,
        role: addForm.role,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add user";
      setActionError(message);
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedUser) return false;
    if (!editForm.email.trim()) {
      setActionError("Email is required.");
      return false;
    }

    const payload: { email?: string; role?: UserRole; is_verified?: boolean; is_active?: boolean } = {
      is_verified: editForm.is_verified,
      is_active: editForm.is_active,
    };

    if (editForm.email.trim()) payload.email = editForm.email.trim();
    if (editForm.role) payload.role = editForm.role;

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedUser.id, payload });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user";
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
      const message = err instanceof Error ? err.message : "Failed to delete user";
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
