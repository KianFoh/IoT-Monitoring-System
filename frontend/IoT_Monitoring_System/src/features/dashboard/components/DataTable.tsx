import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import styles from "../styles/dashboard.module.css";

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  tableClassName?: string; // accepts final classname (module value or global string)
  emptyMessage?: string;
};

export function DataTable<TData>({
  data,
  columns,
  tableClassName = styles["dashboard-table"], // default to module class value
  emptyMessage = "No records found",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // build col widths from columnDef.meta.width if provided
  const headerGroup = table.getHeaderGroups()[0];
  const colWidths = headerGroup
    ? headerGroup.headers.map((h) => {
        const meta = (h.column.columnDef as any).meta as { width?: string | number } | undefined;
        if (!meta || meta.width == null) return undefined;
        return typeof meta.width === "number" ? `${meta.width}px` : String(meta.width);
      })
    : [];

  return (
    <div className={styles["dashboard-table-container"]}>
      <table className={tableClassName}>
        <colgroup>
          {colWidths.map((w, idx) => (
            <col key={idx} style={w ? { width: w } : undefined} />
          ))}
        </colgroup>

        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
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
                  const meta = (cell.column.columnDef as any).meta as { cellClass?: string } | undefined;
                  const baseClass =
                    cell.column.id === "actions"
                      ? styles["dashboard-cell-content-actions"]
                      : styles["dashboard-cell-content"];
                  const combinedClass = [baseClass, meta?.cellClass].filter(Boolean).join(" ");
                  return (
                    <td key={cell.id}>
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