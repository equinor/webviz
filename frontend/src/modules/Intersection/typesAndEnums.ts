import type { Viewport } from "@framework/types/viewport";

export const MAX_INTERSECTION_VIEWS = 4;

export enum PreferredViewLayout {
    GRID = "grid",
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

export type ViewState = {
    viewport: Viewport | null;
    verticalScale: number;
};

export type ViewStateMap = Record<string, ViewState>;
