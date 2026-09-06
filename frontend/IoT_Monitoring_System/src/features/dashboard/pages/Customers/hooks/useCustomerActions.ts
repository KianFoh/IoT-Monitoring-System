import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Customer } from "@/types/customer";
import { customersApi } from "../../../api/customersApi";
import { getApiErrorDetail } from "@/utils/apiErrors";

export function useCustomerActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    name: "",
    mqtt_topic: "",
    phone_no: "",
    distributor_name: "",
    distributor_id: null as number | null,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    mqtt_topic: "",
    phone_no: "",
    distributor_name: "",
    distributor_id: null as number | null,
    is_active: true,
  });

  const openAddModal = () => {
    setAddForm({ name: "", mqtt_topic: "", phone_no: "", distributor_name: "", distributor_id: null });
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
      mqtt_topic: customer.mqtt_topic || customer.name || "",
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
      mqtt_topic,
      phone_no,
      distributor_id,
    }: {
      name: string;
      mqtt_topic?: string | null;
      phone_no?: string | null;
      distributor_id?: number | null;
    }) =>
      customersApi.create({ name, mqtt_topic, phone_no, distributor_id }),
    onSuccess: () => {
      closeAddModal();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; mqtt_topic?: string | null; phone_no?: string | null; is_active?: boolean; distributor_id?: number | null };
    }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.name.trim()) {
      setActionError("Name is required");
      return false;
    }

    const phone = addForm.phone_no.trim();
    const mqttTopic = addForm.mqtt_topic.trim() || addForm.name.trim();
    try {
      setActionError(null);
      await addMutation.mutateAsync({
        name: addForm.name.trim(),
        mqtt_topic: mqttTopic,
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

    const name = editForm.name.trim();
    if (!name) {
      setActionError("Name is required");
      return false;
    }

    const phone = editForm.phone_no.trim();
    const mqttTopic = editForm.mqtt_topic.trim();
    const nextValues = {
      name,
      mqtt_topic: mqttTopic || name,
      phone_no: phone ? phone : null,
      is_active: editForm.is_active,
      distributor_id: editForm.distributor_id ?? null,
    };
    const currentValues = {
      name: selectedCustomer.name || "",
      mqtt_topic: selectedCustomer.mqtt_topic || selectedCustomer.name || "",
      phone_no: selectedCustomer.phone_no || null,
      is_active: !!selectedCustomer.is_active,
      distributor_id: selectedCustomer.distributor_id ?? null,
    };

    const payload: { name?: string; mqtt_topic?: string | null; phone_no?: string | null; is_active?: boolean; distributor_id?: number | null } = {};
    if (nextValues.name !== currentValues.name) payload.name = nextValues.name;
    if (nextValues.mqtt_topic !== currentValues.mqtt_topic) payload.mqtt_topic = nextValues.mqtt_topic;
    if (nextValues.phone_no !== currentValues.phone_no) payload.phone_no = nextValues.phone_no;
    if (nextValues.is_active !== currentValues.is_active) payload.is_active = nextValues.is_active;
    if (nextValues.distributor_id !== currentValues.distributor_id) payload.distributor_id = nextValues.distributor_id;

    if (!Object.keys(payload).length) {
      closeEditModal();
      return true;
    }

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
      setActionError("Customer is referenced by other records");
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
