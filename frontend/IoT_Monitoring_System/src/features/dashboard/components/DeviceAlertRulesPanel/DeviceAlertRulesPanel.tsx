import { useMemo, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { FaPlus } from "react-icons/fa";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import type {
  AlertRule,
  AlertRuleCreatePayload,
  AlertRuleFieldType,
  AlertRuleOperator,
  AlertRuleUpdatePayload,
} from "@/types/alertRule";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import { DataTable } from "../DataTable/DataTable";
import PageSizeSelect from "../PageSizeSelect/PageSizeSelect";
import Pagination from "../Pagination/Pagination";
import SearchFilter from "../SearchFilter/SearchFilter";
import { TableActions } from "../TableActions/TableActions";
import badgeStyles from "../../styles/StatusBadge.module.css";
import formStyles from "../DashboardForm/DashboardForm.module.css";
import styles from "./DeviceAlertRulesPanel.module.css";

type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

type DeviceAlertRulesPanelProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  rules?: readonly AlertRule[];
  deviceId?: number;
  availableFields?: string[];
  getFieldLabel?: (field: string) => string;
  getFieldType?: (field: string) => AlertRuleFieldType;
  getFieldCases?: (field: string) => string[];
  getFieldBooleanLabels?: (field: string) => { trueLabel: string; falseLabel: string };
  disabled?: boolean;
  readOnly?: boolean;
  addError?: string | null;
  adding?: boolean;
  updating?: boolean;
  deleting?: boolean;
  onAddRule?: (payload: AlertRuleCreatePayload) => Promise<unknown>;
  onUpdateRule?: (id: number, payload: AlertRuleUpdatePayload) => Promise<unknown>;
  onDeleteRule?: (alertRuleId: number) => Promise<unknown>;
};

const TEXT_OPERATOR_OPTIONS: DisplayOption<AlertRuleOperator>[] = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: "in", label: "in" },
  { value: "not in", label: "not in" },
];

const NUMBER_OPERATOR_OPTIONS: DisplayOption<AlertRuleOperator>[] = [
  { value: "==", label: "==" },
  { value: "<", label: "<" },
  { value: ">", label: ">" },
  { value: "<=", label: "<=" },
  { value: ">=", label: ">=" },
];

const BOOLEAN_OPERATOR_OPTIONS: DisplayOption<AlertRuleOperator>[] = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
];

const LIST_OPERATOR_OPTIONS: DisplayOption<AlertRuleOperator>[] = [
  { value: "contains", label: "contains" },
  { value: "not contains", label: "not contains" },
  { value: "contains any", label: "contains any" },
  { value: "contains all", label: "contains all" },
  { value: "is empty", label: "is empty" },
];

const NOTIFICATION_OPTIONS: DisplayOption<string>[] = [{ value: "email", label: "Email" }];

const BOOLEAN_VALUE_OPTIONS: DisplayOption<"true" | "false">[] = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

const getOperatorOptions = (fieldType: AlertRuleFieldType) => {
  if (fieldType === "number") return NUMBER_OPERATOR_OPTIONS;
  if (fieldType === "boolean") return BOOLEAN_OPERATOR_OPTIONS;
  if (fieldType === "list") return LIST_OPERATOR_OPTIONS;
  return TEXT_OPERATOR_OPTIONS;
};

const getDefaultOperator = (fieldType: AlertRuleFieldType): AlertRuleOperator =>
  getOperatorOptions(fieldType)[0]?.value ?? "==";

const requiresMultiValue = (operator: AlertRuleOperator) =>
  operator === "in" ||
  operator === "not in" ||
  operator === "contains any";

const requiresAllCasesValue = (operator: AlertRuleOperator) => operator === "contains all";

const requiresNoValue = (operator: AlertRuleOperator) =>
  operator === "is empty" || requiresAllCasesValue(operator);

const formatRuleValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getRuleSearchText = (rule: AlertRule) =>
  [
    rule.name,
    rule.field,
    rule.field_label,
    rule.field_type,
    rule.operator,
    formatRuleValue(rule.value),
    rule.notification_method,
    rule.message,
    rule.is_active ? "active" : "inactive",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function DeviceAlertRulesPanel<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  rules = [],
  deviceId,
  availableFields,
  getFieldLabel,
  getFieldType,
  getFieldCases,
  getFieldBooleanLabels,
  disabled,
  readOnly,
  addError,
  adding,
  updating,
  deleting,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: DeviceAlertRulesPanelProps<T>) {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [deleteRule, setDeleteRule] = useState<Pick<AlertRule, "id" | "name"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<"details" | "condition" | "notification">("details");
  const [formError, setFormError] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const selectedFieldType = getFieldType?.(selectedField) ?? "text";
  const selectedFieldLabel = selectedField ? getFieldLabel?.(selectedField) ?? selectedField : "";
  const selectedFieldCases = selectedField ? getFieldCases?.(selectedField) ?? [] : [];
  const selectedBooleanLabels = selectedField
    ? getFieldBooleanLabels?.(selectedField) ?? { trueLabel: "True", falseLabel: "False" }
    : { trueLabel: "True", falseLabel: "False" };
  const [operator, setOperator] = useState<AlertRuleOperator>("==");
  const [singleValue, setSingleValue] = useState("");
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [notificationMethod, setNotificationMethod] = useState("email");
  const [message, setMessage] = useState("");
  const [includeDataInMessage, setIncludeDataInMessage] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState("300");
  const [isActive, setIsActive] = useState(true);
  const savingRule = Boolean(adding || updating);
  const fieldOptions = useMemo(
    () =>
      (availableFields ?? []).map((field) => ({
        value: field,
        label: field,
      })),
    [availableFields]
  );
  const caseOptions = useMemo(
    () => selectedFieldCases.map((item) => ({ value: item, label: item })),
    [selectedFieldCases]
  );
  const operatorOptions = getOperatorOptions(selectedFieldType);

  const setFormValueFromRule = (rule: AlertRule) => {
    if (Array.isArray(rule.value)) {
      setMultiValues(rule.value.map((item) => String(item)));
      setSingleValue("");
      return;
    }
    if (typeof rule.value === "boolean") {
      setSingleValue(rule.value ? "true" : "false");
      setMultiValues([]);
      return;
    }
    if (rule.value === null || rule.value === undefined) {
      setSingleValue(rule.field_type === "boolean" ? "true" : "");
      setMultiValues([]);
      return;
    }
    setSingleValue(String(rule.value));
    setMultiValues([]);
  };

  function openEditModal(rule: AlertRule) {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setSelectedField(rule.field);
    setOperator(rule.operator);
    setNotificationMethod(rule.notification_method || "email");
    setMessage(rule.message ?? "");
    setIncludeDataInMessage(rule.include_data_in_message);
    setCooldownSeconds(String(rule.cooldown_seconds));
    setIsActive(rule.is_active);
    setAddStep("details");
    setFormError(null);
    setFormValueFromRule(rule);
    setIsAddOpen(true);
  }

  const filteredRules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rules;
    return rules.filter((rule) => getRuleSearchText(rule).includes(normalized));
  }, [query, rules]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRules = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, pageSize, safePage]);

  const columns = useMemo<ColumnDef<AlertRule>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Rule",
        meta: { width: 200 },
      },
      {
        accessorKey: "field_label",
        header: "Field",
        cell: (info) => {
          const rule = info.row.original;
          return <>{rule.field_label?.trim() || rule.field}</>;
        },
        meta: { width: 150 },
      },
      {
        accessorKey: "notification_method",
        header: "Notify",
        meta: { width: 120 },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: (info) => (
          <span
            className={`${badgeStyles["dashboard-status-badge"]} ${info.getValue<boolean>() ? badgeStyles["active"] : badgeStyles["inactive"]
              }`}
          >
            {info.getValue<boolean>() ? "Active" : "Inactive"}
          </span>
        ),
        meta: { width: 100 },
      },
      {
        accessorKey: "cooldown_seconds",
        header: "Cooldown",
        cell: (info) => <>{info.getValue<number>()}s</>,
        meta: { width: 100 },
      },
      {
        id: "actions",
        header: "Actions",
        meta: { align: "center", width: 120 },
        cell: (info) =>
          readOnly ? null : (
            <TableActions
              item={info.row.original}
              onEdit={openEditModal}
              onDelete={(rule) => {
                setDeleteRule({ id: rule.id, name: rule.name });
                setDeleteError(null);
              }}
              showEdit={Boolean(onUpdateRule)}
              showDelete={Boolean(onDeleteRule)}
            />
          ),
      },
    ],
    [onDeleteRule, onUpdateRule, readOnly]
  );

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const resetAddForm = () => {
    const firstField = availableFields?.[0] ?? "";
    const nextType = firstField ? getFieldType?.(firstField) ?? "text" : "text";
    setRuleName("");
    setSelectedField(firstField);
    setOperator(getDefaultOperator(nextType));
    setSingleValue(nextType === "boolean" ? "true" : "");
    setMultiValues([]);
    setNotificationMethod("email");
    setMessage("");
    setIncludeDataInMessage(true);
    setCooldownSeconds("300");
    setIsActive(true);
    setEditingRuleId(null);
    setAddStep("details");
    setFormError(null);
  };

  const openAddModal = () => {
    resetAddForm();
    setIsAddOpen(true);
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setEditingRuleId(null);
    setFormError(null);
  };

  const closeDeleteModal = () => {
    setDeleteRule(null);
    setDeleteError(null);
  };

  const handleFieldChange = (field: string) => {
    const nextType = getFieldType?.(field) ?? "text";
    setSelectedField(field);
    setOperator(getDefaultOperator(nextType));
    setSingleValue(nextType === "boolean" ? "true" : "");
    setMultiValues([]);
    setFormError(null);
  };

  const handleOperatorChange = (value: AlertRuleOperator) => {
    setOperator(value);
    setSingleValue(selectedFieldType === "boolean" ? "true" : "");
    setMultiValues([]);
    setFormError(null);
  };

  const toggleMultiValue = (value: string) => {
    setMultiValues((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const buildValue = () => {
    if (requiresAllCasesValue(operator)) return selectedFieldCases;
    if (requiresNoValue(operator)) return null;
    if (selectedFieldType === "number") {
      const parsed = Number(singleValue);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (selectedFieldType === "boolean") {
      return singleValue === "true";
    }
    if (requiresMultiValue(operator)) {
      return multiValues;
    }
    return singleValue;
  };

  const validateForm = () => {
    if (!deviceId) return "Device is not loaded.";
    if (!ruleName.trim()) return "Rule name is required.";
    if (!selectedField) return "Select a data field.";
    if (!notificationMethod) return "Select a notification method.";
    const cooldown = Number(cooldownSeconds);
    if (!Number.isInteger(cooldown) || cooldown < 0) {
      return "Cooldown must be 0 or greater.";
    }
    if (!requiresNoValue(operator)) {
      if (selectedFieldType === "number") {
        if (singleValue.trim() === "" || buildValue() === null) return "Enter a valid number value.";
      } else if (requiresMultiValue(operator)) {
        if (multiValues.length === 0) return "Select at least one value.";
      } else if (!singleValue) {
        return "Select a value.";
      }
    }
    return null;
  };

  const validateDetailsStep = () => {
    if (!ruleName.trim()) return "Rule name is required.";
    if (!selectedField) return "Select a data field.";
    return null;
  };

  const validateConditionStep = () => {
    if (!selectedField) return "Select a data field.";
    if (!operator) return "Select an operator.";
    if (!requiresNoValue(operator)) {
      if (selectedFieldType === "number") {
        if (singleValue.trim() === "" || buildValue() === null) return "Enter a valid number value.";
      } else if (requiresMultiValue(operator)) {
        if (multiValues.length === 0) return "Select at least one value.";
      } else if (!singleValue) {
        return "Select a value.";
      }
    }
    return null;
  };

  const handleNextStep = (event?: FormEvent | ReactMouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    const error = addStep === "details" ? validateDetailsStep() : validateConditionStep();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setAddStep((prev) => (prev === "details" ? "condition" : "notification"));
  };

  const handleBackStep = () => {
    setFormError(null);
    setAddStep((prev) => (prev === "notification" ? "condition" : "details"));
  };

  const handleAddSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (addStep !== "notification") {
      handleNextStep(event);
      return;
    }
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    if (!deviceId) return;
    if (editingRuleId && !onUpdateRule) return;
    if (!editingRuleId && !onAddRule) return;
    setFormError(null);
    const payload = {
      name: ruleName.trim(),
      field: selectedField,
      field_label: selectedFieldLabel || selectedField,
      field_type: selectedFieldType,
      operator,
      value: buildValue(),
      notification_method: notificationMethod,
      message: message.trim() || null,
      include_data_in_message: includeDataInMessage,
      cooldown_seconds: Number(cooldownSeconds),
      is_active: isActive,
    };
    if (editingRuleId) {
      await onUpdateRule?.(editingRuleId, payload);
    } else {
      await onAddRule?.({ ...payload, device_id: deviceId });
    }
    closeAddModal();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRule || !onDeleteRule) return;
    try {
      setDeleteError(null);
      await onDeleteRule(deleteRule.id);
      closeDeleteModal();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete alert rule");
    }
  };

  const renderValueControl = () => {
    if (selectedField && requiresAllCasesValue(operator)) {
      return (
        <div className={formStyles["dashboard-readonly-item"]}>
          <span className={formStyles["dashboard-readonly-label"]}>Value</span>
          <span className={formStyles["dashboard-readonly-value"]}>
            {selectedFieldCases.length ? `All cases (${selectedFieldCases.length})` : "All configured cases"}
          </span>
        </div>
      );
    }

    if (!selectedField || requiresNoValue(operator)) return null;

    if (selectedFieldType === "number") {
      return (
        <Input
          id="alert-rule-value-number"
          label="Value"
          type="number"
          inputMode="decimal"
          value={singleValue}
          onChange={(event) => setSingleValue(event.target.value)}
          disabled={disabled || savingRule}
        />
      );
    }

    if (selectedFieldType === "boolean") {
      return (
        <DropdownSelect
          id="alert-rule-value-boolean"
          label="Value"
          value={(singleValue || "true") as "true" | "false"}
          options={[
            { value: "true", label: selectedBooleanLabels.trueLabel || BOOLEAN_VALUE_OPTIONS[0].label },
            { value: "false", label: selectedBooleanLabels.falseLabel || BOOLEAN_VALUE_OPTIONS[1].label },
          ]}
          onChange={setSingleValue}
          disabled={disabled || savingRule}
        />
      );
    }

    if (requiresMultiValue(operator)) {
      return (
        <div className={formStyles["dashboard-modal-field"]}>
          <span className={formStyles["dashboard-modal-label"]}>Value</span>
          <div className={styles["alert-rule-case-list"]}>
            {selectedFieldCases.length ? (
              selectedFieldCases.map((item) => (
                <label key={item} className={styles["alert-rule-case-option"]}>
                  <input
                    type="checkbox"
                    checked={multiValues.includes(item)}
                    onChange={() => toggleMultiValue(item)}
                    disabled={disabled || savingRule}
                  />
                  <span>{item}</span>
                </label>
              ))
            ) : (
              <span className={styles["alert-rule-muted"]}>No cases configured for this field.</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <DropdownSelect
        id="alert-rule-value-case"
        label="Value"
        value={singleValue}
        options={caseOptions}
        placeholder={caseOptions.length ? "Select value" : "No cases configured"}
        onChange={setSingleValue}
        disabled={!caseOptions.length || disabled || savingRule}
      />
    );
  };

  return (
    <section className={styles["alert-rules-panel"]}>
      <div className={styles["alert-rules-header"]}>
        <div>
          <h2>Alert Rules</h2>
          <span className={styles["alert-rules-subtitle"]}>Manage alert conditions and notifications</span>
        </div>
        <div className={styles["alert-rules-controls"]}>
          <DropdownSelect
            id="device-dashboard-alert-display"
            value={displayMode}
            options={options}
            onChange={onDisplayChange}
            disabled={disabled}
            groupClassName={styles["alert-rules-select-group"]}
            triggerClassName={styles["alert-rules-select-trigger"]}
          />
        </div>
      </div>

      <div className={styles["alert-rules-topbar"]}>
        <div className={styles["alert-rules-search"]}>
          <SearchFilter
            value={query}
            onChange={(value) => {
              setQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Search alert rules by name, field"
          />
        </div>
        {!readOnly && onAddRule && (
          <div className={styles["alert-rules-add-button-container"]}>
            <Button
              icon={FaPlus}
              className={styles["alert-rules-add-button"]}
              onClick={openAddModal}
              disabled={disabled}
            >
              Add Rule
            </Button>
          </div>
        )}
      </div>

      <DataTable
        data={pageRules}
        columns={columns}
        emptyMessage={query.trim() ? "No alert rules match your search" : "No alert rules configured yet"}
      />

      <div className={styles["alert-rules-pagination-row"]}>
        <div className={styles["alert-rules-page-size"]}>
          <PageSizeSelect value={pageSize} onChange={handlePageSizeChange} />
        </div>
        <div className={styles["alert-rules-pagination"]}>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            maxPagesToShow={5}
          />
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={closeAddModal} title={editingRuleId ? "Edit alert rule" : "Add alert rule"}>
        <form className={formStyles["dashboard-modal-form"]} onSubmit={handleAddSubmit}>
          {addStep === "details" && (
            <>
              <Input
                id="alert-rule-name"
                label="Name"
                placeholder="e.g. High temperature"
                value={ruleName}
                onChange={(event) => setRuleName(event.target.value)}
                disabled={disabled || savingRule}
              />
              <DropdownSelect
                id="alert-rule-field"
                label="Data field"
                value={selectedField}
                options={fieldOptions}
                placeholder={fieldOptions.length ? "Select field" : "No data fields configured"}
                onChange={handleFieldChange}
                disabled={!fieldOptions.length || disabled || savingRule}
              />
              {selectedField && (
                <div className={formStyles["dashboard-readonly-group"]}>
                  <div className={formStyles["dashboard-readonly-item"]}>
                    <span className={formStyles["dashboard-readonly-label"]}>Field label</span>
                    <span className={formStyles["dashboard-readonly-value"]}>{selectedFieldLabel}</span>
                  </div>
                  <div className={formStyles["dashboard-readonly-item"]}>
                    <span className={formStyles["dashboard-readonly-label"]}>Field type</span>
                    <span className={formStyles["dashboard-readonly-value"]}>{selectedFieldType}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {addStep === "condition" && (
            <>
              <DropdownSelect
                id="alert-rule-operator"
                label="Operator"
                value={operator}
                options={operatorOptions}
                onChange={handleOperatorChange}
                disabled={!selectedField || disabled || savingRule}
              />
              {renderValueControl()}
            </>
          )}

          {addStep === "notification" && (
            <>
              <DropdownSelect
                id="alert-rule-notification-method"
                label="Notification method"
                value={notificationMethod}
                options={NOTIFICATION_OPTIONS}
                onChange={setNotificationMethod}
                disabled={disabled || savingRule}
              />

              <div className={formStyles["dashboard-modal-field"]}> <label htmlFor="alert-rule-message" className={formStyles["dashboard-modal-label"]} > Message </label> <textarea id="alert-rule-message" className={styles["alert-rule-message"]} placeholder="Message to send" value={message} onChange={(event) => setMessage(event.target.value)} disabled={disabled || savingRule} rows={4} /> </div>

              <div className={formStyles["dashboard-checkbox-row"]}>
                <Switch
                  checked={includeDataInMessage}
                  onChange={setIncludeDataInMessage}
                  label="Include data in message"
                  disabled={disabled || savingRule}
                />
                <Switch
                  checked={isActive}
                  onChange={setIsActive}
                  label={isActive ? "Active" : "Inactive"}
                  disabled={disabled || savingRule}
                />
              </div>

              <Input
                id="alert-rule-cooldown"
                label="Cooldown (seconds)"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={cooldownSeconds}
                onChange={(event) => setCooldownSeconds(event.target.value)}
                disabled={disabled || savingRule}
              />
            </>
          )}

          {(formError || addError) && (
            <p className={formStyles["dashboard-modal-error"]}>{formError || addError}</p>
          )}

          <div className={formStyles["dashboard-modal-actions"]}>
            {addStep === "details" ? (
              <Button type="button" variant="cancel" onClick={closeAddModal} disabled={savingRule}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="cancel" onClick={handleBackStep} disabled={savingRule}>
                Back
              </Button>
            )}
            {addStep === "notification" ? (
              <Button
                type="submit"
                isLoading={savingRule}
                disabled={disabled || (editingRuleId ? !onUpdateRule : !onAddRule)}
              >
                {editingRuleId ? "Save" : "Add Rule"}
              </Button>
            ) : (
              <Button type="button" onClick={handleNextStep} disabled={disabled || savingRule}>
                Next
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteRule} onClose={closeDeleteModal} title="Delete alert rule">
        <div className={formStyles["dashboard-modal-form"]}>
          <p>
            Are you sure you want to delete <strong>{deleteRule?.name || "this alert rule"}</strong>?
            This action cannot be undone.
          </p>
          {(deleteError || addError) && (
            <p className={formStyles["dashboard-modal-error"]}>{deleteError || addError}</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleting}
              disabled={!deleteRule}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
