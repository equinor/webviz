import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
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
import { LayerType } from "@modules/_shared/components/EsvIntersection";

export function createGridLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
    getSetting,
    getStoredData,
}: TransformerArgs<
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridData,
    IntersectionRealizationGridStoredData,
    any
>): EsvLayerItemsMaker | null {
    const intersectionData = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const intersectionExtensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;
    const showGridLines = getSetting(Setting.SHOW_GRID_LINES);
    const sourcePolylineWithSectionLengths = getStoredData("polylineWithSectionLengths");

    if (!intersectionData || !sourcePolylineWithSectionLengths || !colorScale) {
        return null;
    }

    if (sourcePolylineWithSectionLengths.polylineUtmXy.length === 0) {
        return null;
    }

    if (isLoading) {
        // Temporary
        // TODO: Handle loading state for color scale, or provide another layer for loading state
        return null;
    }

    // Temporary until we can ensure that fetched data and settings/stored data is synced as long
    // as isLoading is false
    if (intersectionData.fenceMeshSections.length !== sourcePolylineWithSectionLengths.actualSectionLengths.length) {
        throw new Error(
            "The number of fence mesh sections does not match the number of requested actual section lengths",
        );
        // return null;
    }

    const transformedPolylineIntersection = createTransformedPolylineIntersectionResult(
        intersectionData,
        sourcePolylineWithSectionLengths.actualSectionLengths,
    );

    // TODO: Always use custom boundaries for the color scale?
    const adjustedColorScale = colorScale.clone();
    const min = transformedPolylineIntersection.min_grid_prop_value;
    const max = transformedPolylineIntersection.max_grid_prop_value;
    const mid = min + (max - min) / 2;
    adjustedColorScale.setRangeAndMidPoint(min, max, mid);

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
                            extensionLengthStart: intersectionExtensionLength,
                            gridDimensions: {
                                cellCountI: transformedPolylineIntersection.grid_dimensions.i_count,
                                cellCountJ: transformedPolylineIntersection.grid_dimensions.j_count,
                                cellCountK: transformedPolylineIntersection.grid_dimensions.k_count,
                            },
                            propertyName: "", // settings.parameterName ?? "",
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
