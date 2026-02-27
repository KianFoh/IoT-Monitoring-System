import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export const useDebouncedValue = <T,>(value: T, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

type SearchOption = { id: number; name: string };

type SearchAutocompleteParams<T extends SearchOption> = {
  value: string;
  id: number | null;
  setValue: (value: string) => void;
  setId: (id: number | null) => void;
  active: boolean;
  queryKeyBase: unknown[];
  searchFn: (query: string) => Promise<T[]>;
  resolveId: (value: string, options: T[]) => number | null;
  enabled?: boolean;
  onInputChange?: (value: string, nextId: number | null, prevId: number | null) => void;
};

type SearchAutocompleteResult<T extends SearchOption> = {
  suggestions: T[];
  isFetching: boolean;
  showSuggestions: boolean;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handlePick: (option: T) => void;
};

export const useSearchAutocomplete = <T extends SearchOption>({
  value,
  id,
  setValue,
  setId,
  active,
  queryKeyBase,
  searchFn,
  resolveId,
  enabled,
  onInputChange,
}: SearchAutocompleteParams<T>): SearchAutocompleteResult<T> => {
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(value, 300);
  const isEnabled = active && !!debouncedQuery.trim() && (enabled ?? true);

  const { data: suggestions = [], isFetching } = useQuery<T[]>({
    queryKey: [...queryKeyBase, debouncedQuery],
    queryFn: () => searchFn(debouncedQuery),
    enabled: isEnabled,
    placeholderData: (prev) => prev ?? [],
  });

  useEffect(() => {
    if (!active) {
      setIsOpen(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const trimmed = value.trim();
    const nextId = trimmed ? resolveId(value, suggestions) : null;
    if (!trimmed || nextId === null) {
      if (id !== null) setId(null);
      return;
    }
    if (nextId !== id) setId(nextId);
  }, [active, value, suggestions, id, setId, resolveId]);

  const handleChange = (nextValue: string) => {
    const nextId = resolveId(nextValue, suggestions);
    const prevId = id;
    setValue(nextValue);
    setIsOpen(true);
    if (nextId !== prevId) {
      setId(nextId);
    }
    onInputChange?.(nextValue, nextId, prevId);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Allow list item click before closing the popover.
    setTimeout(() => setIsOpen(false), 120);
  };

  const handlePick = (option: T) => {
    const prevId = id;
    setValue(option.name);
    setIsOpen(false);
    if (option.id !== prevId) {
      setId(option.id);
    }
    onInputChange?.(option.name, option.id, prevId);
  };

  return {
    suggestions,
    isFetching,
    showSuggestions: active && isOpen && value.trim().length > 0,
    handleChange,
    handleFocus,
    handleBlur,
    handlePick,
  };
};
