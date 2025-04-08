import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import { Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import type {
    RealizationGridData,
    RealizationGridSettings,
} from "../customDataProviderImplementations/RealizationGridProvider";

export function makeRealizationGridLayer({
    id,
    getData,
    getSetting,
}: TransformerArgs<RealizationGridSettings, RealizationGridData>): Grid3DLayer | null {
    const data = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!data) {
        return null;
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
        gridLines: showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
        colorMapFunction: makeColorMapFunctionFromColorScale(
            colorScale,
            gridParameterData.min_grid_prop_value,
            gridParameterData.max_grid_prop_value,
        ),
    });
    return grid3dLayer;
}
