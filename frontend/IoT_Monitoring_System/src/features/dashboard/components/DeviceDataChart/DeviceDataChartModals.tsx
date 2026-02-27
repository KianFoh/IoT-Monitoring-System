import { Button } from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import DropdownSelect from "../DropdownSelect/DropdownSelect";
import { CHART_OPTIONS, LINE_GRANULARITY_OPTIONS } from "./deviceDataChartConstants";
import type { DisplayOption, ChartType, LineGranularity } from "./deviceDataChartTypes";
import type { SectionModalState } from "./deviceDataChartState";
import formStyles from "../DashboardForm/DashboardForm.module.css";
import dropdownStyles from "../DropdownSelect/DropdownSelect.module.css";

type DeviceDataChartModalsProps = {
  disabled?: boolean;
  dataOptions: Array<DisplayOption<string>>;
  canAddChart: boolean;
  sectionModalState: SectionModalState;
  onSectionNameChange: (value: string) => void;
  onSectionClose: () => void;
  onSectionSave: () => void;
  isAddOpen: boolean;
  selectedChartType: ChartType;
  selectedField: string;
  selectedMin: string;
  selectedMax: string;
  selectedLineFields: string[];
  selectedLineMin: string;
  selectedLineMax: string;
  onSelectedChartTypeChange: (value: ChartType) => void;
  onSelectedFieldChange: (value: string) => void;
  onSelectedMinChange: (value: string) => void;
  onSelectedMaxChange: (value: string) => void;
  onSelectedLineMinChange: (value: string) => void;
  onSelectedLineMaxChange: (value: string) => void;
  onToggleLineField: (value: string) => void;
  onCloseAdd: () => void;
  onAddChart: () => void;
  isEditOpen: boolean;
  editName: string;
  editField: string;
  editMin: string;
  editMax: string;
  editingChartType: ChartType | null;
  onEditNameChange: (value: string) => void;
  onEditFieldChange: (value: string) => void;
  onEditMinChange: (value: string) => void;
  onEditMaxChange: (value: string) => void;
  onCloseEdit: () => void;
  onSaveEdit: () => void;
  isFilterOpen: boolean;
  timeGranularity: LineGranularity;
  timeStart: string;
  timeEnd: string;
  timeDateInputType: string;
  timeDateStep?: number;
  timeDateLabel: string;
  onTimeGranularityChange: (value: LineGranularity) => void;
  onTimeStartChange: (value: string) => void;
  onTimeEndChange: (value: string) => void;
  onCloseFilter: () => void;
};

export function DeviceDataChartModals({
  disabled,
  dataOptions,
  canAddChart,
  sectionModalState,
  onSectionNameChange,
  onSectionClose,
  onSectionSave,
  isAddOpen,
  selectedChartType,
  selectedField,
  selectedMin,
  selectedMax,
  selectedLineFields,
  selectedLineMin,
  selectedLineMax,
  onSelectedChartTypeChange,
  onSelectedFieldChange,
  onSelectedMinChange,
  onSelectedMaxChange,
  onSelectedLineMinChange,
  onSelectedLineMaxChange,
  onToggleLineField,
  onCloseAdd,
  onAddChart,
  isEditOpen,
  editName,
  editField,
  editMin,
  editMax,
  editingChartType,
  onEditNameChange,
  onEditFieldChange,
  onEditMinChange,
  onEditMaxChange,
  onCloseEdit,
  onSaveEdit,
  isFilterOpen,
  timeGranularity,
  timeStart,
  timeEnd,
  timeDateInputType,
  timeDateStep,
  timeDateLabel,
  onTimeGranularityChange,
  onTimeStartChange,
  onTimeEndChange,
  onCloseFilter,
}: DeviceDataChartModalsProps) {
  return (
    <>
      <Modal
        isOpen={sectionModalState.isOpen}
        onClose={onSectionClose}
        title={sectionModalState.editingId ? "Rename section" : "Add section"}
      >
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-chart-section-name"
            label="Section name"
            placeholder="e.g. Core Metrics"
            value={sectionModalState.name}
            onChange={(event) => onSectionNameChange(event.target.value)}
          />
          {sectionModalState.error && (
            <p className={formStyles["dashboard-modal-error"]}>{sectionModalState.error}</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={onSectionClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSectionSave}
              disabled={!sectionModalState.name.trim()}
            >
              {sectionModalState.editingId ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddOpen} onClose={onCloseAdd} title="Add chart">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-chart-type"
            label="Chart type"
            value={selectedChartType}
            options={CHART_OPTIONS}
            onChange={onSelectedChartTypeChange}
            disabled={disabled}
          />
          {selectedChartType !== "line" && (
            <DropdownSelect
              id="device-chart-field"
              label="Data field"
              value={selectedField}
              options={dataOptions}
              placeholder={dataOptions.length ? "Select data" : "No data fields available"}
              onChange={onSelectedFieldChange}
              disabled={!dataOptions.length || disabled}
            />
          )}
          {selectedChartType === "line" && (
            <>
              <div>
                <span className={dropdownStyles["dashboard-select-label"]}>Data fields</span>
                <div className={formStyles["dashboard-checkbox-row"]}>
                  {dataOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="checkbox"
                        checked={selectedLineFields.includes(option.value)}
                        onChange={() => onToggleLineField(option.value)}
                        disabled={disabled}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={formStyles["dashboard-inline-row"]}>
                <Input
                  id="device-chart-line-min"
                  label="Min (optional)"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={selectedLineMin}
                  onChange={(event) => onSelectedLineMinChange(event.target.value)}
                  disabled={disabled}
                />
                <Input
                  id="device-chart-line-max"
                  label="Max (optional)"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  value={selectedLineMax}
                  onChange={(event) => onSelectedLineMaxChange(event.target.value)}
                  disabled={disabled}
                />
              </div>
            </>
          )}
          {selectedChartType === "meter" && (
            <div className={formStyles["dashboard-inline-row"]}>
              <Input
                id="device-chart-min"
                label="Min"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={selectedMin}
                onChange={(event) => onSelectedMinChange(event.target.value)}
                disabled={disabled}
              />
              <Input
                id="device-chart-max"
                label="Max"
                type="number"
                inputMode="decimal"
                placeholder="100"
                value={selectedMax}
                onChange={(event) => onSelectedMaxChange(event.target.value)}
                disabled={disabled}
              />
            </div>
          )}
          {!dataOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>Add data fields in the data panel first.</p>
          )}
          {selectedChartType === "line" &&
            dataOptions.length > 0 &&
            selectedLineFields.length === 0 && (
              <p className={formStyles["dashboard-modal-error"]}>Select at least one data field.</p>
            )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={onCloseAdd}>
              Cancel
            </Button>
            <Button type="button" onClick={onAddChart} disabled={!canAddChart}>
              Add chart
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={onCloseEdit} title="Edit chart">
        <div className={formStyles["dashboard-modal-form"]}>
          <Input
            id="device-edit-chart-name"
            label="Chart name"
            placeholder="Enter chart name"
            value={editName}
            onChange={(event) => onEditNameChange(event.target.value)}
          />
          <DropdownSelect
            id="device-edit-chart-field"
            label="Data field"
            value={editField}
            options={dataOptions}
            placeholder={dataOptions.length ? "Select data" : "No data fields available"}
            onChange={onEditFieldChange}
            disabled={!dataOptions.length}
          />
          {(editingChartType === "meter" || editingChartType === "line") && (
            <div className={formStyles["dashboard-inline-row"]}>
              <Input
                id="device-edit-chart-min"
                label="Min"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={editMin}
                onChange={(event) => onEditMinChange(event.target.value)}
              />
              <Input
                id="device-edit-chart-max"
                label="Max"
                type="number"
                inputMode="decimal"
                placeholder="100"
                value={editMax}
                onChange={(event) => onEditMaxChange(event.target.value)}
              />
            </div>
          )}
          {!dataOptions.length && (
            <p className={formStyles["dashboard-modal-error"]}>Add data fields in the data panel first.</p>
          )}
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={onCloseEdit}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSaveEdit}
              disabled={!editName.trim() || (!editField && dataOptions.length > 0)}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isFilterOpen} onClose={onCloseFilter} title="Chart filters">
        <div className={formStyles["dashboard-modal-form"]}>
          <DropdownSelect
            id="device-data-time-granularity"
            label="Granularity"
            value={timeGranularity}
            options={LINE_GRANULARITY_OPTIONS}
            onChange={onTimeGranularityChange}
            disabled={disabled}
          />
          <Input
            id="device-data-time-start"
            label={`Start ${timeDateLabel}`}
            type={timeDateInputType}
            step={timeDateStep}
            value={timeStart}
            onChange={(event) => onTimeStartChange(event.target.value)}
            disabled={disabled}
          />
          <Input
            id="device-data-time-end"
            label={`End ${timeDateLabel}`}
            type={timeDateInputType}
            step={timeDateStep}
            value={timeEnd}
            onChange={(event) => onTimeEndChange(event.target.value)}
            disabled={disabled}
          />
          <div className={formStyles["dashboard-modal-actions"]}>
            <Button type="button" variant="cancel" onClick={onCloseFilter}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
