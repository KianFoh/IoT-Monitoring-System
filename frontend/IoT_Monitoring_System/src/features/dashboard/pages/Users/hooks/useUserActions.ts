import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { User, UserRole } from "@/types/user";
import { usersApi } from "../../../api/usersApi";
import { getApiErrorDetail } from "@/utils/apiErrors";

export type UserDepartmentAssignment = {
  customer_name: string;
  customer_id: number | null;
  department_name: string;
  department_id: number;
};

const getUserDepartmentAssignments = (user: User): UserDepartmentAssignment[] => {
  const departmentIds = Array.isArray(user.department_ids)
    ? user.department_ids
    : user.department_id
      ? [user.department_id]
      : [];
  const departmentNames = Array.isArray(user.department_names)
    ? user.department_names
    : user.department_name
      ? [user.department_name]
      : [];
  const customerNames = Array.isArray(user.customer_names)
    ? user.customer_names
    : user.customer_name
      ? [user.customer_name]
      : [];

  return departmentIds.map((departmentId, index) => ({
    customer_name: customerNames[index] ?? user.customer_name ?? "",
    customer_id: null,
    department_name: departmentNames[index] ?? user.department_name ?? `Department ${departmentId}`,
    department_id: departmentId,
  }));
};

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
    departments: [] as UserDepartmentAssignment[],
    email: "",
    role: "user" as UserRole,
  });

  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    role: "user" as UserRole,
    is_verified: false,
    is_active: true,
    departments: [] as UserDepartmentAssignment[],
  });

  const openAddModal = () => {
    setAddForm({
      customer_name: "",
      customer_id: null,
      department_name: "",
      department_id: null,
      departments: [],
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
      password: "",
      role: user.role,
      is_verified: !!user.is_verified,
      is_active: !!user.is_active,
      departments: getUserDepartmentAssignments(user),
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
    mutationFn: ({ email, department_ids, role }: { email: string; department_ids: number[]; role: UserRole }) =>
      usersApi.create({ email, department_ids, role }),
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
      payload: {
        email?: string;
        password?: string;
        role?: UserRole;
        is_verified?: boolean;
        is_active?: boolean;
        department_ids?: number[];
      };
    }) => usersApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.email.trim()) {
      setActionError("Email is required.");
      return false;
    }
    const departmentIds = addForm.departments.map((item) => item.department_id);
    if (departmentIds.length === 0) {
      setActionError("At least one department is required.");
      return false;
    }

    try {
      setActionError(null);
      await addMutation.mutateAsync({
        email: addForm.email.trim(),
        department_ids: departmentIds,
        role: addForm.role,
      });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to add user"));
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

    const payload: {
      email?: string;
      password?: string;
      role?: UserRole;
      is_verified?: boolean;
      is_active?: boolean;
      department_ids?: number[];
    } = {
      is_verified: editForm.is_verified,
      is_active: editForm.is_active,
      department_ids: editForm.departments.map((item) => item.department_id),
    };

    if (payload.department_ids?.length === 0) {
      setActionError("At least one department is required.");
      return false;
    }

    if (editForm.email.trim()) payload.email = editForm.email.trim();
    if (editForm.password.trim()) {
      if (editForm.password.length < 5) {
        setActionError("Password must be at least 5 characters.");
        return false;
      }
      payload.password = editForm.password;
    }
    if (editForm.role) payload.role = editForm.role;

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedUser.id, payload });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to update user"));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return false;
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedUser.id);
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to delete user"));
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
