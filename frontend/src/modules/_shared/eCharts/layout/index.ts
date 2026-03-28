export { computeSubplotGridLayout, DEFAULT_LAYOUT_CONFIG } from "./subplotGridLayout";
export type { SubplotLayoutConfig, SubplotLayoutResult, SubplotCell, GridEntry } from "./subplotGridLayout";

export { buildSubplotAxes } from "./subplotAxes";
export type { AxisDef, SubplotAxisDef, SubplotAxesResult } from "./subplotAxes";

export {
    getResponsiveFeatures,
    MIN_HEIGHT_FOR_SLIDERS,
    MIN_WIDTH_FOR_SLIDERS,
    MIN_HEIGHT_FOR_TOOLBOX,
    MIN_HEIGHT_FOR_LEGEND,
} from "./responsiveConfig";
export type { ResponsiveFeatures } from "./responsiveConfig";
