import { FaChartLine, FaEdit, FaTrashAlt } from "react-icons/fa";
import styles from "./TableActions.module.css";

type TableActionsProps<TData> = {
  item: TData;
  onEdit?: (item: TData) => void;
  onDelete?: (item: TData) => void;
  onView?: (item: TData) => void;
  editTitle?: string;
  deleteTitle?: string;
  viewTitle?: string;
  deleteDisabledReason?: string;
  showEdit?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  disableDelete?: boolean;
};

export function TableActions<TData>({
  item,
  onEdit,
  onDelete,
  onView,
  editTitle = "Edit",
  deleteTitle = "Delete",
  viewTitle = "View dashboard",
  deleteDisabledReason,
  showEdit = true,
  showDelete = true,
  showView = Boolean(onView),
  disableDelete = false,
}: TableActionsProps<TData>) {
  const resolvedDeleteTitle = disableDelete && deleteDisabledReason ? deleteDisabledReason : deleteTitle;
  return (
    <div className={styles["dashboard-action-buttons"]}>
      {showView && onView && (
        <button
          type="button"
          className={styles["dashboard-btn-view"]}
          onClick={() => onView(item)}
          title={viewTitle}
        >
          <FaChartLine />
        </button>
      )}
      {showEdit && onEdit && (
        <button
          type="button"
          className={styles["dashboard-btn-edit"]}
          onClick={() => onEdit(item)}
          title={editTitle}
        >
          <FaEdit />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          type="button"
          className={styles["dashboard-btn-delete"]}
          onClick={() => onDelete(item)}
          title={resolvedDeleteTitle}
          disabled={disableDelete}
        >
          <FaTrashAlt />
        </button>
      )}
    </div>
  );
}
