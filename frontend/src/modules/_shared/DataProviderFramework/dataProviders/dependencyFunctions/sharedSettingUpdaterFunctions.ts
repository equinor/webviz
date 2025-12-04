import type { WellboreHeader_api } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

import type { IntersectionSettingValue } from "../../settings/implementations/IntersectionSetting";

/**
 * Create list of available ensembles for the given field identifier.
 */
export function getAvailableEnsemblesForField(
    fieldIdentifier: string | null,
    ensembles: readonly RegularEnsemble[],
): RegularEnsemble[] {
    return ensembles.filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier);
}

/**
 * Create list of available ensemble idents for the given field identifier.
 */
export function getAvailableEnsembleIdentsForField(
    fieldIdentifier: string | null,
    ensembles: readonly RegularEnsemble[],
): RegularEnsembleIdent[] {
    return getAvailableEnsemblesForField(fieldIdentifier, ensembles).map((ensemble) => ensemble.getIdent());
}

/**
 * Create list of available realizations for the given ensemble identifier.
 */
export function getAvailableRealizationsForEnsembleIdent(
    ensembleIdent: RegularEnsembleIdent | null,
    realizationFilterFunc: EnsembleRealizationFilterFunction,
): number[] {
    if (!ensembleIdent) {
        return [] as number[];
    }

    const realizations = realizationFilterFunc(ensembleIdent);

    return [...realizations];
}

/**
 * Get available intersection options for the given wellbore headers and custom intersection polylines.
 */
export function getAvailableIntersectionOptions(
    wellboreHeaders: WellboreHeader_api[],
    intersectionPolylines: IntersectionPolyline[],
): IntersectionSettingValue[] {
    const intersectionOptions: IntersectionSettingValue[] = [];
    for (const wellboreHeader of wellboreHeaders) {
        intersectionOptions.push({
            type: IntersectionType.WELLBORE,
            name: wellboreHeader.uniqueWellboreIdentifier,
            uuid: wellboreHeader.wellboreUuid,
        });
    }

    for (const polyline of intersectionPolylines) {
        intersectionOptions.push({
            type: IntersectionType.CUSTOM_POLYLINE,
            name: polyline.name,
            uuid: polyline.id,
        });
    }

    return intersectionOptions;
}
