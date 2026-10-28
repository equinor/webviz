import React from "react";

import { useAtomValue } from "jotai";

import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingsStatusWriter } from "@framework/StatusWriter";
import type { SettingAnnotation } from "@lib/components/Setting";
import { useFlagActionRequiredToStatusWriter } from "@modules/_shared/hooks/useAddStatusWriterMessages";
import { propagateQueryErrorsToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";
import { joinStringArrayToHumanReadableString } from "@modules/SimulationTimeSeries/utils/stringUtils";

import { selectedVectorNamesAtom } from "../atoms/baseAtoms";
import { ensembleVectorListsHelperAtom } from "../atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom } from "../atoms/persistableFixableAtoms";
import { vectorListQueriesAtom } from "../atoms/queryAtoms";

/**
 * Single place for all `statusWriter` writes for the SimulationTimeSeries settings:
 * - Propagates vector list query errors.
 * - Exposes `handlePanelAnnotationsChange` for `Setting.Panel`'s `onAnnotationsChange`, so every
 *   field's error annotations are reported as ActionRequired without each field wiring it manually.
 * - Warns when a selected vector does not exist in one of the selected ensembles.
 */
export function useMakeSettingsStatusWriterMessages(
    statusWriter: SettingsStatusWriter,
    selectedVectorTags: string[],
): {
    handlePanelAnnotationsChange: (annotations: SettingAnnotation[]) => void;
} {
    const vectorListQueries = useAtomValue(vectorListQueriesAtom);
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const ensembleVectorListsHelper = useAtomValue(ensembleVectorListsHelperAtom);
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value ?? [];
    const selectedVectorNames = useAtomValue(selectedVectorNamesAtom);
    const flagActionRequiredToStatusWriter = useFlagActionRequiredToStatusWriter(statusWriter);

    propagateQueryErrorsToStatusWriter(vectorListQueries, statusWriter);

    const handlePanelAnnotationsChange = React.useCallback(
        function handlePanelAnnotationsChange(annotations: SettingAnnotation[]) {
            const invalidFieldValueMessages = annotations.filter((a) => a.type === "error").map((a) => a.message);
            flagActionRequiredToStatusWriter(invalidFieldValueMessages);
        },
        [flagActionRequiredToStatusWriter],
    );

    function warnIfVectorsMissingInEnsemble(
        vectorNames: string[],
        ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    ) {
        const missingVectors = vectorNames.filter(
            (vector) => !ensembleVectorListsHelper.isVectorInEnsemble(ensembleIdent, vector),
        );
        if (missingVectors.length === 0) {
            return;
        }

        const ensembleDisplayName =
            ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
        const missingVectorsStr = joinStringArrayToHumanReadableString(missingVectors);
        statusWriter.addWarning(`Vector ${missingVectorsStr} does not exist in ensemble ${ensembleDisplayName}`);
    }

    if (selectedEnsembleIdents.length === 1) {
        // selectedVectorNames is not updated until the VectorSelector re-validates and triggers onChange, so when a
        // single ensemble is selected and no vectors are valid there, selectedVectorNames is empty. Fall back to the
        // raw selectedVectorTags in that case so the warning still names the invalid vector(s).
        const vectorNamesToValidate = selectedVectorNames.length > 0 ? selectedVectorNames : selectedVectorTags;
        warnIfVectorsMissingInEnsemble(vectorNamesToValidate, selectedEnsembleIdents[0]);
    }
    for (const ensembleIdent of selectedEnsembleIdents) {
        warnIfVectorsMissingInEnsemble(selectedVectorNames, ensembleIdent);
    }

    return { handlePanelAnnotationsChange };
}
