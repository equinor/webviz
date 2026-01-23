import { SeismicRepresentation_api } from "@api";
import { Representation } from "@modules/_shared/DataProviderFramework/settings/implementations/RepresentationSetting";

export function representationToApiRepresentation(representation: Representation | null): SeismicRepresentation_api {
    if (representation === Representation.OBSERVATION) {
        return SeismicRepresentation_api.OBSERVED_CASE;
    }
    if (representation === Representation.OBSERVATION_PER_REALIZATION) {
        return SeismicRepresentation_api.OBSERVED_REALIZATION;
    }
    return SeismicRepresentation_api.MODELLED;
}
