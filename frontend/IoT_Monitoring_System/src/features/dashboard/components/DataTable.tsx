import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import styles from "../styles/dashboard.module.css";
import type { CSSProperties } from "react";

type ColumnMeta = {
  width?: string | number;
  align?: CSSProperties["textAlign"];
  cellClass?: string;
};

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  tableClassName?: string;
  emptyMessage?: string;
};

export function DataTable<TData>({
  data,
  columns,
  tableClassName = styles["dashboard-table"], 
  emptyMessage = "No records found",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const headerGroup = table.getHeaderGroups()[0];
  const colStyles = headerGroup
    ? headerGroup.headers.map((h) => {
        const meta = (h.column.columnDef as any).meta as ColumnMeta | undefined;
        const style: CSSProperties = {};
        if (meta?.width != null) style.width = typeof meta.width === "number" ? `${meta.width}px` : meta.width;
        return style;
      })
    : [];

  return (
    <div className={styles["dashboard-table-container"]}>
      <table className={tableClassName}>
        <colgroup>
          {colStyles.map((style, idx) => (
            <col key={idx} style={Object.keys(style).length ? style : undefined} />
          ))}
        </colgroup>

        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = (header.column.columnDef as any).meta as ColumnMeta | undefined;
                const alignStyle = meta?.align ? { textAlign: meta.align } : undefined;
                return (
                  <th key={header.id} style={alignStyle}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = (cell.column.columnDef as any).meta as ColumnMeta | undefined;
                  const combinedClass = [
                    styles["dashboard-cell-content"],
                    meta?.cellClass,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const alignStyle = meta?.align ? { textAlign: meta.align } : undefined;
                  return (
                    <td key={cell.id} style={alignStyle}>
                      <div className={combinedClass}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
