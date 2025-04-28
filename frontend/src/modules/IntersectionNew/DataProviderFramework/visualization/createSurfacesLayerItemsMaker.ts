import type { IntersectionReferenceSystem, SurfaceData } from "@equinor/esv-intersection";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { LayerType } from "@modules/_shared/components/EsvIntersection";

import type {
    RealizationSurfacesData,
    RealizationSurfacesSettings,
} from "../customDataProviderImplementations/RealizationSurfacesProvider";

export function createSurfacesLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
    getSetting,
}: TransformerArgs<RealizationSurfacesSettings, RealizationSurfacesData, any, any>): EsvLayerItemsMaker | null {
    const data = getData();
    const colorSet = getSetting(Setting.COLOR_SET);

    if (!data || !colorSet) {
        return null;
    }

    let currentColor = isLoading ? "#aaaaaa" : colorSet.getFirstColor();
    const surfaceData: SurfaceData = {
        areas: [],
        lines: data.map((surface) => {
            const color = currentColor;
            currentColor = isLoading ? "#aaaaaa" : colorSet.getNextColor();
            return {
                data: surface.cum_lengths.map((el, index) => [el, surface.z_points[index]]),
                color: color,
                id: surface.name,
                label: surface.name,
            };
        }),
    };

    const surfaceIntersectionLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null) => {
            if (!intersectionReferenceSystem) {
                throw new Error("IntersectionReferenceSystem is required to create intersection surface layer items");
            }

            return [
                {
                    id: `${id}-surfaces-layer`,
                    name: name,
                    type: LayerType.GEOMODEL_CANVAS,
                    hoverable: true,
                    options: {
                        data: surfaceData,
                        referenceSystem: intersectionReferenceSystem,
                    },
                },
                {
                    id: `${id}-surfaces-labels`,
                    name: `${name}-labels`,
                    type: LayerType.GEOMODEL_LABELS,
                    options: {
                        data: surfaceData,
                        referenceSystem: intersectionReferenceSystem,
                    },
                },
            ];
        },
    };

    return surfaceIntersectionLayerItemsMaker;
}
