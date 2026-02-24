import { Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { RealizationGridProviderMeta } from "../sharedMetaTypes/realizationGrid";
import { makeColorMapFunctionFromColorScale } from "../utils/colors";
import type { RealizationGridData } from "../utils/types";

export function makeRealizationGridLayer(
    args: TransformerArgs<RealizationGridData, RealizationGridProviderMeta>,
): Grid3DLayer | null {
    const { id, state, isLoading } = args;
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const data = snapshot.data;
    let colorScaleSpec = snapshot.meta.colorScale;
    const showGridLines = snapshot.meta.showGridLines;
    const opacityPercent = snapshot.meta.opacityPercent;

    if (!data || !colorScaleSpec) {
        return null;
    }

    colorScaleSpec = {
        colorScale: colorScaleSpec.colorScale,
        areBoundariesUserDefined: colorScaleSpec.areBoundariesUserDefined,
    };

    if (isLoading) {
        colorScaleSpec.colorScale = new ColorScale({
            colorPalette: new ColorPalette({
                name: "Loading",
                colors: ["#EEEEEE", "#EFEFEF"],
                id: "black-white",
            }),
            gradientType: ColorScaleGradientType.Sequential,
            type: ColorScaleType.Continuous,
            steps: 100,
        });
    }

    const { gridSurfaceData, gridParameterData } = data;

    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsNumberArray = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysNumberArray = gridSurfaceData.polysUint32Arr;
    const grid3dLayer = new Grid3DLayer({
        id: id,
        pointsData: pointsNumberArray,
        polysData: polysNumberArray,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: showGridLines,
        opacity: opacityPercent / 100,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: gridParameterData.min_grid_prop_value,
            valueMax: gridParameterData.max_grid_prop_value,
            denormalize: true,
        }),
    });
    return grid3dLayer;
}
