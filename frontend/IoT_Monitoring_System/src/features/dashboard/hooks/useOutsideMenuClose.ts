import { useEffect } from "react";

export const useOutsideMenuClose = (
  activeId: string | null,
  dataAttribute: string,
  setActiveId: (value: string | null) => void
) => {
  useEffect(() => {
    if (!activeId) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(`[${dataAttribute}="${activeId}"]`)) return;
      setActiveId(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeId, dataAttribute, setActiveId]);
};
