import { FaEdit, FaTrashAlt } from "react-icons/fa";
import "../styles/dashboard.css";

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
    <div className="action-buttons">
      {showEdit && onEdit && (
        <button
          className="btn-edit"
          onClick={() => onEdit(item)}
          title={editTitle}
        >
          <FaEdit />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          className="btn-delete"
          onClick={() => onDelete(item)}
          title={deleteTitle}
        >
          <FaTrashAlt />
        </button>
      )}
    </div>
  );
}