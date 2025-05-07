import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type {
    IntersectionRealizationGridData,
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { createTransformedPolylineIntersectionResult } from "@modules/_shared/Intersection/gridIntersectionTransform";

import { createGridColorScaleValues } from "../utils.ts/colorScaleUtils";

export function createGridLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
    getSetting,
    getStoredData,
    getValueRange,
}: TransformerArgs<
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridData,
    IntersectionRealizationGridStoredData,
    any
>): EsvLayerItemsMaker | null {
    const intersectionData = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const extensionLength = getSetting(Setting.WELLBORE_EXTENSION_LENGTH) ?? 0;
    const showGridLines = getSetting(Setting.SHOW_GRID_LINES);
    const selectedAttribute = getSetting(Setting.ATTRIBUTE);
    const sourcePolylineWithSectionLengths = getStoredData("polylineWithSectionLengths");
    const valueRange = getValueRange();

    if (!intersectionData || !sourcePolylineWithSectionLengths || !colorScale || isLoading || !valueRange) {
        return null;
    }

    if (sourcePolylineWithSectionLengths.polylineUtmXy.length === 0) {
        return null;
    }

    if (intersectionData.fenceMeshSections.length !== sourcePolylineWithSectionLengths.actualSectionLengths.length) {
        throw new Error(
            `Number of fence mesh sections (${intersectionData.fenceMeshSections.length}) does not match  number of actual section
            lengths (${sourcePolylineWithSectionLengths.actualSectionLengths.length}) for requested polyline`,
        );
    }

    const transformedPolylineIntersection = createTransformedPolylineIntersectionResult(
        intersectionData,
        sourcePolylineWithSectionLengths.actualSectionLengths,
    );

    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createGridColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    const gridIntersectionLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null) => {
            void intersectionReferenceSystem; // Not used for this layer
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
