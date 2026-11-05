import type { ReactNode } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { Setting } from "@lib/components/Setting";

import { getFieldIssueText } from "../../../utils/setupReadiness";
import { costDraftStatusAtom, costProfileAtom, currencyAtom } from "../../atoms/baseAtoms";
import { validSelectedEnsembleIdentAtom } from "../../atoms/persistableFixableAtoms";
import { evaluationHorizonStateAtom, isSourceLoadingAtom } from "../../atoms/sourceSnapshotAtoms";
import { ANNUAL_COSTS_DELTA_HELP, ANNUAL_COSTS_HELP } from "../../helpTexts";
import { setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";
import { CostProfileEditor } from "../costProfileEditor";

export function CostsSection(props: SettingsSectionProps): ReactNode {
    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const [costProfile, setCostProfile] = useAtom(costProfileAtom);
    const setCostDraftStatus = useSetAtom(costDraftStatusAtom);
    const currency = useAtomValue(currencyAtom);
    const evaluationHorizon = useAtomValue(evaluationHorizonStateAtom);
    const isSourceLoading = useAtomValue(isSourceLoadingAtom);

    const isDeltaEnsembleSelected =
        selectedEnsembleIdent !== null && isEnsembleIdentOfType(selectedEnsembleIdent, DeltaEnsembleIdent);

    return (
        <Setting.Section {...props.sectionProps}>
            <Setting.Field
                label="Annual costs"
                contentClassName={`${setupFieldClassName("costs")} min-w-0`}
                warningAnnotation={getFieldIssueText(props.readiness, "costs")}
                help={{
                    title: "Annual costs",
                    content: isDeltaEnsembleSelected ? ANNUAL_COSTS_DELTA_HELP : ANNUAL_COSTS_HELP,
                }}
                stacked
            >
                <CostProfileEditor
                    ensembleKey={selectedEnsembleIdent?.toString()}
                    value={costProfile}
                    currency={currency}
                    isDelta={isDeltaEnsembleSelected}
                    horizon={evaluationHorizon}
                    isSourceLoading={isSourceLoading}
                    onValueChange={setCostProfile}
                    onDraftStatusChange={setCostDraftStatus}
                />
            </Setting.Field>
        </Setting.Section>
    );
}
