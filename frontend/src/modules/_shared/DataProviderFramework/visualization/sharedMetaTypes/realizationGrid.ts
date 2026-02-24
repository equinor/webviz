import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";

export type RealizationGridProviderMeta = {
    colorScale: ColorScaleSpecification | null;
    showGridLines: boolean;
    opacityPercent: number;
};
