import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { SettingsStatusWriter } from "@framework/StatusWriter";
import { joinStringArrayToHumanReadableString } from "@modules/SimulationTimeSeries/utils/stringUtils";

import { useAtomValue } from "jotai";

import { selectedVectorNamesAtom } from "../atoms/baseAtoms";
import { ensembleVectorListsHelperAtom, selectedEnsembleIdentsAtom } from "../atoms/derivedAtoms";
import { vectorListQueriesAtom } from "../atoms/queryAtoms";

export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter, selectedVectorTags: string[]) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);

    const vectorListQueries = useAtomValue(vectorListQueriesAtom);
    const ensembleVectorListsHelper = useAtomValue(ensembleVectorListsHelperAtom);
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const selectedVectorNames = useAtomValue(selectedVectorNamesAtom);

    // Set error if all vector list queries fail
    const hasEveryVectorListQueryError =
        vectorListQueries.length > 0 && vectorListQueries.every((query) => query.isError);
    if (hasEveryVectorListQueryError) {
        let errorMessage = "Could not load vectors for selected ensemble";
        if (vectorListQueries.length > 1) {
            errorMessage += "s";
        }
        statusWriter.addError(errorMessage);
    }

    // Set warning for vector names not existing in a selected ensemble
    function validateVectorNamesInEnsemble(vectorNames: string[], ensembleIdent: EnsembleIdent) {
        const existingVectors = vectorNames.filter((vector) =>
            ensembleVectorListsHelper.isVectorInEnsemble(ensembleIdent, vector)
        );
        if (existingVectors.length === vectorNames.length) {
            return;
        }

        const nonExistingVectors = vectorNames.filter((vector) => !existingVectors.includes(vector));
        const ensembleStr = ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
        const vectorArrayStr = joinStringArrayToHumanReadableString(nonExistingVectors);
        statusWriter.addWarning(`Vector ${vectorArrayStr} does not exist in ensemble ${ensembleStr}`);
    }

    // Note: selectedVectorNames is not updated until vectorSelectorData is updated and VectorSelector triggers onChange
    if (selectedEnsembleIdents.length === 1) {
        // If single ensemble is selected and no vectors exist, selectedVectorNames is empty as no vectors are valid
        // in the VectorSelector. Then utilizing selectedVectorTags for status message
        const vectorNames = selectedVectorNames.length > 0 ? selectedVectorNames : selectedVectorTags;
        validateVectorNamesInEnsemble(vectorNames, selectedEnsembleIdents[0]);
    }
    for (const ensembleIdent of selectedEnsembleIdents) {
        validateVectorNamesInEnsemble(selectedVectorNames, ensembleIdent);
    }
}
