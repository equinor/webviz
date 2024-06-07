import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { SettingsStatusWriter } from "@framework/StatusWriter";

import { useAtomValue } from "jotai";

import { selectedEnsembleIdentsAtom } from "../atom/derivedAtoms";
import { inplaceTableDefinitionsQueriesAtom } from "../atom/queryAtoms";

export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const inplaceTableDefinitionsQueries = useAtomValue(inplaceTableDefinitionsQueriesAtom);

    if (selectedEnsembleIdents.length !== inplaceTableDefinitionsQueries.length) {
        statusWriter.addError(
            "Number of selected ensembles does not match number of inplace volumetrics table definitions"
        );
        return;
    }

    const allFailed = inplaceTableDefinitionsQueries.every((query) => query.isError);
    if (allFailed) {
        statusWriter.addError("No inplace volumetrics table definitions found");
        return;
    }

    inplaceTableDefinitionsQueries.forEach((query, index) => {
        if (query.isError) {
            const ensembleIdent = selectedEnsembleIdents[index];
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            const ensembleName = ensemble ? ensemble.getDisplayName() : ensembleIdent.toString();
            statusWriter.addWarning(`No inplace volumetrics table definition for ensemble: ${ensembleName}`);
        }
    });
}
