import { FaEdit, FaTrashAlt } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";

type TableActionsProps<TData> = {
  item: TData;
  onEdit?: (item: TData) => void;
  onDelete?: (item: TData) => void;
  editTitle?: string;
  deleteTitle?: string;
  showEdit?: boolean;
  showDelete?: boolean;
};

export function TableActions<TData>({
  item,
  onEdit,
  onDelete,
  editTitle = "Edit",
  deleteTitle = "Delete",
  showEdit = true,
  showDelete = true,
}: TableActionsProps<TData>) {
  return (
    <div className={styles["dashboard-action-buttons"]}>
      {showEdit && onEdit && (
        <button
          className={styles["dashboard-btn-edit"]}
          onClick={() => onEdit(item)}
          title={editTitle}
        >
          <FaEdit />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          className={styles["dashboard-btn-delete"]}
          onClick={() => onDelete(item)}
          title={deleteTitle}
        >
          <FaTrashAlt />
        </button>
      )}
    </div>
  );
}