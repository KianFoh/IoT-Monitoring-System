export type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

export type FieldType = "number" | "text" | "list";

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

export type DeviceDataPanelProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
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
  getFieldType: (field: string) => FieldType;
  getFieldUnit: (field: string) => string;
  onOpenFieldConfig: (field: string) => void;
  onAddField: () => void;
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
