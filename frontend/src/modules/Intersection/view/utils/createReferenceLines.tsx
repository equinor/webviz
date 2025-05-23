import type { ReferenceLine } from "@equinor/esv-intersection";

import type { LayerItem } from "@modules/_shared/components/EsvIntersection";
import { LayerType } from "@modules/_shared/components/EsvIntersection";

/**
 * Create reference lines for esv-intersection
 *
 * Optional wellboreHeaderSpecification to create a reference line for the wellbore header
 */
function createReferenceLines(wellboreHeaderSpecification?: {
    depthReferenceElevation: number;
    depthReferencePoint: string;
}): ReferenceLine[] {
    const referenceLines: ReferenceLine[] = [
        {
            depth: 0,
            text: "MSL",
            color: "blue",
            lineType: "wavy",
            textColor: "blue",
        },
    ];

    if (wellboreHeaderSpecification) {
        referenceLines.push({
            depth: -wellboreHeaderSpecification.depthReferenceElevation,
            text: wellboreHeaderSpecification.depthReferencePoint,
            color: "black",
            lineType: "dashed",
            textColor: "black",
        });
    }

    return referenceLines;
}

/**
 * Create reference lines layer item for esv-intersection
 *
 * Optional wellboreHeaderSpecification to create a reference line for the wellbore header
 */
export function createReferenceLinesLayerItem(wellboreHeaderSpecification?: {
    depthReferenceElevation: number;
    depthReferencePoint: string;
}): LayerItem {
    return {
        id: "reference-line",
        name: "Reference line",
        type: LayerType.REFERENCE_LINE,
        hoverable: false,
        options: {
            data: createReferenceLines(wellboreHeaderSpecification),
        },
    };
}
