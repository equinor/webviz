import type { QueryClient } from "@tanstack/query-core";

import type { WellboreHeader_api } from "@api";
import { getDrilledWellboreHeadersOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IntersectionType } from "@framework/types/intersection";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { PolylineWithSectionLengths } from "@modules/_shared/Intersection/intersectionPolylineTypes";
import { makeIntersectionPolylineWithSectionLengthsPromise } from "@modules/_shared/Intersection/intersectionPolylineUtils";
import type {
    PolylineIntersectionSpecification,
    WellboreIntersectionSpecification,
} from "@modules/_shared/Intersection/intersectionPolylineUtils";

import type { IntersectionSettingValue } from "../../settings/implementations/IntersectionSetting";

/**
 * Fetch wellbore headers for field identifier for the provided ensemble identifier.
 */
export async function fetchWellboreHeaders(
    ensembleIdent: RegularEnsembleIdent | null,
    abortSignal: AbortSignal,
    workbenchSession: WorkbenchSession,
    queryClient: QueryClient,
): Promise<WellboreHeader_api[] | null> {
    if (!ensembleIdent) {
        return null;
    }

    const ensembleSet = workbenchSession.getEnsembleSet();
    const ensemble = ensembleSet.findEnsemble(ensembleIdent);

    if (!ensemble) {
        return null;
    }

    const fieldIdentifier = ensemble.getFieldIdentifier();

    return await queryClient.fetchQuery({
        ...getDrilledWellboreHeadersOptions({
            query: { field_identifier: fieldIdentifier },
            signal: abortSignal,
        }),
    });
}

/**
 * Create intersection polyline and actual section lengths for the given field identifier and selected intersection.
 */
export async function createIntersectionPolylineWithSectionLengthsForField(
    fieldIdentifier: string | null,
    intersection: IntersectionSettingValue | null,
    wellboreExtensionLength: number,
    workbenchSession: WorkbenchSession,
    queryClient: QueryClient,
): Promise<PolylineWithSectionLengths | null> {
    if (!intersection) {
        return null;
    }

    if (intersection.type === IntersectionType.CUSTOM_POLYLINE) {
        const polyline = workbenchSession
            .getUserCreatedItems()
            .getIntersectionPolylines()
            .getPolyline(intersection.uuid);
        if (!polyline) {
            throw new Error(`Could not find polyline with id ${intersection.uuid}`);
        }
        const intersectionSpecification: PolylineIntersectionSpecification = {
            type: IntersectionType.CUSTOM_POLYLINE,
            polyline: polyline,
        };
        return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
    }
    if (intersection.type === IntersectionType.WELLBORE) {
        if (!fieldIdentifier) {
            throw new Error("Field identifier is not set");
        }

        const intersectionSpecification: WellboreIntersectionSpecification = {
            type: IntersectionType.WELLBORE,
            wellboreUuid: intersection.uuid,
            extensionLength: wellboreExtensionLength,
            fieldIdentifier: fieldIdentifier,
            queryClient,
        };
        return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification);
    }

    throw new Error(`Unhandled intersection type ${intersection.type}`);
}
