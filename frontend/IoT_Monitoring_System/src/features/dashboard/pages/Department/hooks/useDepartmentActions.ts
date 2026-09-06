import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Department } from "@/types/department";
import { departmentsApi } from "../../../api/departmentsApi";
import { getApiErrorDetail } from "@/utils/apiErrors";

export function useDepartmentActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", mqtt_topic: "", customer_name: "", customer_id: null as number | null });
  const [editForm, setEditForm] = useState({ name: "", mqtt_topic: "", is_active: true });

  const openAddModal = () => {
    setAddForm({ name: "", mqtt_topic: "", customer_name: "", customer_id: null });
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
      mqtt_topic: department.mqtt_topic || department.name || "",
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
    mutationFn: ({ name, mqtt_topic, customer_id }: { name: string; mqtt_topic?: string | null; customer_id: number }) =>
      departmentsApi.create({ name, mqtt_topic, customer_id }),
    onSuccess: () => {
      closeAddModal();
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name?: string; mqtt_topic?: string | null; is_active?: boolean } }) =>
      departmentsApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentsApi.remove(id),
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
    if (!addForm.customer_id) {
      setActionError("Invalid customer");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({
        name: addForm.name.trim(),
        mqtt_topic: addForm.mqtt_topic.trim() || addForm.name.trim(),
        customer_id: addForm.customer_id,
      });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to add department"));
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedDepartment) return false;

    const nextValues = {
      name: editForm.name.trim(),
      mqtt_topic: editForm.mqtt_topic.trim() || editForm.name.trim(),
      is_active: editForm.is_active,
    };
    const currentValues = {
      name: selectedDepartment.name || "",
      mqtt_topic: selectedDepartment.mqtt_topic || selectedDepartment.name || "",
      is_active: !!selectedDepartment.is_active,
    };
    const payload: { name?: string; mqtt_topic?: string | null; is_active?: boolean } = {};

    if (nextValues.name && nextValues.name !== currentValues.name) payload.name = nextValues.name;
    if (nextValues.mqtt_topic !== currentValues.mqtt_topic) payload.mqtt_topic = nextValues.mqtt_topic;
    if (nextValues.is_active !== currentValues.is_active) payload.is_active = nextValues.is_active;

    if (Object.keys(payload).length === 0) {
      closeEditModal();
      return true;
    }

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedDepartment.id, payload });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to update department"));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return false;
    if (!selectedDepartment.is_deletable) {
      setActionError("Department is referenced by other records");
      return false;
    }
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedDepartment.id);
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to delete department"));
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
