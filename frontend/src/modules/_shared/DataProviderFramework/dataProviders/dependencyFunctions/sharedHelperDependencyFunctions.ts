import type { QueryClient } from "@tanstack/query-core";

import type { WellboreHeader_api } from "@api";
import { getDrilledWellboreHeadersOptions, getPlannedWellboreHeadersOptions } from "@api";
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
 * Fetch wellbore headers for the provided field identifier.
 */
export async function fetchWellboreHeaders(
    fieldIdentifier: string | null,
    abortSignal: AbortSignal,
    queryClient: QueryClient,
): Promise<WellboreHeader_api[] | null> {
    if (!fieldIdentifier) {
        return null;
    }

    return await queryClient.fetchQuery({
        ...getDrilledWellboreHeadersOptions({
            query: { field_identifier: fieldIdentifier },
            signal: abortSignal,
        }),
    });
}

/**
 * Fetch planned (not yet drilled) wellbore headers for the provided field identifier.
 */
export async function fetchPlannedWellboreHeaders(
    fieldIdentifier: string | null,
    abortSignal: AbortSignal,
    queryClient: QueryClient,
): Promise<WellboreHeader_api[] | null> {
    if (!fieldIdentifier) {
        return null;
    }

    return await queryClient.fetchQuery({
        ...getPlannedWellboreHeadersOptions({
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
    workbenchSession: WorkbenchSession,
    queryClient: QueryClient,
    abortSignal: AbortSignal,
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
        return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification, queryClient, abortSignal);
    }

    // Wellbore intersection (drilled or planned)
    if (!fieldIdentifier) {
        throw new Error("Field identifier is not set");
    }

    // Exhaustiveness guard: if a new IntersectionType is added, this will fail to compile.
    if (intersection.type !== IntersectionType.WELLBORE && intersection.type !== IntersectionType.PLANNED_WELLBORE) {
        const exhaustiveCheck: never = intersection.type;
        throw new Error(`Unsupported intersection type: ${exhaustiveCheck}`);
    }

    const intersectionSpecification: WellboreIntersectionSpecification = {
        type: IntersectionType.WELLBORE,
        wellboreUuid: intersection.uuid,
        extensionLength: intersection.extensionLength ?? 0,
        fieldIdentifier: fieldIdentifier,
        isPlanned: intersection.type === IntersectionType.PLANNED_WELLBORE,
    };
    return makeIntersectionPolylineWithSectionLengthsPromise(intersectionSpecification, queryClient, abortSignal);
}
