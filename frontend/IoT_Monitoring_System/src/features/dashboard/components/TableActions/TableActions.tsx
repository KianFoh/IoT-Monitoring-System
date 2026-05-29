import { FaChartLine, FaEdit, FaTrashAlt } from "react-icons/fa";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
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
  const stopActionEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const handleActionPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    action: (item: TData) => void,
    blocked = false
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0 || blocked) return;
    action(item);
  };
  const handleActionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    action: (item: TData) => void,
    blocked = false
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    if (blocked) return;
    action(item);
  };

  return (
    <div className={styles["dashboard-action-buttons"]}>
      {showView && onView && (
        <button
          type="button"
          className={styles["dashboard-btn-view"]}
          onPointerDown={(event) => handleActionPointerDown(event, onView)}
          onClick={stopActionEvent}
          onKeyDown={(event) => handleActionKeyDown(event, onView)}
          title={viewTitle}
        >
          <FaChartLine />
        </button>
      )}
      {showEdit && onEdit && (
        <button
          type="button"
          className={styles["dashboard-btn-edit"]}
          onPointerDown={(event) => handleActionPointerDown(event, onEdit)}
          onClick={stopActionEvent}
          onKeyDown={(event) => handleActionKeyDown(event, onEdit)}
          title={editTitle}
        >
          <FaEdit />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          type="button"
          className={styles["dashboard-btn-delete"]}
          onPointerDown={(event) => handleActionPointerDown(event, onDelete, disableDelete)}
          onClick={stopActionEvent}
          onKeyDown={(event) => handleActionKeyDown(event, onDelete, disableDelete)}
          title={resolvedDeleteTitle}
          disabled={disableDelete}
        >
          <FaTrashAlt />
        </button>
      )}
    </div>
  );
}
