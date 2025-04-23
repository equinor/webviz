import { atomWithQuery } from "jotai-tanstack-query";

import { getRealizationDataOptions, getTableDefinitionOptions } from "@api";


import {
    selectedEnsembleIdentAtom,
    selectedRftResponseNameAtom,
    selectedRftTimestampsUtcMsAtom,
    selectedRftWellNameAtom,
} from "./derivedAtoms";

export const rftTableDefinitionAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    const query = {
        ...getTableDefinitionOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
            },
        }),
        enabled: Boolean(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };
    return query;
});

export const rftRealizationDataQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedWellName = get(selectedRftWellNameAtom);
    const selectedResponseName = get(selectedRftResponseNameAtom);
    const selectedRftTimestampsUtcMs = get(selectedRftTimestampsUtcMsAtom);

    const query = {
        ...getRealizationDataOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                well_name: selectedWellName ?? "",
                response_name: selectedResponseName ?? "",
                timestamps_utc_ms: selectedRftTimestampsUtcMs ? [selectedRftTimestampsUtcMs] : null,
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedWellName &&
                selectedResponseName,
        ),
    };
    return query;
});
