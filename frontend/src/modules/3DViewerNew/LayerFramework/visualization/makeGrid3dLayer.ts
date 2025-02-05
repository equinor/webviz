import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { RealizationGridLayerData } from "../customLayerImplementations/RealizationGridLayer/RealizationGridLayer";
import { RealizationGridSettings } from "../customLayerImplementations/RealizationGridLayer/types";

export function makeGrid3DLayer({
    id,
    data,
    settings,
    colorScale,
}: VisualizationFunctionArgs<RealizationGridSettings, RealizationGridLayerData>): Grid3DLayer {
    const { gridSurfaceData, gridParameterData } = data;
    const offsetXyz = [gridSurfaceData.origin_utm_x, gridSurfaceData.origin_utm_y, 0];
    const pointsData = gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
    const polysData = gridSurfaceData.polysUint32Arr;

    return new Grid3DLayer({
        id,
        pointsData,
        polysData,
        propertiesData: gridParameterData.polyPropsFloat32Arr,
        ZIncreasingDownwards: false,
        gridLines: settings.showGridLines,
        material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        pickable: true,
        colorMapName: "Physics",
        colorMapClampColor: true,
        colorMapRange: [gridParameterData.min_grid_prop_value, gridParameterData.max_grid_prop_value],
        colorMapFunction: makeColorMapFunctionFromColorScale(
            colorScale,
            gridParameterData.min_grid_prop_value,
            gridParameterData.max_grid_prop_value
        ),
    });
}
