import React from "react";

import { Add, Check } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { Select, type SelectOption } from "@lib/components/Select";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useValidState } from "@lib/hooks/useValidState";

import type { InternalRegularEnsembleSetting } from "../types";

import { CaseExplorer, type CaseSelection } from "./CaseExplorer/CaseExplorer";

export type EnsembleExplorerProps = {
    disableQueries: boolean;
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    selectButtonLabel?: string;
    onSelectEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
    onRequestClose?: () => void;
};

export function EnsembleExplorer(props: EnsembleExplorerProps): React.ReactNode {
    const [selectedCaseName, setSelectedCaseName] = React.useState<string | null>(null);
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string | null>(null);
    const [selectedCaseEnsembles, setSelectedCaseEnsembles] = React.useState<EnsembleInfo_api[]>([]);

    // --- Derived data ---
    const [activeEnsembleName, setActiveEnsembleName] = useValidState<string | null>({
        initialState: null,
        validStates: selectedCaseEnsembles?.map((ens) => ens.name) ?? [],
        keepStateWhenInvalid: false,
    });

    const ensembleOptions = React.useMemo<SelectOption<string>[]>(
        function createEnsembleOptions() {
            return (
                selectedCaseEnsembles?.map((e) => ({
                    label: `${e.name}  (${e.realizationCount} reals)`,
                    value: e.name,
                })) ?? []
            );
        },
        [selectedCaseEnsembles],
    );

    const ensembleAlreadySelected = React.useMemo(
        function checkEnsembleAlreadySelected() {
            if (!selectedCaseUuid || !activeEnsembleName) {
                return false;
            }

            try {
                // RegularEnsembleIdent throws if invalid case uuid
                const ident = new RegularEnsembleIdent(selectedCaseUuid, activeEnsembleName);
                return props.selectedEnsembles.some((el) => el.ensembleIdent.equals(ident));
            } catch (error) {
                console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
                return false;
            }
        },
        [selectedCaseUuid, activeEnsembleName, props.selectedEnsembles],
    );

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setActiveEnsembleName(ensembleNames[0]);
    }

    function handleSelectRegularEnsemble() {
        if (!selectedCaseUuid || !selectedCaseName || !activeEnsembleName || ensembleAlreadySelected) {
            return;
        }

        let ensembleIdent: RegularEnsembleIdent;
        try {
            ensembleIdent = new RegularEnsembleIdent(selectedCaseUuid, activeEnsembleName);
        } catch (error) {
            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
            return;
        }

        props.onSelectEnsemble({
            ensembleIdent: ensembleIdent,
            caseName: selectedCaseName,
            color: props.nextEnsembleColor,
            customName: null,
        });
    }

    function handleCaseSelectedChange(caseSelection: CaseSelection | null) {
        if (!caseSelection) {
            setSelectedCaseName(null);
            setSelectedCaseUuid(null);
            setSelectedCaseEnsembles([]);
            setActiveEnsembleName(null);
            return;
        }

        // Sort alphabetically by name
        const selectedCaseSortedEnsembles = [...caseSelection.filteredEnsembles].sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setSelectedCaseEnsembles(selectedCaseSortedEnsembles);
        setActiveEnsembleName(selectedCaseSortedEnsembles ? (selectedCaseSortedEnsembles[0]?.name ?? null) : null);
    }

    return (
        <div className="flex flex-col h-full gap-4 p-4 bg-slate-100">
            <CaseExplorer disableQueries={props.disableQueries} onCaseSelectionChange={handleCaseSelectedChange} />
            <Label text="Ensemble">
                <StatusWrapper
                    className={!selectedCaseUuid ? "text-gray-400" : undefined}
                    infoMessage={!selectedCaseUuid ? "No case selected" : undefined}
                >
                    <Select
                        options={ensembleOptions}
                        value={activeEnsembleName ? [activeEnsembleName] : []}
                        onChange={handleRegularEnsembleChanged}
                        disabled={!selectedCaseUuid}
                        size={5}
                        width="100%"
                        placeholder="No ensembles available..."
                    />
                </StatusWrapper>
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
