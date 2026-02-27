import { useCallback, useState } from "react";
import type { PanelSection } from "./deviceDataPanelTypes";

export type SectionModalState = {
  isOpen: boolean;
  name: string;
  error: string | null;
  editingId: string | null;
};

const INITIAL_SECTION_MODAL_STATE: SectionModalState = {
  isOpen: false,
  name: "",
  error: null,
  editingId: null,
};

export const useSectionModalState = () => {
  const [state, setState] = useState<SectionModalState>(INITIAL_SECTION_MODAL_STATE);

  const openAdd = useCallback(
    () =>
      setState({
        isOpen: true,
        name: "",
        error: null,
        editingId: null,
      }),
    []
  );
  const openRename = useCallback(
    (section: PanelSection) =>
      setState({
        isOpen: true,
        name: section.name,
        error: null,
        editingId: section.id,
      }),
    []
  );
  const close = useCallback(() => setState(INITIAL_SECTION_MODAL_STATE), []);
  const setName = useCallback((name: string) => setState((prev) => ({ ...prev, name })), []);
  const setError = useCallback(
    (error: string | null) => setState((prev) => ({ ...prev, error })),
    []
  );
  const reset = useCallback(() => setState(INITIAL_SECTION_MODAL_STATE), []);

  return {
    state,
    openAdd,
    openRename,
    close,
    setName,
    setError,
    reset,
  };
};
