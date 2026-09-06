import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Device, DeviceConnectivity } from "@/types/device";
import { devicesApi } from "../../../api/devicesApi";
import { wsManager } from "@/services/ws";
import { getApiErrorDetail } from "@/utils/apiErrors";

const DEFAULT_DATA_INTERVAL = 60;

export function useDeviceActions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const cellularStreamRef = useRef<{
    respKey: string;
    cmdKey: string;
    unsubscribe: () => void;
  } | null>(null);
  const previousConnectivityRef = useRef<DeviceConnectivity | null>(null);

  const [addForm, setAddForm] = useState({
    customer_name: "",
    customer_id: null as number | null,
    department_name: "",
    department_id: null as number | null,
    uid: "",
    name: "",
    machine: "",
    data_interval: String(DEFAULT_DATA_INTERVAL),
  });
  const [editForm, setEditForm] = useState({
    name: "",
    machine: "",
    connectivity: "wifi" as DeviceConnectivity,
    mobile_number: "",
    sim_id: "",
    data_interval: String(DEFAULT_DATA_INTERVAL),
    is_active: false,
  });

  const openAddModal = () => {
    setAddForm({
      customer_name: "",
      customer_id: null,
      department_name: "",
      department_id: null,
      uid: "",
      name: "",
      machine: "",
      data_interval: String(DEFAULT_DATA_INTERVAL),
    });
    setActionError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setActionError(null);
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setEditForm({
      name: device.name || "",
      machine: device.machine || "",
      connectivity: device.connectivity || "wifi",
      mobile_number: device.mobile_number || "",
      sim_id: device.sim_id || "",
      data_interval: String(device.data_interval ?? DEFAULT_DATA_INTERVAL),
      is_active: !!device.is_active,
    });
    setActionError(null);
    previousConnectivityRef.current = device.connectivity || "wifi";
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedDevice(null);
    setActionError(null);
    previousConnectivityRef.current = null;
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
    mutationFn: ({
      name,
      uid,
      department_id,
      machine,
      data_interval,
    }: {
      name: string;
      uid: string;
      department_id: number;
      machine?: string | null;
      data_interval: number;
    }) =>
      devicesApi.create({
        name,
        uid,
        department_id,
        machine,
        data_interval,
      }),
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
        name?: string;
        machine?: string | null;
        data_interval?: number;
        is_active: boolean;
        connectivity?: DeviceConnectivity;
        mobile_number?: string | null;
        sim_id?: string | null;
      };
    }) =>
      devicesApi.update(id, payload),
    onSuccess: () => {
      closeEditModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => devicesApi.remove(id),
    onSuccess: () => {
      closeDeleteModal();
    },
  });

  const handleAddSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!addForm.uid.trim()) {
      setActionError("UID is required");
      return false;
    }
    if (!addForm.name.trim()) {
      setActionError("Name is required");
      return false;
    }
    if (!addForm.customer_id) {
      setActionError("Customer is required");
      return false;
    }
    if (!addForm.department_id) {
      setActionError("Department is required");
      return false;
    }
    const intervalValue = Number(addForm.data_interval);
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
      setActionError("Data interval must be a positive number");
      return false;
    }

    try {
      setActionError(null);
      const machine = addForm.machine.trim();
      await addMutation.mutateAsync({
        name: addForm.name.trim(),
        uid: addForm.uid.trim(),
        department_id: addForm.department_id,
        machine: machine ? machine : null,
        data_interval: intervalValue,
      });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to add device"));
      return false;
    }
  };

  const handleEditSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedDevice) return false;

    const payload: {
      name?: string;
      machine?: string | null;
      data_interval?: number;
      is_active: boolean;
      connectivity?: DeviceConnectivity;
      mobile_number?: string | null;
      sim_id?: string | null;
    } = {
      is_active: editForm.is_active,
    };

    if (editForm.name.trim()) payload.name = editForm.name.trim();
    payload.machine = editForm.machine.trim() ? editForm.machine.trim() : null;
    payload.connectivity = editForm.connectivity;
    const mobileNumber = editForm.mobile_number.trim();
    const simId = editForm.sim_id.trim();
    if (editForm.connectivity === "cellular") {
      if (!mobileNumber) {
        setActionError("Mobile number is required for cellular connectivity");
        return false;
      }
      if (!simId) {
        setActionError("SIM ID is required for cellular connectivity");
        return false;
      }
    }
    payload.mobile_number = mobileNumber ? mobileNumber : null;
    payload.sim_id = simId ? simId : null;
    const intervalValue = Number(editForm.data_interval);
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
      setActionError("Data interval must be a positive number");
      return false;
    }
    payload.data_interval = intervalValue;

    try {
      setActionError(null);
      await editMutation.mutateAsync({ id: selectedDevice.id, payload });
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to update device"));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return false;
    try {
      setActionError(null);
      await deleteMutation.mutateAsync(selectedDevice.id);
      return true;
    } catch (err: unknown) {
      setActionError(getApiErrorDetail(err, "Failed to delete device"));
      return false;
    }
  };

  const actionLoading = addMutation.isPending || editMutation.isPending || deleteMutation.isPending;

  const cleanupCellularStreams = useCallback(() => {
    const current = cellularStreamRef.current;
    if (!current) return;
    current.unsubscribe();
    wsManager.disconnectStream(current.respKey);
    wsManager.disconnectStream(current.cmdKey);
    cellularStreamRef.current = null;
  }, []);

  const ensureCellularStreams = useCallback(async () => {
    if (!selectedDevice) {
      throw new Error("Device not selected");
    }
    const customer = (selectedDevice.customer_mqtt_topic || selectedDevice.customer_name)?.trim().toLowerCase();
    const department = selectedDevice.department_name?.trim().toLowerCase();
    const uid = selectedDevice.uid?.trim();
    if (!customer || !department || !uid) {
      throw new Error("Missing device routing details");
    }

    const respKey = `device-resp:${customer}/${department}/${uid}`;
    const cmdKey = `device-cmd:${customer}/${department}/${uid}`;
    const encodedCustomer = encodeURIComponent(customer);
    const encodedDepartment = encodeURIComponent(department);
    const encodedUid = encodeURIComponent(uid);
    const respPath = `/ws/devices/${encodedCustomer}/${encodedDepartment}/${encodedUid}/resp`;
    const cmdPath = `/ws/devices/${encodedCustomer}/${encodedDepartment}/${encodedUid}/cmd`;

    if (cellularStreamRef.current?.respKey !== respKey) {
      cleanupCellularStreams();
      const unsubscribe = wsManager.onStream(respKey, (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const data = payload as Record<string, unknown>;
        const nested = (data.data && typeof data.data === "object") ? (data.data as Record<string, unknown>) : null;
        const nestedPayload = (data.payload && typeof data.payload === "object")
          ? (data.payload as Record<string, unknown>)
          : null;
        const mobileValue =
          data.cellnum ??
          nested?.cellnum ??
          nestedPayload?.cellnum;
        const simValue =
          data.iccid ??
          nested?.iccid ??
          nestedPayload?.iccid;
        if (mobileValue == null && simValue == null) return;
        setEditForm((prev) => ({
          ...prev,
          mobile_number: mobileValue != null ? String(mobileValue) : prev.mobile_number,
          sim_id: simValue != null ? String(simValue) : prev.sim_id,
        }));
      });
      cellularStreamRef.current = { respKey, cmdKey, unsubscribe };
    }

    await Promise.all([
      wsManager.connectStream(respKey, respPath),
      wsManager.connectStream(cmdKey, cmdPath),
    ]);

    return { respKey, cmdKey };
  }, [cleanupCellularStreams, selectedDevice, setEditForm]);

  useEffect(() => {
    if (!showEditModal) {
      cleanupCellularStreams();
    }
  }, [showEditModal, cleanupCellularStreams]);

  useEffect(() => {
    if (!selectedDevice) {
      cleanupCellularStreams();
    }
  }, [selectedDevice, cleanupCellularStreams]);

  useEffect(() => {
    if (editForm.connectivity !== "cellular") {
      cleanupCellularStreams();
    }
  }, [editForm.connectivity, cleanupCellularStreams]);

  useEffect(() => {
    if (!showEditModal || !selectedDevice) return;
    const previous = previousConnectivityRef.current;
    if (editForm.connectivity === "cellular" && previous !== "cellular") {
      ensureCellularStreams()
        .then(({ cmdKey }) => {
          wsManager.sendStream(cmdKey, "chkiccid");
          wsManager.sendStream(cmdKey, "chkcellnum");
        })
        .catch((err: unknown) => {
          setActionError(getApiErrorDetail(err, "Failed to fetch cellular info"));
        });
    }
    previousConnectivityRef.current = editForm.connectivity;
  }, [showEditModal, selectedDevice, editForm.connectivity, ensureCellularStreams]);

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
