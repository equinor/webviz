import { DerivedVectorType_api } from "@api";
import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

/**
 * Create vector description for derived vector
 *
 * Use source vector name to retrieve the official vector description, and add prefix and suffix
 */
export function createDerivedVectorDescription(sourceVector: string, derivedVectorType: DerivedVectorType_api): string {
    let prefix: string | undefined = undefined;
    let suffix: string | undefined = undefined;
    if (derivedVectorType === DerivedVectorType_api.PER_DAY) {
        prefix = "Average ";
        suffix = " Per day";
    }
    if (derivedVectorType === DerivedVectorType_api.PER_INTVL) {
        prefix = "Interval ";
    }

    return simulationVectorDescription(sourceVector, prefix, suffix);
}
