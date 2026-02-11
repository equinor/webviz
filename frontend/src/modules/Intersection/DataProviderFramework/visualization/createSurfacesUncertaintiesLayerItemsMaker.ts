import type { IntersectionReferenceSystem, SurfaceLine } from "@equinor/esv-intersection";

import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type { SurfaceStatisticalFanchart } from "@modules/_shared/components/EsvIntersection/layers/SurfaceStatisticalFanchartCanvasLayer";
import { makeSurfaceStatisticalFanchartFromRealizationSurface } from "@modules/_shared/components/EsvIntersection/utils/surfaceStatisticalFancharts";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesProviderMeta,
} from "../customDataProviderImplementations/SurfacesPerRealizationValuesProvider";

export function createSurfacesUncertaintiesLayerItemsMaker({
    id,
    name,
    isLoading,
    state,
}: TransformerArgs<
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesProviderMeta
>): EsvLayerItemsMaker | null {
    const snapshot = state?.snapshot;

    if (!snapshot || !snapshot.data || !snapshot.meta.colorSet || isLoading) {
        return null;
    }

    const data = snapshot.data;
    const colorSet = snapshot.meta.colorSet;
    const requestedPolylineLength = snapshot.meta.polylineLength;
    const cumulatedHorizontalPolylineLengths = snapshot.meta.cumulatedHorizontalPolylineLengthArr;

    const labelData: SurfaceLine[] = [];
    const fancharts: SurfaceStatisticalFanchart[] = [];
    let currentColor = colorSet.getFirstColor();
    for (const [surfaceName, perRealizationValues] of Object.entries(data)) {
        const sampledValues = perRealizationValues.map((realization) => realization.sampled_values);

        if (sampledValues.length === 0) {
            continue;
        }

        // Verify sample values length using first fetched realization
        const numPoints = sampledValues[0].length;
        if (numPoints !== requestedPolylineLength) {
            throw new Error(
                `Number of surface sampled values (${numPoints}) does not match length of requested polyline (${requestedPolylineLength})`,
            );
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
        currentColor = colorSet.getNextColor();
    }

    const surfacesUncertaintiesLayerItemsMaker: EsvLayerItemsMaker = {
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

    return surfacesUncertaintiesLayerItemsMaker;
}
