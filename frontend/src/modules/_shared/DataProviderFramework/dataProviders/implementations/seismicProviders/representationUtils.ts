import { SeismicRepresentation_api } from "@api";
import { Representation } from "@modules/_shared/DataProviderFramework/settings/implementations/RepresentationSetting";

export function representationToApiRepresentation(representation: Representation): SeismicRepresentation_api {
    switch (representation) {
        case Representation.OBSERVATION:
            return SeismicRepresentation_api.OBSERVED_CASE;
        case Representation.OBSERVATION_PER_REALIZATION:
            return SeismicRepresentation_api.OBSERVED_REALIZATION;
        case Representation.REALIZATION:
            return SeismicRepresentation_api.MODELLED;
        default:
            throw new Error(`Unknown representation for seismic: ${representation}`);
    }
}
