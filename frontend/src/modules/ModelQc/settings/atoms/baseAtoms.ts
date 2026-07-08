import { atom } from "jotai";

// Default max allowed relative change for the grid property check. Mirrors the backend default
// (webviz_services ... equilibrium_logic.DEFAULT_GRID_CHANGE_THRESHOLD = 1e-3).
export const DEFAULT_GRID_CHECK_THRESHOLD = 1e-3;

export const gridCheckThresholdAtom = atom<number>(DEFAULT_GRID_CHECK_THRESHOLD);
