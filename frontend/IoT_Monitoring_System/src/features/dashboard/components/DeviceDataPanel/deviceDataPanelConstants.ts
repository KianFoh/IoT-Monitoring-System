import { getCompactor, type ResizeHandleAxis } from "react-grid-layout";

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 80;
export const GRID_MARGIN: [number, number] = [16, 16];
export const GRID_PADDING: [number, number] = [0, 0];
export const RESIZE_HANDLES: ResizeHandleAxis[] = ["se"];
export const RESIZE_HANDLE_INSET = 10;
export const DEFAULT_PANEL_SIZE = { w: 3, h: 2, minW: 1, minH: 1 };
export const SECTION_PREFIX = "section:";
export const SECTION_ROW_HEIGHT = 1;
export const GRID_COMPACTOR = getCompactor("vertical", false, false);
