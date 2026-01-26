import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Distributor } from "@/types/distributor";
import { distributorsApi } from "../api/distributorsApi";

export function useDistributorActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", phone_no: "" });
  const [editForm, setEditForm] = useState({ name: "", phone_no: "", is_active: true });

  const openAddModal = () => {
    setAddForm({ name: "", phone_no: "" });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setEditForm({
      name: distributor.name || "",
      phone_no: distributor.phone_no || "",
      is_active: !!distributor.is_active,
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDistributor(null);
    setActionError(null);
  };

  const openDeleteModal = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedDistributor(null);
    setActionError(null);
  };

  const addMutation = useMutation({
    mutationFn: ({ name, phone_no }: { name: string; phone_no?: string | null }) =>
      distributorsApi.create({ name, phone_no }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to add distributor";
      setActionError(message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; phone_no?: string | null; is_active?: boolean };
    }) => distributorsApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to update distributor";
      setActionError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => distributorsApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : "Failed to delete distributor";
      setActionError(message);
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.name.trim()) {
      setActionError("Name is required.");
      return false;
    }

    const phone = addForm.phone_no.trim();
    try {
      setActionError(null);
      await addMutation.mutateAsync({
        name: addForm.name.trim(),
        phone_no: phone ? phone : null,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add distributor";
      setActionError(message);
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedDistributor) return false;

    const phone = editForm.phone_no.trim();
    const payload: { name?: string; phone_no?: string | null; is_active?: boolean } = {
      phone_no: phone ? phone : null,
      is_active: editForm.is_active,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedDistributor.id, payload });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update distributor";
      setActionError(message);
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDistributor) return false;
    if (!selectedDistributor.is_deletable) {
      setActionError("Distributor is referenced by other records.");
      return false;
    }
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedDistributor.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete distributor";
      setActionError(message);
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  return {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedDistributor,
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
