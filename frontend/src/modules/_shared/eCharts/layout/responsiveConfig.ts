import type { ContainerSize } from "../types";

export const MIN_HEIGHT_FOR_SLIDERS = 300;
export const MIN_WIDTH_FOR_SLIDERS = 400;
export const MIN_HEIGHT_FOR_TOOLBOX = 200;
export const MIN_HEIGHT_FOR_LEGEND = 250;

export interface ResponsiveFeatures {
    showSliders: boolean;
    showToolbox: boolean;
    showLegend: boolean;
}

export function getResponsiveFeatures(containerSize?: ContainerSize): ResponsiveFeatures {
    return {
        showSliders:
            !containerSize ||
            (containerSize.height >= MIN_HEIGHT_FOR_SLIDERS && containerSize.width >= MIN_WIDTH_FOR_SLIDERS),
        showToolbox: !containerSize || containerSize.height >= MIN_HEIGHT_FOR_TOOLBOX,
        showLegend: !containerSize || containerSize.height >= MIN_HEIGHT_FOR_LEGEND,
    };
}
