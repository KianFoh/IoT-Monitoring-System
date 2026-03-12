import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import {
  CHART_OPTIONS,
  OUTPUT_OPTIONS,
  BAR_ORIENTATION_OPTIONS,
  FILTER_MODE_OPTIONS,
  LINE_GRANULARITY_OPTIONS,
  LINE_LIST_MODE_OPTIONS,
  RANGE_PRESET_OPTIONS,
} from "./utils/deviceDataChartConstants";
import type {
  BarOrientation,
  ChartFilterMode,
  ChartRangePreset,
  DataFieldType,
  DisplayOption,
  ChartType,
  LineGranularity,
  LineListMode,
} from "./types/deviceDataChartTypes";
import type { SectionModalState } from "./state/deviceDataChartState";
import { getCustomRangeLimitEnd } from "./utils/deviceDataChartUtils";
import formStyles from "../DashboardForm/DashboardForm.module.css";

type DeviceDataChartModalsProps = {
  disabled?: boolean;
  options: {
    data: Array<DisplayOption<string>>;
    meter: Array<DisplayOption<string>>;
    list: Array<DisplayOption<string>>;
  };
  sectionModal: {
    state: SectionModalState;
    onNameChange: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
  };
  addModal: {
    isOpen: boolean;
    selectedChartType: ChartType;
    selectedField: string;
    selectedMin: string;
    selectedMax: string;
    selectedLineFields: string[];
    selectedLineMin: string;
    selectedLineMax: string;
    selectedLineTicks: string;
    selectedLineDecimals: string;
    selectedStatFontSize: string;
    selectedLineListMode: LineListMode;
    selectedBarOrientation: BarOrientation;
    selectedBarRaceMode: boolean;
    selectedPieShowLabels: boolean;
    hideLineNumericInputs: boolean;
    showLineListMode: boolean;
    canAddChart: boolean;
    onSelectedChartTypeChange: (value: ChartType) => void;
    onSelectedFieldChange: (value: string) => void;
    onSelectedMinChange: (value: string) => void;
    onSelectedMaxChange: (value: string) => void;
    onSelectedLineMinChange: (value: string) => void;
    onSelectedLineMaxChange: (value: string) => void;
    onSelectedLineTicksChange: (value: string) => void;
    onSelectedLineDecimalsChange: (value: string) => void;
    onSelectedStatFontSizeChange: (value: string) => void;
    onSelectedLineListModeChange: (value: LineListMode) => void;
    onSelectedBarOrientationChange: (value: BarOrientation) => void;
    onSelectedBarRaceModeChange: (value: boolean) => void;
    onSelectedPieShowLabelsChange: (value: boolean) => void;
    onSelectLineField: (value: string) => void;
    onClose: () => void;
    onAdd: () => void;
  };
  outputModal: {
    isOpen: boolean;
    selectedOutputType: "button";
    onSelectedOutputTypeChange: (value: "button") => void;
    selectedOutputValueType: "boolean" | "multi";
    onSelectedOutputValueTypeChange: (value: "boolean" | "multi") => void;
    selectedOutputField: string;
    selectedOutputFieldType: DataFieldType | null;
    selectedOutputCase: string;
    outputCaseOptions: Array<DisplayOption<string>>;
    canAddOutput: boolean;
    onSelectedOutputFieldChange: (value: string) => void;
    onSelectedOutputCaseChange: (value: string) => void;
    onClose: () => void;
    onAdd: () => void;
  };
  editOutputModal: {
    isOpen: boolean;
    editOutputName: string;
    editOutputValueType: "boolean" | "multi";
    editOutputField: string;
    editOutputFieldType: DataFieldType | null;
    editOutputCase: string;
    editOutputCaseOptions: Array<DisplayOption<string>>;
    editingOutputType: "button" | null;
    canSaveOutput: boolean;
    onEditOutputNameChange: (value: string) => void;
    onEditOutputValueTypeChange: (value: "boolean" | "multi") => void;
    onEditOutputFieldChange: (value: string) => void;
    onEditOutputCaseChange: (value: string) => void;
    onClose: () => void;
    onSave: () => void;
  };
  editModal: {
    isOpen: boolean;
    editName: string;
    editField: string;
    editMin: string;
    editMax: string;
    editLineTicks: string;
    editLineDecimals: string;
    editStatFontSize: string;
    editLineListMode: LineListMode;
    editBarOrientation: BarOrientation;
    editBarRaceMode: boolean;
    editPieShowLabels: boolean;
    hideLineNumericInputs: boolean;
    showLineListMode: boolean;
    editingChartType: ChartType | null;
    onEditNameChange: (value: string) => void;
    onEditFieldChange: (value: string) => void;
    onEditMinChange: (value: string) => void;
    onEditMaxChange: (value: string) => void;
    onEditLineTicksChange: (value: string) => void;
    onEditLineDecimalsChange: (value: string) => void;
    onEditStatFontSizeChange: (value: string) => void;
    onEditLineListModeChange: (value: LineListMode) => void;
    onEditBarOrientationChange: (value: BarOrientation) => void;
    onEditBarRaceModeChange: (value: boolean) => void;
    onEditPieShowLabelsChange: (value: boolean) => void;
    onClose: () => void;
    onSave: () => void;
  };
  filterModal: {
    isOpen: boolean;
    filterMode: ChartFilterMode;
    rangePreset: ChartRangePreset;
    rangeRefreshValue: number;
    rangeRefreshOptions: Array<{ value: string; label: string }>;
    timeGranularity: LineGranularity;
    timeStart: string;
    timeEnd: string;
    timeDateInputType: string;
    timeDateStep?: number;
    timeDateLabel: string;
    onFilterModeChange: (value: ChartFilterMode) => void;
    onRangePresetChange: (value: ChartRangePreset) => void;
    onRangeRefreshChange: (value: string) => void;
    onTimeGranularityChange: (value: LineGranularity) => void;
    onTimeStartChange: (value: string) => void;
    onTimeEndChange: (value: string) => void;
    onClose: () => void;
  };
};

export function DeviceDataChartModals({
  disabled,
  options,
  sectionModal,
  addModal,
  outputModal,
  editOutputModal,
  editModal,
  filterModal,
}: DeviceDataChartModalsProps) {
  const formatDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const formatDateTimeValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const CUSTOM_RANGE_LIMIT_LABELS: Record<LineGranularity, string> = {
    sec: "1 minute",
    minute: "1 hour",
    hour: "1 day",
    day: "1 month",
    week: "6 months",
    month: "2 years",
    year: "30 years",
  };
  const startTimeValue = filterModal.timeStart?.trim();
  const endTimeValue = filterModal.timeEnd?.trim();
  const startTime =
    startTimeValue && Number.isFinite(new Date(startTimeValue).getTime())
      ? new Date(startTimeValue).getTime()
      : null;
  const endTime =
    endTimeValue && Number.isFinite(new Date(endTimeValue).getTime())
      ? new Date(endTimeValue).getTime()
      : null;
  const maxEndDate = (() => {
    const now = new Date();
    if (filterModal.timeDateInputType === "date") {
      return formatDateValue(now);
    }
    if (filterModal.timeDateInputType === "datetime-local") {
      const aligned = new Date(now.getTime());
      if (typeof filterModal.timeDateStep === "number") {
        if (filterModal.timeDateStep >= 3600) {
          aligned.setMinutes(0, 0, 0);
        } else if (filterModal.timeDateStep >= 60) {
          aligned.setSeconds(0, 0);
        }
      }
      return formatDateTimeValue(aligned);
    }
    return undefined;
  })();
  const hasTimeRangeError = startTime !== null && endTime !== null && startTime > endTime;
  const maxCustomRangeEnd =
    startTime !== null ? getCustomRangeLimitEnd(startTime, filterModal.timeGranularity) : null;
  const hasTimeRangeLimitError =
    startTime !== null &&
    endTime !== null &&
    maxCustomRangeEnd !== null &&
    endTime > maxCustomRangeEnd;
  const rangeLimitLabel = CUSTOM_RANGE_LIMIT_LABELS[filterModal.timeGranularity] ?? "";
  const addFieldOptions =
    addModal.selectedChartType === "meter"
      ? options.meter
      : addModal.selectedChartType === "pie" || addModal.selectedChartType === "bar"
        ? options.list
        : options.data;
  const isEditButton = editModal.editingChartType === "button";
  const editFieldOptions =
    editModal.editingChartType === "meter"
      ? options.meter
      : editModal.editingChartType === "pie" || editModal.editingChartType === "bar"
        ? options.list
        : options.data;
  const addFieldMessage =
    addModal.selectedChartType === "pie"
      ? "Pie chart requires list-type data fields."
      : addModal.selectedChartType === "bar"
        ? "Bar chart requires list-type data fields."
        : addModal.selectedChartType === "meter"
          ? "Meter chart requires numeric data fields."
          : "Add data fields in the data panel first.";
  const editFieldMessage =
    editModal.editingChartType === "pie"
      ? "Pie chart requires list-type data fields."
      : editModal.editingChartType === "bar"
        ? "Bar chart requires list-type data fields."
        : editModal.editingChartType === "meter"
          ? "Meter chart requires numeric data fields."
          : "Add data fields in the data panel first.";

  const outputTypeOptions = OUTPUT_OPTIONS;
  const outputFieldOptions = options.data;
  const showOutputCase =
    outputModal.selectedOutputFieldType === "text" ||
    outputModal.selectedOutputFieldType === "list";
  const showEditOutputCase =
    editOutputModal.editOutputFieldType === "text" ||
    editOutputModal.editOutputFieldType === "list";
  const outputFieldMessage = "Add data fields in the data panel first.";
  const outputCaseMessage = "Configure cases in the data panel first.";

  return (
    <>
      <Modal
        isOpen={sectionModal.state.isOpen}
        onClose={sectionModal.onClose}
        title={sectionModal.state.editingId ? "Rename section" : "Add section"}
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-chart-section-name"
            label="Section name"
            placeholder="e.g. Core Metrics"
            value={sectionModal.state.name}
            onChange={(event) => sectionModal.onNameChange(event.target.value)}
          />
          {sectionModal.state.error && (
            <p className={formStyles["dashboard-modal-error"]}>{sectionModal.state.error}</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={sectionModal.onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={sectionModal.onSave}
              disabled={!sectionModal.state.name.trim()}
            >
              {sectionModal.state.editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose} title="Add chart">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-chart-type"
            label="Chart type"
            value={addModal.selectedChartType}
            options={CHART_OPTIONS}
            onChange={addModal.onSelectedChartTypeChange}
            disabled={disabled}
          />
          {addModal.selectedChartType !== "line" && addModal.selectedChartType !== "area" && (
            <DropdownSelect
              id="device-chart-field"
              label="Data field"
              value={addModal.selectedField}
              options={addFieldOptions}
              placeholder={
                addFieldOptions.length ? "Select data" : "No data fields available"
              }
              onChange={addModal.onSelectedFieldChange}
              disabled={!addFieldOptions.length || disabled}
            />
          )}
          {addModal.selectedChartType === "stat" && (
            <Input
              id="device-chart-stat-font-size"
              label="Font size (px)"
              type="number"
              inputMode="numeric"
              min={8}
              step={1}
              placeholder="32"
              value={addModal.selectedStatFontSize}
              onChange={(event) => addModal.onSelectedStatFontSizeChange(event.target.value)}
              disabled={disabled}
            />
          )}
          {addModal.selectedChartType === "bar" && (
            <>
              <DropdownSelect
                id="device-chart-bar-orientation"
                label="Orientation"
                value={addModal.selectedBarOrientation}
                options={BAR_ORIENTATION_OPTIONS}
                onChange={addModal.onSelectedBarOrientationChange}
                disabled={disabled || addModal.selectedBarRaceMode}
              />
              <div className={formStyles["dashboard-checkbox-row"]}>
                <Switch
                  checked={addModal.selectedBarRaceMode}
                  onChange={addModal.onSelectedBarRaceModeChange}
                  label="Race mode"
                  disabled={disabled}
                />
              </div>
            </>
          )}
          {addModal.selectedChartType === "pie" && (
            <div className={formStyles["dashboard-checkbox-row"]}>
              <Switch
                checked={addModal.selectedPieShowLabels}
                onChange={addModal.onSelectedPieShowLabelsChange}
                label="Show labels"
                disabled={disabled}
              />
            </div>
          )}
          {(addModal.selectedChartType === "line" || addModal.selectedChartType === "area") && (
            <>
            <DropdownSelect
              id="device-chart-line-field"
              label="Data field"
              value={addModal.selectedLineFields[0] ?? ""}
              options={options.data}
              placeholder={options.data.length ? "Select data" : "No data fields available"}
              onChange={addModal.onSelectLineField}
              disabled={!options.data.length || disabled}
            />
            {addModal.showLineListMode && (
              <DropdownSelect
                id="device-chart-line-list-mode"
                label="List mode"
                value={addModal.selectedLineListMode}
                options={LINE_LIST_MODE_OPTIONS}
                onChange={addModal.onSelectedLineListModeChange}
                disabled={disabled}
              />
            )}
            {!addModal.hideLineNumericInputs && (
              <>
                  <div className={formStyles["dashboard-inline-row"]}>
                    <Input
                      id="device-chart-line-min"
                      label="Min (optional)"
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={addModal.selectedLineMin}
                      onChange={(event) => addModal.onSelectedLineMinChange(event.target.value)}
                      disabled={disabled}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                    <Input
                      id="device-chart-line-max"
                      label="Max (optional)"
                      type="text"
                      inputMode="decimal"
                      placeholder="100"
                      value={addModal.selectedLineMax}
                      onChange={(event) => addModal.onSelectedLineMaxChange(event.target.value)}
                      disabled={disabled}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                  </div>
                  <div className={formStyles["dashboard-inline-row"]}>
                    <Input
                      id="device-chart-line-ticks"
                      label="Ticks (optional)"
                      type="number"
                      inputMode="numeric"
                      min={2}
                      step={1}
                      placeholder="6"
                      value={addModal.selectedLineTicks}
                      onChange={(event) => addModal.onSelectedLineTicksChange(event.target.value)}
                      disabled={disabled}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                    <Input
                      id="device-chart-line-decimals"
                      label="Decimals (optional)"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="2"
                      value={addModal.selectedLineDecimals}
                      onChange={(event) => addModal.onSelectedLineDecimalsChange(event.target.value)}
                      disabled={disabled}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                  </div>
                </>
              )}
            </>
          )}
          {addModal.selectedChartType === "meter" && (
            <>
              <div className={formStyles["dashboard-inline-row"]}>
                <Input
                  id="device-chart-min"
                  label="Min"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={addModal.selectedMin}
                  onChange={(event) => addModal.onSelectedMinChange(event.target.value)}
                  disabled={disabled}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
                <Input
                  id="device-chart-max"
                  label="Max"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={addModal.selectedMax}
                  onChange={(event) => addModal.onSelectedMaxChange(event.target.value)}
                  disabled={disabled}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
              </div>
              <div className={formStyles["dashboard-inline-row"]}>
                <Input
                  id="device-chart-meter-ticks"
                  label="Ticks (optional)"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  step={1}
                  placeholder="6"
                  value={addModal.selectedLineTicks}
                  onChange={(event) => addModal.onSelectedLineTicksChange(event.target.value)}
                  disabled={disabled}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
                <Input
                  id="device-chart-meter-decimals"
                  label="Decimals (optional)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="2"
                  value={addModal.selectedLineDecimals}
                  onChange={(event) => addModal.onSelectedLineDecimalsChange(event.target.value)}
                  disabled={disabled}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
              </div>
            </>
          )}
          {!addFieldOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>{addFieldMessage}</p>
          )}
          {(addModal.selectedChartType === "line" || addModal.selectedChartType === "area") &&
            options.data.length > 0 &&
            addModal.selectedLineFields.length === 0 && (
              <p className={formStyles["dashboard-modal-error"]}>Select a data field.</p>
            )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={addModal.onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={addModal.onAdd} disabled={!addModal.canAddChart}>
              Add chart
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={outputModal.isOpen} onClose={outputModal.onClose} title="Add output">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-output-type"
            label="Output type"
            value={outputModal.selectedOutputType}
            options={outputTypeOptions}
            placeholder={outputTypeOptions.length ? "Select output" : "No outputs available"}
            onChange={outputModal.onSelectedOutputTypeChange}
            disabled={disabled}
          />
          <DropdownSelect
            id="device-output-field"
            label="Data field"
            value={outputModal.selectedOutputField}
            options={outputFieldOptions}
            placeholder={outputFieldOptions.length ? "Select data" : "No data fields available"}
            onChange={outputModal.onSelectedOutputFieldChange}
            disabled={!outputFieldOptions.length || disabled}
          />
          {showOutputCase && (
            <DropdownSelect
              id="device-output-case"
              label="Case"
              value={outputModal.selectedOutputCase}
              options={outputModal.outputCaseOptions}
              placeholder={
                outputModal.outputCaseOptions.length ? "Select case" : "No cases available"
              }
              onChange={outputModal.onSelectedOutputCaseChange}
              disabled={!outputModal.outputCaseOptions.length || disabled}
            />
          )}
          {!outputFieldOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>{outputFieldMessage}</p>
          )}
          {showOutputCase &&
            outputFieldOptions.length > 0 &&
            outputModal.outputCaseOptions.length === 0 && (
              <p className={formStyles["dashboard-modal-error"]}>{outputCaseMessage}</p>
            )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={outputModal.onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={outputModal.onAdd} disabled={!outputModal.canAddOutput}>
              Add output
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOutputModal.isOpen} onClose={editOutputModal.onClose} title="Edit output">
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-edit-output-name"
            label="Output name"
            placeholder="Enter output name"
            value={editOutputModal.editOutputName}
            onChange={(event) => editOutputModal.onEditOutputNameChange(event.target.value)}
          />
          <DropdownSelect
            id="device-edit-output-field"
            label="Data field"
            value={editOutputModal.editOutputField}
            options={outputFieldOptions}
            placeholder={outputFieldOptions.length ? "Select data" : "No data fields available"}
            onChange={editOutputModal.onEditOutputFieldChange}
            disabled={!outputFieldOptions.length || disabled}
          />
          {showEditOutputCase && (
            <DropdownSelect
              id="device-edit-output-case"
              label="Case"
              value={editOutputModal.editOutputCase}
              options={editOutputModal.editOutputCaseOptions}
              placeholder={
                editOutputModal.editOutputCaseOptions.length ? "Select case" : "No cases available"
              }
              onChange={editOutputModal.onEditOutputCaseChange}
              disabled={!editOutputModal.editOutputCaseOptions.length || disabled}
            />
          )}
          {!outputFieldOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>{outputFieldMessage}</p>
          )}
          {showEditOutputCase &&
            outputFieldOptions.length > 0 &&
            editOutputModal.editOutputCaseOptions.length === 0 && (
              <p className={formStyles["dashboard-modal-error"]}>{outputCaseMessage}</p>
            )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={editOutputModal.onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={editOutputModal.onSave}
              disabled={!editOutputModal.canSaveOutput}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} title="Edit chart">
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-edit-chart-name"
            label="Chart name"
            placeholder="Enter chart name"
            value={editModal.editName}
            onChange={(event) => editModal.onEditNameChange(event.target.value)}
          />
          {!isEditButton && (
            <DropdownSelect
              id="device-edit-chart-field"
              label="Data field"
              value={editModal.editField}
              options={editFieldOptions}
              placeholder={
                editFieldOptions.length ? "Select data" : "No data fields available"
              }
              onChange={editModal.onEditFieldChange}
              disabled={!editFieldOptions.length}
            />
          )}
          {editModal.editingChartType === "stat" && (
            <Input
              id="device-edit-chart-stat-font-size"
              label="Font size (px)"
              type="number"
              inputMode="numeric"
              min={8}
              step={1}
              placeholder="32"
              value={editModal.editStatFontSize}
              onChange={(event) => editModal.onEditStatFontSizeChange(event.target.value)}
              disabled={disabled}
            />
          )}
          {editModal.editingChartType === "bar" && (
            <>
              <DropdownSelect
                id="device-edit-chart-orientation"
                label="Orientation"
                value={editModal.editBarOrientation}
                options={BAR_ORIENTATION_OPTIONS}
                onChange={editModal.onEditBarOrientationChange}
                disabled={disabled || editModal.editBarRaceMode}
              />
              <div className={formStyles["dashboard-checkbox-row"]}>
                <Switch
                  checked={editModal.editBarRaceMode}
                  onChange={editModal.onEditBarRaceModeChange}
                  label="Race mode"
                  disabled={disabled}
                />
              </div>
            </>
          )}
          {editModal.editingChartType === "pie" && (
            <div className={formStyles["dashboard-checkbox-row"]}>
              <Switch
                checked={editModal.editPieShowLabels}
                onChange={editModal.onEditPieShowLabelsChange}
                label="Show labels"
                disabled={disabled}
              />
            </div>
          )}
          {editModal.showLineListMode && (
            <DropdownSelect
              id="device-edit-chart-line-list-mode"
              label="List mode"
              value={editModal.editLineListMode}
              options={LINE_LIST_MODE_OPTIONS}
              onChange={editModal.onEditLineListModeChange}
              disabled={disabled}
            />
          )}
          {(editModal.editingChartType === "meter" ||
            editModal.editingChartType === "line" ||
            editModal.editingChartType === "area") &&
            !(editModal.editingChartType !== "meter" && editModal.hideLineNumericInputs) && (
              <>
                <div className={formStyles["dashboard-inline-row"]}>
                <Input
                  id="device-edit-chart-min"
                  label="Min (optional)"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={editModal.editMin}
                  onChange={(event) => editModal.onEditMinChange(event.target.value)}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
                <Input
                  id="device-edit-chart-max"
                  label="Max (optional)"
                  type="text"
                  inputMode="decimal"
                  placeholder="100"
                  value={editModal.editMax}
                  onChange={(event) => editModal.onEditMaxChange(event.target.value)}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
                </div>
                <div className={formStyles["dashboard-inline-row"]}>
                  {(editModal.editingChartType === "line" ||
                    editModal.editingChartType === "area" ||
                    editModal.editingChartType === "meter") && (
                    <Input
                      id="device-edit-chart-ticks"
                      label="Ticks (optional)"
                      type="number"
                      inputMode="numeric"
                      min={2}
                      step={1}
                      placeholder="6"
                      value={editModal.editLineTicks}
                      onChange={(event) => editModal.onEditLineTicksChange(event.target.value)}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                  )}
                  {(editModal.editingChartType === "line" ||
                    editModal.editingChartType === "area" ||
                    editModal.editingChartType === "meter") && (
                    <Input
                      id="device-edit-chart-decimals"
                      label="Decimals (optional)"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="2"
                      value={editModal.editLineDecimals}
                      onChange={(event) => editModal.onEditLineDecimalsChange(event.target.value)}
                      groupClassName={formStyles["dashboard-inline-field"]}
                    />
                  )}
                </div>
              </>
            )}
          {!isEditButton && !editFieldOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>{editFieldMessage}</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={editModal.onSave}
              disabled={
                !editModal.editName.trim() ||
                (!isEditButton && (!editFieldOptions.length || !editModal.editField))
              }
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={filterModal.isOpen} onClose={filterModal.onClose} title="Chart filters">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-data-filter-mode"
            label="Mode"
            value={filterModal.filterMode}
            options={FILTER_MODE_OPTIONS}
            onChange={filterModal.onFilterModeChange}
            disabled={disabled}
          />
          {filterModal.filterMode === "raw" && (
            <div className={formStyles["dashboard-modal-hint"]}>
              Using live device data.
            </div>
          )}
          {filterModal.filterMode === "range" && (
            <>
              <div className={formStyles["dashboard-inline-row"]}>
                <DropdownSelect
                  id="device-data-range-preset"
                  label="Range"
                  value={filterModal.rangePreset}
                  options={RANGE_PRESET_OPTIONS}
                  onChange={filterModal.onRangePresetChange}
                  disabled={disabled}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
                <DropdownSelect
                  id="device-data-range-refresh"
                  label="Refresh rate"
                  value={String(filterModal.rangeRefreshValue)}
                  options={filterModal.rangeRefreshOptions}
                  onChange={filterModal.onRangeRefreshChange}
                  disabled={disabled || filterModal.rangeRefreshOptions.length === 0}
                  groupClassName={formStyles["dashboard-inline-field"]}
                />
              </div>
            </>
          )}
          {filterModal.filterMode === "custom" && (
            <>
              <DropdownSelect
                id="device-data-time-granularity"
                label="Granularity"
                value={filterModal.timeGranularity}
                options={LINE_GRANULARITY_OPTIONS}
                onChange={filterModal.onTimeGranularityChange}
                disabled={disabled}
              />
              <Input
                id="device-data-time-start"
                label={`Start ${filterModal.timeDateLabel}`}
                type={filterModal.timeDateInputType}
                step={filterModal.timeDateStep}
                value={filterModal.timeStart}
                onChange={(event) => filterModal.onTimeStartChange(event.target.value)}
                disabled={disabled}
                max={endTimeValue || undefined}
              />
              <Input
                id="device-data-time-end"
                label={`End ${filterModal.timeDateLabel}`}
                type={filterModal.timeDateInputType}
                step={filterModal.timeDateStep}
                value={filterModal.timeEnd}
                onChange={(event) => filterModal.onTimeEndChange(event.target.value)}
                disabled={disabled}
                min={startTimeValue || undefined}
                max={maxEndDate}
              />
              {hasTimeRangeError && (
                <p className={formStyles["dashboard-modal-error"]}>
                  End time must be after start time.
                </p>
              )}
              {!hasTimeRangeError && hasTimeRangeLimitError && rangeLimitLabel && (
                <p className={formStyles["dashboard-modal-error"]}>
                  Max range for {filterModal.timeGranularity} granularity is {rangeLimitLabel}.
                </p>
              )}
            </>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={filterModal.onClose}>
              Close
            </Button>
          </div>

        </div>
      </Modal>
    </>
  );
}
