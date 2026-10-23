import type { WellboreHeader_api } from "@api";
import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IntersectionType } from "@framework/types/intersection";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

import type { IntersectionSettingOption } from "../../settings/implementations/IntersectionSetting";

/**
 * Create list of available ensembles for the given field identifier.
 */
export function getAvailableEnsemblesForField(
    fieldIdentifier: string | null,
    ensembles: readonly RegularEnsemble[],
): RegularEnsemble[] {
    if (!fieldIdentifier) {
        return [];
    }
    return ensembles.filter((ensemble) => ensemble.getFieldIdentifiers().includes(fieldIdentifier));
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
 * Regular ensembles of the field plus delta ensembles whose comparison and reference ensembles both belong to it.
 */
export function getAvailableEnsembleIdentsForFieldIncludingDelta(
    fieldIdentifier: string | null,
    ensembles: readonly RegularEnsemble[],
    deltaEnsembles: readonly DeltaEnsemble[],
): (RegularEnsembleIdent | DeltaEnsembleIdent)[] {
    const regularIdents = getAvailableEnsembleIdentsForField(fieldIdentifier, ensembles);
    const isInField = (ident: RegularEnsembleIdent) => regularIdents.some((regularIdent) => regularIdent.equals(ident));

    const deltaIdents = deltaEnsembles
        .map((deltaEnsemble) => deltaEnsemble.getIdent())
        .filter(
            (ident) => isInField(ident.getComparisonEnsembleIdent()) && isInField(ident.getReferenceEnsembleIdent()),
        );

    return [...regularIdents, ...deltaIdents];
}

/**
 * For providers without delta support. Their value constraints never contain delta idents, so this is a type narrowing, not a code path.
 */
export function requireRegularEnsembleIdent(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
): RegularEnsembleIdent | null {
    if (ensembleIdent instanceof DeltaEnsembleIdent) {
        throw new Error("Delta ensembles are not supported by this data provider");
    }
    return ensembleIdent;
}

/**
 * Create list of available realizations for the given ensemble identifier.
 */
export function getAvailableRealizationsForEnsembleIdent(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
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
 *
 * Planned (not yet drilled) wellbore headers are emitted as separate PLANNED_WELLBORE options.
 */
export function getAvailableIntersectionOptions(
    wellboreHeaders: WellboreHeader_api[],
    intersectionPolylines: IntersectionPolyline[],
    plannedWellboreHeaders: WellboreHeader_api[] = [],
): IntersectionSettingOption[] {
    const intersectionOptions: IntersectionSettingOption[] = [];
    for (const wellboreHeader of wellboreHeaders) {
        intersectionOptions.push({
            type: IntersectionType.WELLBORE,
            name: wellboreHeader.uniqueWellboreIdentifier,
            uuid: wellboreHeader.wellboreUuid,
        });
    }

    for (const plannedWellboreHeader of plannedWellboreHeaders) {
        intersectionOptions.push({
            type: IntersectionType.PLANNED_WELLBORE,
            name: plannedWellboreHeader.uniqueWellboreIdentifier,
            uuid: plannedWellboreHeader.wellboreUuid,
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
