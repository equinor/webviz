import { DerivedVectorCategory_api, DerivedVector_api } from "@api";
import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

/**
 * Create vector description for derived vector
 *
 * Use source vector name to retrieve the official vector description, and add prefix and suffix
 */
export function createDerivedVectorDescription(
    vectorName: string,
    derivedVector: DerivedVector_api,
    excludeTypeDescription = false
): string {
    let simulationVectorName = vectorName;
    let prefix: string | undefined = undefined;
    let suffix: string | undefined = undefined;
    if (derivedVector.category === DerivedVectorCategory_api.PER_DAY) {
        simulationVectorName = derivedVector.sourceVector;
        prefix = "Average ";
        suffix = " Per day";
    }
    if (derivedVector.category === DerivedVectorCategory_api.PER_INTVL) {
        simulationVectorName = derivedVector.sourceVector;
        prefix = "Interval ";
    }

    return simulationVectorDescription(simulationVectorName, prefix, suffix, excludeTypeDescription);
}
