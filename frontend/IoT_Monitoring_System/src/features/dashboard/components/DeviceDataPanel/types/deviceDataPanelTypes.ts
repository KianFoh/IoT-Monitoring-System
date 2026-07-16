import type { ChartFilterMode } from "../../DeviceDataChart/types/deviceDataChartTypes";

export type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

export type FieldType = "number" | "text" | "list" | "boolean";
export type FieldMetric =
  | "last_state"
  | "count"
  | "sum"
  | "min"
  | "max"
  | "last_value"
  | "avg"
  | "latest_value"
  | "latest_list";

export type PanelLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  static?: boolean;
  maxW?: number;
};

export type PanelSection = {
  id: string;
  name: string;
  collapsed?: boolean;
};

export type ListModalItem = {
  label: string;
  matchKey: string;
};

export type DeviceDataPanelProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  deviceUid: string;
  dataIntervalSeconds?: number | null;
  rawTimestamp?: Date | null;
  filterMode: ChartFilterMode;
  onFilterModeChange: (value: ChartFilterMode) => void;
  disabled?: boolean;
  readOnly?: boolean;
  subtitle: string;
  panelFields: string[];
  panelLayout: PanelLayoutItem[];
  panelSections: PanelSection[];
  getFieldLabel: (field: string) => string;
  getFieldSectionId: (field: string) => string | null;
  getFieldRawValue: (field: string) => unknown;
  getFieldValue: (field: string) => string;
  getFieldBooleanDisplay?: (field: string, rawValue?: unknown) => { label: string; color?: string };
  getFieldBooleanColors?: (
    field: string
  ) => { trueColor?: string; falseColor?: string } | null | undefined;
  getFieldBooleanLabels?: (
    field: string
  ) => { trueLabel?: string; falseLabel?: string } | null | undefined;
  getFieldType: (field: string) => FieldType;
  getFieldMetric?: (field: string) => FieldMetric;
  getFieldUnit: (field: string) => string;
  getFieldColor?: (field: string) => string;
  getFieldCases?: (field: string) => string[] | null | undefined;
  getFieldCaseColors?: (field: string) => Record<string, string> | null;
  onOpenFieldConfig: (field: string) => void;
  onAddField: () => void;
  onDuplicateField?: (field: string) => void;
  onRemoveField: (field: string) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onDeleteSection: (sectionId: string, fieldsInSection?: string[]) => void;
  onToggleSection: (sectionId: string) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveLayout?: (payload: {
    layout: PanelLayoutItem[];
    assignments?: Record<string, string | null>;
  }) => Promise<void>;
  layoutSaving?: boolean;
  layoutError?: string | null;
};
