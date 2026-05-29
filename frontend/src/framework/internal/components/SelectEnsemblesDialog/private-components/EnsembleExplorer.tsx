import React from "react";

import { Check } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useValidState } from "@lib/hooks/useValidState";
import { ArrowLeft, ArrowRight } from "@lib/mui-icons";
import { Button } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { Select, type SelectOption } from "@lib/newComponents/Select";
import { Separator } from "@lib/newComponents/Separator";

import type { InternalRegularEnsembleSetting } from "../types";

import { CaseExplorer, type CaseSelection } from "./CaseExplorer/CaseExplorer";

export type EnsembleExplorerProps = {
    queriesDisabled: boolean;
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    multiSelect?: boolean;
    onSelectEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
    onRemoveEnsemble?: (ensembleIdent: InternalRegularEnsembleSetting) => void;
    onRequestClose?: () => void;
};

export function EnsembleExplorer(props: EnsembleExplorerProps): React.ReactNode {
    const [selectedCaseName, setSelectedCaseName] = React.useState<string | null>(null);
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string | null>(null);
    const [ensemblesInSelectedCase, setEnsemblesInSelectedCase] = React.useState<EnsembleInfo_api[]>([]);
    const [activeSelectedEnsemble, setActiveSelectedEnsemble] = React.useState<string | null>(null);

    // --- Derived data ---
    const [activeEnsembleName, setActiveEnsembleName] = useValidState<string | null>({
        initialState: null,
        validStates: ensemblesInSelectedCase?.map((ens) => ens.name) ?? [],
        keepStateWhenInvalid: false,
    });

    const ensembleOptions = React.useMemo<SelectOption<string>[]>(
        function createEnsembleOptions() {
            if (!selectedCaseUuid) {
                return [];
            }

            if (!ensemblesInSelectedCase) {
                return [];
            }

            const options: SelectOption<string>[] = [];

            for (const ens of ensemblesInSelectedCase) {
                try {
                    // RegularEnsembleIdent throws if invalid case uuid
                    const ident = new RegularEnsembleIdent(selectedCaseUuid, ens.name);
                    const selected = props.selectedEnsembles.some((el) => el.ensembleIdent.equals(ident));
                    options.push({
                        label: `${ens.name}  (${ens.realizationCount} reals)`,
                        value: ens.name,
                        adornment: selected ? <Check fontSize="inherit" /> : <span className="w-3" />, // to keep spacing consistent between options
                        disabled: selected,
                    });
                } catch (error) {
                    console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
                }
            }

            return options;
        },
        [ensemblesInSelectedCase, props.selectedEnsembles, selectedCaseUuid],
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

    function handleActiveSelectedEnsembleChanged(ensembleNames: string[]) {
        setActiveSelectedEnsemble(ensembleNames[0]);
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

    function handleRemoveSelectedEnsemble() {
        if (!activeSelectedEnsemble || !props.onRemoveEnsemble) {
            return;
        }

        const matchingEnsemble = props.selectedEnsembles.find(
            (ens) => ens.ensembleIdent.toString() === activeSelectedEnsemble,
        );
        if (!matchingEnsemble || !matchingEnsemble.caseName) {
            return;
        }

        props.onRemoveEnsemble({
            ensembleIdent: matchingEnsemble.ensembleIdent,
            caseName: matchingEnsemble.caseName,
            color: matchingEnsemble.color,
            customName: matchingEnsemble.customName ?? null,
        });
        setActiveSelectedEnsemble(null);
    }

    function handleCaseSelectedChange(caseSelection: CaseSelection | null) {
        if (!caseSelection) {
            setSelectedCaseName(null);
            setSelectedCaseUuid(null);
            setEnsemblesInSelectedCase([]);
            setActiveEnsembleName(null);
            return;
        }

        // Sort alphabetically by name
        const selectedCaseSortedEnsembles = [...caseSelection.filteredEnsembles].sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setEnsemblesInSelectedCase(selectedCaseSortedEnsembles);
        setActiveEnsembleName(selectedCaseSortedEnsembles ? (selectedCaseSortedEnsembles[0]?.name ?? null) : null);
    }

    return (
        <>
            <Dialog.Body layoutClassName="grow min-h-0">
                <div className="gap-vertical-sm relative flex h-full w-full flex-col">
                    <CaseExplorer
                        queriesDisabled={props.queriesDisabled}
                        selectedEnsembles={props.selectedEnsembles}
                        onCaseSelectionChange={handleCaseSelectedChange}
                    />
                    <Separator orientation="horizontal" />
                    <div className="gap-horizontal-sm flex w-full items-center">
                        <FieldCompositions.Default label="Ensemble" layoutClassName="w-full">
                            <StatusWrapper
                                className={`w-full ${!selectedCaseUuid ? "text-neutral-subtle" : ""}`}
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
                        </FieldCompositions.Default>
                        {props.multiSelect && (
                            <>
                                <div className="gap-vertical-2xs flex flex-col">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSelectRegularEnsemble}
                                        tone="accent"
                                        disabled={ensembleAlreadySelected || ensembleOptions.length === 0}
                                    >
                                        <span className="flex justify-end">
                                            Add
                                            <ArrowRight fontSize="inherit" />
                                        </span>
                                    </Button>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleRemoveSelectedEnsemble}
                                        tone="danger"
                                        disabled={!activeSelectedEnsemble}
                                    >
                                        <ArrowLeft fontSize="inherit" />
                                        Remove
                                    </Button>
                                </div>
                                <FieldCompositions.Default label="Selected Ensembles" layoutClassName="w-full">
                                    <Select
                                        options={props.selectedEnsembles.map((ens) => ({
                                            label: `${ens.ensembleIdent.getEnsembleName()} (${ens.caseName} [${ens.ensembleIdent.getCaseUuid()}])`,
                                            value: ens.ensembleIdent.toString(),
                                        }))}
                                        value={activeSelectedEnsemble ? [activeSelectedEnsemble] : []}
                                        onChange={handleActiveSelectedEnsembleChanged}
                                        size={5}
                                        layoutClassName="w-full"
                                        placeholder="No ensembles available..."
                                    />
                                </FieldCompositions.Default>
                            </>
                        )}
                    </div>
                </div>
            </Dialog.Body>
            <Dialog.Actions>
                {props.multiSelect ? (
                    <Button onClick={() => props.onRequestClose?.()} variant="contained">
                        Done
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => props.onRequestClose?.()} tone="neutral" variant="ghost">
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSelectRegularEnsemble}
                            tone="accent"
                            disabled={ensembleAlreadySelected || ensembleOptions.length === 0}
                        >
                            Select Ensemble
                        </Button>
                    </>
                )}
            </Dialog.Actions>
        </>
    );
}
