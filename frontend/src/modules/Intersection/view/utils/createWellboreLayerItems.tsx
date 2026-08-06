import type { Casing, IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { WellboreCasing_api } from "@api";
import type { EsvLayer } from "@modules/_shared/components/EsvIntersection";
import { SchematicLayer, WellborePathLayer } from "@modules/_shared/components/EsvIntersection";

/**
 * Create layer item for wellbore casing data
 */
function createCasingLayerItem(
    wellboreCasingData: WellboreCasing_api[],
    referenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
): EsvLayer {
    const casings: Casing[] = wellboreCasingData.map((casing, index) => ({
        id: `casing-${index}`,
        diameter: casing.diameterNumeric,
        start: casing.depthTopMd,
        end: casing.depthBottomMd,
        innerDiameter: casing.diameterInner,
        kind: "casing",
        hasShoe: false,
    }));

    return new SchematicLayer(
        "schematic",
        {
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
        { name: "Schematic", hoverable: true },
    );
}

/**
 * Create layer item for wellbore path
 */
function createWellborePathLayerItem(
    intersectionReferenceSystem: IntersectionReferenceSystem,
    layerOrder: number,
): EsvLayer {
    return new WellborePathLayer(
        "wellbore-path",
        {
            stroke: "red",
            strokeWidth: "2",
            order: layerOrder,
            data: intersectionReferenceSystem.projectedPath as [number, number][],
        },
        { name: "Wellbore path", hoverable: true },
    );
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
): EsvLayer[] {
    const layerItems: EsvLayer[] = [];

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
