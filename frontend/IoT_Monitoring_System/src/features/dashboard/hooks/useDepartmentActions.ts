import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Department } from "@/types/department";
import { departmentsApi } from "../api/departmentsApi";

export function useDepartmentActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", customer_name: "", customer_id: null as number | null });
  const [editForm, setEditForm] = useState({ name: "", is_active: true });

  const openAddModal = () => {
    setAddForm({ name: "", customer_name: "", customer_id: null });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setEditForm({
      name: department.name || "",
      is_active: !!department.is_active,
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDepartment(null);
    setActionError(null);
  };

  const openDeleteModal = (department: Department) => {
    setSelectedDepartment(department);
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedDepartment(null);
    setActionError(null);
  };

  const addMutation = useMutation({
    mutationFn: ({ name, customer_id }: { name: string; customer_id: number }) =>
      departmentsApi.create({ name, customer_id }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to add department";
      setActionError(message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; is_active?: boolean } }) =>
      departmentsApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to update department";
      setActionError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to delete department";
      setActionError(message);
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.name.trim()) {
      setActionError("Name is required.");
      return false;
    }
    if (!addForm.customer_id) {
      setActionError("Invalid customer.");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({
        name: addForm.name.trim(),
        customer_id: addForm.customer_id,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add department";
      setActionError(message);
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedDepartment) return false;

    const payload: { name?: string; is_active?: boolean } = {
      is_active: editForm.is_active,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedDepartment.id, payload });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update department";
      setActionError(message);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return false;
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedDepartment.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete department";
      setActionError(message);
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  return {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDepartment,
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
