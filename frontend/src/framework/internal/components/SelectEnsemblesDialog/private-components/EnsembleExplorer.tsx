import React from "react";

import { Add, Check } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Select, type SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";

import type { InternalRegularEnsembleSetting } from "../types";

import { CaseExplorer, type CaseSelection } from "./CaseExplorer/CaseExplorer";

export type EnsembleExplorerProps = {
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    selectButtonLabel?: string;
    onSelectEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
    onRequestClose?: () => void;
};

export function EnsembleExplorer(props: EnsembleExplorerProps): React.ReactNode {
    const [selectedCaseName, setSelectedCaseName] = React.useState<string>("");
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string>("");
    const [selectedCaseEnsembles, setSelectedCaseEnsembles] = React.useState<EnsembleInfo_api[] | null>(null);

    // --- Derived data ---
    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: selectedCaseEnsembles?.map((ens) => ens.name) ?? [],
        keepStateWhenInvalid: true,
    });

    const selectedEnsemble = React.useMemo(() => {
        return selectedCaseEnsembles?.find((ens) => ens.name === selectedEnsembleName) ?? null;
    }, [selectedCaseEnsembles, selectedEnsembleName]);

    const ensembleOptions: SelectOption<string>[] =
        selectedCaseEnsembles
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((e) => ({
                label: `${e.name}  (${e.realizationCount} reals)`,
                value: e.name,
            })) ?? [];

    let selectedEnsembleIdent: RegularEnsembleIdent | null = null;
    try {
        selectedEnsembleIdent = new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName);
    } catch {
        selectedEnsembleIdent = null;
    }
    const ensembleAlreadySelected =
        selectedCaseUuid &&
        selectedEnsembleName &&
        props.selectedEnsembles.some((el) => el.ensembleIdent.equals(selectedEnsembleIdent));

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function handleSelectRegularEnsemble() {
        if (ensembleAlreadySelected) return;
        if (!selectedEnsemble) return;

        props.onSelectEnsemble({
            ensembleIdent: new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName),
            caseName: selectedCaseName,
            color: props.nextEnsembleColor,
            customName: null,
        });
    }

    function handleCaseSelectedChange(caseSelection: CaseSelection) {
        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setSelectedCaseEnsembles(caseSelection.filteredEnsembles ? [...caseSelection.filteredEnsembles] : []);
    }

    return (
        <div className="flex flex-col h-full gap-4 p-4 bg-slate-100">
            <CaseExplorer onCaseSelectionChange={handleCaseSelectedChange} />
            <Label text="Ensemble">
                <Select
                    options={ensembleOptions}
                    value={[selectedEnsembleName]}
                    onChange={handleRegularEnsembleChanged}
                    disabled={selectedCaseEnsembles === null}
                    size={5}
                    width="100%"
                />
            </Label>
            <div className="flex gap-4 justify-end">
                <Button onClick={() => props.onRequestClose?.()}>Close</Button>
                <Button
                    variant="contained"
                    onClick={handleSelectRegularEnsemble}
                    color={ensembleAlreadySelected ? "success" : "primary"}
                    disabled={ensembleAlreadySelected || ensembleOptions.length === 0}
                    startIcon={ensembleAlreadySelected ? <Check fontSize="small" /> : <Add fontSize="small" />}
                >
                    {ensembleAlreadySelected
                        ? "Ensemble already selected"
                        : (props.selectButtonLabel ?? "Select Ensemble")}
                </Button>
            </div>
        </div>
    );
}
