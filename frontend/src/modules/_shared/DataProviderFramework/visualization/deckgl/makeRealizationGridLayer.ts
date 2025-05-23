import { Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { makeColorMapFunctionFromColorScale } from "../utils/colors";
import type { RealizationGridData } from "../utils/types";

const realizationGridSettings = [Setting.SHOW_GRID_LINES, Setting.COLOR_SCALE] as const;
type RealizationGridSettings = typeof realizationGridSettings;

export function makeRealizationGridLayer(
    args: TransformerArgs<RealizationGridSettings, RealizationGridData>,
): Grid3DLayer | null {
    const { id, getData, getSetting, isLoading } = args;
    const data = getData();
    let colorScaleSpec = getSetting(Setting.COLOR_SCALE);

    if (!data || !colorScaleSpec) {
        return null;
    }

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
    const showGridLines = getSetting(Setting.SHOW_GRID_LINES);

    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsNumberArray = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysNumberArray = gridSurfaceData.polysUint32Arr;
    const grid3dLayer = new Grid3DLayer({
        id: id,
        pointsData: pointsNumberArray,
        polysData: polysNumberArray,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: showGridLines ?? false,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: gridParameterData.min_grid_prop_value,
            valueMax: gridParameterData.max_grid_prop_value,
            unnormalize: true,
        }),
    });
    return grid3dLayer;
}
