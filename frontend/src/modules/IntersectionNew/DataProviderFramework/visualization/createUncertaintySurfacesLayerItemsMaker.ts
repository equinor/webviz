import type { IntersectionReferenceSystem, SurfaceLine } from "@equinor/esv-intersection";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type { SurfaceStatisticalFanchart } from "@modules/_shared/components/EsvIntersection/layers/SurfaceStatisticalFanchartCanvasLayer";
import { makeSurfaceStatisticalFanchartFromRealizationSurface } from "@modules/_shared/components/EsvIntersection/utils/surfaceStatisticalFancharts";

import type {
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesStoredData,
} from "../customDataProviderImplementations/SurfacesPerRealizationValuesProvider";

export function createUncertaintySurfacesLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
    getSetting,
    getStoredData,
}: TransformerArgs<
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesStoredData,
    any
>): EsvLayerItemsMaker | null {
    const data = getData();
    const colorSet = getSetting(Setting.COLOR_SET);

    const requestedPolylineWithCumulatedLengths = getStoredData("requestedPolylineWithCumulatedLengths");

    if (!data || !colorSet || !requestedPolylineWithCumulatedLengths) {
        return null;
    }

    const requestedPolylineLength = requestedPolylineWithCumulatedLengths.xUtmPoints.length;
    const cumulatedHorizontalPolylineLengths =
        requestedPolylineWithCumulatedLengths.cumulatedHorizontalPolylineLengthArr;

    let currentColor = isLoading ? "#aaaaaa" : colorSet.getFirstColor();
    const labelData: SurfaceLine[] = [];
    const fancharts: SurfaceStatisticalFanchart[] = [];

    for (const [surfaceName, perRealizationValues] of Object.entries(data)) {
        const sampledValues = perRealizationValues.map((realization) => realization.sampled_values);

        for (const realizationValues of sampledValues) {
            if (realizationValues.length !== requestedPolylineLength) {
                // throw new Error("Length of sampled values does not match length of requested polyline");
            }
        }

        const fanchart = makeSurfaceStatisticalFanchartFromRealizationSurface(
            sampledValues,
            cumulatedHorizontalPolylineLengths,
            surfaceName,
            currentColor,
        );
        labelData.push({
            data: fanchart.data.mean,
            color: currentColor,
            label: surfaceName,
        });
        fancharts.push(fanchart);

        // Update color for the next surface
        if (!isLoading) {
            currentColor = colorSet.getNextColor();
        }
    }

    const uncertaintySurfaceIntersectionLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null) => {
            if (!intersectionReferenceSystem) {
                throw new Error("IntersectionReferenceSystem is required to create intersection surface layer items");
            }

            return [
                {
                    id: `${id}-uncertainty-surfaces-layer`,
                    name: name,
                    type: LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS,
                    hoverable: true,
                    options: {
                        data: {
                            fancharts,
                        },

                        referenceSystem: intersectionReferenceSystem ?? undefined,
                    },
                },
                {
                    id: `${id}-uncertainty-surfaces-labels`,
                    name: `${name}-labels`,
                    type: LayerType.GEOMODEL_LABELS,
                    options: {
                        data: {
                            areas: [],
                            lines: labelData,
                        },
                        referenceSystem: intersectionReferenceSystem ?? undefined,
                    },
                },
            ];
        },
    };

    return uncertaintySurfaceIntersectionLayerItemsMaker;
}
