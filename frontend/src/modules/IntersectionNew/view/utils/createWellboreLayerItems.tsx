import type { Casing, IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { WellboreCasing_api } from "@api";
import type { LayerItem } from "@modules/_shared/components/EsvIntersection";
import { LayerType } from "@modules/_shared/components/EsvIntersection";

/**
 * Create layer item for wellbore casing data
 */
function createCasingLayerItem(
    wellboreCasingData: WellboreCasing_api[],
    referenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
): LayerItem {
    const casings: Casing[] = wellboreCasingData.map((casing, index) => ({
        id: `casing-${index}`,
        diameter: casing.diameterNumeric,
        start: casing.depthTopMd,
        end: casing.depthBottomMd,
        innerDiameter: casing.diameterInner,
        kind: "casing",
        hasShoe: false,
    }));

    return {
        id: "schematic",
        name: "Schematic",
        type: LayerType.SCHEMATIC,
        hoverable: true,
        options: {
            data: {
                holeSizes: [],
                casings,
                cements: [],
                completion: [],
                pAndA: [],
                symbols: {},
                perforations: [],
            },
            order: layerOrder,
            referenceSystem: referenceSystem,
        },
    };
}

/**
 * Create layer item for wellbore path
 */
function createWellborePathLayerItem(
    intersectionReferenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
): LayerItem {
    return {
        id: "wellbore-path",
        name: "Wellbore path",
        type: LayerType.WELLBORE_PATH,
        hoverable: true,
        options: {
            stroke: "red",
            strokeWidth: "2",
            order: layerOrder,
            data: intersectionReferenceSystem.projectedPath as [number, number][],
        },
    };
}

/**
 * Create layer items for wellbore casing and path
 *
 * Assuming intersectionReferenceSystem given by a wellbore trajectory
 */
export function createWellboreLayerItems(
    wellboreCasingData: WellboreCasing_api[] | null,
    intersectionReferenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
): LayerItem[] {
    const layerItems: LayerItem[] = [];

    let newLayerOrder = layerOrder;
    if (wellboreCasingData && intersectionReferenceSystem) {
        const casingLayerOrder = newLayerOrder++;
        layerItems.push(createCasingLayerItem(wellboreCasingData, intersectionReferenceSystem, casingLayerOrder));
    }
    if (intersectionReferenceSystem) {
        const pathLayerOrder = newLayerOrder++;
        layerItems.push(createWellborePathLayerItem(intersectionReferenceSystem, pathLayerOrder));
    }

    return layerItems;
}
