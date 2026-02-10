import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Distributor } from "@/types/distributor";
import { distributorsApi } from "../api/distributorsApi";
import { getApiErrorDetail } from "@/utils/apiErrors";
import { config } from "@/config";

export function useDistributorActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", phone_no: "" });
  const [editForm, setEditForm] = useState({ name: "", phone_no: "", is_active: true });
  const [addLogoFile, setAddLogoFile] = useState<File | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [addLogoPreview, setAddLogoPreview] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [addLogoObjectUrl, setAddLogoObjectUrl] = useState<string | null>(null);
  const [editLogoObjectUrl, setEditLogoObjectUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const MAX_LOGO_BYTES = 2 * 1024 * 1024;

  const resolveLogoUrl = (value?: string | null) => {
    if (!value) return null;
    return value.startsWith("http") ? value : `${config.api.baseUrl}${value}`;
  };

  const openAddModal = () => {
    setAddForm({ name: "", phone_no: "" });
    if (addLogoObjectUrl) {
      URL.revokeObjectURL(addLogoObjectUrl);
      setAddLogoObjectUrl(null);
    }
    setAddLogoFile(null);
    setAddLogoPreview(null);
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    if (addLogoObjectUrl) {
      URL.revokeObjectURL(addLogoObjectUrl);
      setAddLogoObjectUrl(null);
    }
    setAddLogoFile(null);
    setAddLogoPreview(null);
    setActionError(null);
  };

  const openEditModal = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setEditForm({
      name: distributor.name || "",
      phone_no: distributor.phone_no || "",
      is_active: !!distributor.is_active,
    });
    if (editLogoObjectUrl) {
      URL.revokeObjectURL(editLogoObjectUrl);
      setEditLogoObjectUrl(null);
    }
    setEditLogoFile(null);
    setEditLogoPreview(resolveLogoUrl(distributor.logo_url));
    setActionError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDistributor(null);
    if (editLogoObjectUrl) {
      URL.revokeObjectURL(editLogoObjectUrl);
      setEditLogoObjectUrl(null);
    }
    setEditLogoFile(null);
    setEditLogoPreview(null);
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

  const setLogoPreview = (
    file: File | null,
    opts: {
      setFile: (value: File | null) => void;
      setPreview: (value: string | null) => void;
      objectUrl: string | null;
      setObjectUrl: (value: string | null) => void;
    }
  ) => {
    if (opts.objectUrl) {
      URL.revokeObjectURL(opts.objectUrl);
      opts.setObjectUrl(null);
    }
    if (!file) {
      opts.setFile(null);
      opts.setPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setActionError("Please select an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setActionError("Logo must be 2MB or smaller.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    opts.setObjectUrl(objectUrl);
    opts.setFile(file);
    opts.setPreview(objectUrl);
  };

  const handleAddLogoChange = (file: File | null) => {
    setActionError(null);
    setLogoPreview(file, {
      setFile: setAddLogoFile,
      setPreview: setAddLogoPreview,
      objectUrl: addLogoObjectUrl,
      setObjectUrl: setAddLogoObjectUrl,
    });
  };

  const handleEditLogoChange = (file: File | null) => {
    setActionError(null);
    setLogoPreview(file, {
      setFile: setEditLogoFile,
      setPreview: setEditLogoPreview,
      objectUrl: editLogoObjectUrl,
      setObjectUrl: setEditLogoObjectUrl,
    });
  };

  const addMutation = useMutation({
    mutationFn: ({ name, phone_no }: { name: string; phone_no?: string | null }) =>
      distributorsApi.create({ name, phone_no }),
    onSuccess: () => {
      closeAddModal();
    },
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to add distributor"));
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
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to update distributor"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => distributorsApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
    onError: (err: unknown) => {
      setActionError(getApiErrorDetail(err, "Failed to delete distributor"));
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
      const created = await addMutation.mutateAsync({
        name: addForm.name.trim(),
        phone_no: phone ? phone : null,
      });
      if (addLogoFile && created?.id) {
        setLogoUploading(true);
        try {
          await distributorsApi.uploadLogo(created.id, addLogoFile);
        } finally {
          setLogoUploading(false);
        }
      }
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to add distributor"));
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
      if (editLogoFile) {
        setLogoUploading(true);
        try {
          await distributorsApi.uploadLogo(selectedDistributor.id, editLogoFile);
        } finally {
          setLogoUploading(false);
        }
      }
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to update distributor"));
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
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to delete distributor"));
      return false;
    }
  };

  const actionLoading =
    addMutation.isPending || editMutation.isPending || deleteMutation.isPending || logoUploading;

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
    addLogoFile,
    editLogoFile,
    addLogoPreview,
    editLogoPreview,
    handleAddLogoChange,
    handleEditLogoChange,
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
