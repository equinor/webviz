import type { Viewport } from "@framework/types/viewport";

export const MAX_INTERSECTION_VIEWS = 4;

export enum PreferredViewLayout {
    GRID = "grid",
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

export type UnlinkedViewState = {
    viewport: Viewport;
    verticalScale: number;
};
