import type { CSSProperties } from "react";

declare module "@tanstack/react-table" {
  // Extend column meta with dashboard-specific layout hints.
  interface ColumnMeta<TData, TValue> {
    width?: string | number;
    align?: CSSProperties["textAlign"];
    cellClass?: string;
  }
}
