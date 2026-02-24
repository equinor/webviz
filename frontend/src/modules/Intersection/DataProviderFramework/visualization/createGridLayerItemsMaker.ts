import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type {
    IntersectionRealizationGridData,
    IntersectionRealizationGridProviderMeta,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { createTransformedPolylineIntersectionResult } from "@modules/_shared/Intersection/gridIntersectionTransform";

import { createGridColorScaleValues } from "../utils/colorScaleUtils";

export function createGridLayerItemsMaker({
    id,
    name,
    isLoading,
    state,
}: TransformerArgs<IntersectionRealizationGridData, IntersectionRealizationGridProviderMeta>):
    | EsvLayerItemsMaker
    | null {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const intersectionData = snapshot.data;
    const colorScale = snapshot.meta.colorScale?.colorScale;
    const colorOpacityPercent = snapshot.meta.opacityPercent ?? 100;
    const useCustomColorScaleBoundaries = snapshot.meta.colorScale?.areBoundariesUserDefined ?? false;
    const showGridLines = snapshot.meta.showGridLines;
    const selectedAttribute = snapshot.dataLabel;
    const polylineActualSectionLengths = snapshot.meta.polylineActualSectionLengths;
    const valueRange = snapshot.valueRange;
    const extensionLength = snapshot.meta.extensionLength;

    if (
        !intersectionData ||
        polylineActualSectionLengths.length === 0 ||
        !colorScale ||
        isLoading ||
        !valueRange
    ) {
        return null;
    }

    if (intersectionData.fenceMeshSections.length !== polylineActualSectionLengths.length) {
        throw new Error(
            `Number of fence mesh sections (${intersectionData.fenceMeshSections.length}) does not match number of actual section
            lengths (${polylineActualSectionLengths.length}) for requested polyline`,
        );
    }

    const transformedPolylineIntersection = createTransformedPolylineIntersectionResult(
        intersectionData,
        polylineActualSectionLengths,
    );

    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createGridColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    const gridIntersectionLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: () => {
            return [
                {
                    id: `${id}-grid-layer`,
                    name: name,
                    type: LayerType.POLYLINE_INTERSECTION,
                    options: {
                        data: {
                            fenceMeshSections: transformedPolylineIntersection.fenceMeshSections.map((section) => ({
                                verticesUzArr: section.verticesUzFloat32Arr,
                                verticesPerPolyArr: section.verticesPerPolyUintArr,
                                polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                                polyPropsArr: section.polyPropsFloat32Arr,
                                polyIndicesArr: section.polyIndicesUintArr,
                                sectionLength: section.sectionLength,
                                minZ: section.minZ,
                                maxZ: section.maxZ,
                            })),
                            minGridPropValue: transformedPolylineIntersection.min_grid_prop_value,
                            maxGridPropValue: transformedPolylineIntersection.max_grid_prop_value,
                            colorScale: adjustedColorScale,
                            opacityPercent: colorOpacityPercent,
                            hideGridlines: !showGridLines,
                            extensionLengthStart: extensionLength,
                            gridDimensions: {
                                cellCountI: transformedPolylineIntersection.grid_dimensions.i_count,
                                cellCountJ: transformedPolylineIntersection.grid_dimensions.j_count,
                                cellCountK: transformedPolylineIntersection.grid_dimensions.k_count,
                            },
                            propertyName: selectedAttribute ?? "",
                            propertyUnit: "",
                        },
                    },
                    hoverable: true,
                },
            ];
        },
    };

    return gridIntersectionLayerItemsMaker;
}
