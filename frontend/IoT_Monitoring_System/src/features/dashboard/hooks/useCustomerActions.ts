import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Customer } from "@/types/customer";
import { customersApi } from "../api/customersApi";
import { getApiErrorDetail } from "@/utils/apiErrors";

export function useCustomerActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    phone_no: "",
    distributor_name: "",
    distributor_id: null as number | null,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    phone_no: "",
    distributor_name: "",
    distributor_id: null as number | null,
    is_active: true,
  });

  const openAddModal = () => {
    setAddForm({ name: "", phone_no: "", distributor_name: "", distributor_id: null });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone_no: customer.phone_no || "",
      distributor_name: customer.distributor_name || "",
      distributor_id: customer.distributor_id ?? null,
      is_active: !!customer.is_active,
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedCustomer(null);
    setActionError(null);
  };

  const openDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActionError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCustomer(null);
    setActionError(null);
  };

  const addMutation = useMutation({
    mutationFn: ({
      name,
      phone_no,
      distributor_id,
    }: {
      name: string;
      phone_no?: string | null;
      distributor_id?: number | null;
    }) =>
      customersApi.create({ name, phone_no, distributor_id }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to add customer"));
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; phone_no?: string | null; is_active?: boolean; distributor_id?: number | null };
    }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to update customer"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to delete customer"));
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
        distributor_id: addForm.distributor_id ?? null,
      });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to add customer"));
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedCustomer) return false;

    const phone = editForm.phone_no.trim();
    const payload: { name?: string; phone_no?: string | null; is_active?: boolean; distributor_id?: number | null } = {
      phone_no: phone ? phone : null,
      is_active: editForm.is_active,
      distributor_id: editForm.distributor_id ?? null,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedCustomer.id, payload });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to update customer"));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return false;
    if (!selectedCustomer.is_deletable) {
      setActionError("Customer is referenced by other records.");
      return false;
    }
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedCustomer.id);
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to delete customer"));
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  return {
    showAddModal,
    showEditModal,
    showDeleteModal,
    selectedCustomer,
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
