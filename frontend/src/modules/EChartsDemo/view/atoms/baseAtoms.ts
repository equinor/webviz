import { atom } from "jotai";
import type { ChartZoomState } from "@modules/_shared/eCharts/core/composeChartOption";

export const INITIAL_ZOOM: ChartZoomState = { x: { start: 0, end: 100 }, y: { start: 0, end: 100 } };

export const chartZoomAtom = atom<ChartZoomState>(INITIAL_ZOOM);