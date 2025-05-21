import type { ViewportType, ViewsType } from "@webviz/subsurface-viewer";

import type { ColorScaleWithId } from "../components/ColorLegendsContainer/colorLegendsContainer";

export interface ViewportTypeExtended extends ViewportType {
    color: string | null;
    colorScales: ColorScaleWithId[];
}

export interface ViewsTypeExtended extends ViewsType {
    viewports: ViewportTypeExtended[];
}
