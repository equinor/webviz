import React from "react";

import { Check } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { ArrowRight, Remove } from "@lib/mui-icons";
import { Button } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";
import { Field } from "@lib/newComponents/Field";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { Select, type SelectOption } from "@lib/newComponents/Select";
import { Separator } from "@lib/newComponents/Separator";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

import type { InternalRegularEnsembleSetting } from "../types";

import { CaseExplorer, type CaseSelection } from "./CaseExplorer/CaseExplorer";

export type EnsembleExplorerProps = {
    queriesDisabled: boolean;
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    multiSelect?: boolean;
    onSelectEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
    onRemoveEnsembles?: (...ensembleIdents: RegularEnsembleIdent[]) => void;
    onRequestClose?: () => void;
};

export function EnsembleExplorer(props: EnsembleExplorerProps): React.ReactNode {
    const [selectedCaseName, setSelectedCaseName] = React.useState<string | null>(null);
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string | null>(null);
    const [ensemblesInSelectedCase, setEnsemblesInSelectedCase] = React.useState<EnsembleInfo_api[]>([]);
    const [activeSelectedEnsembles, setActiveSelectedEnsembles] = React.useState<RegularEnsembleIdent[]>([]);

    // --- Derived data ---
    const [activeEnsembleNames, setActiveEnsembleNames] = useValidArrayState<string>({
        initialState: [],
        validStateArray: ensemblesInSelectedCase?.map((ens) => ens.name) ?? [],
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
            if (!selectedCaseUuid || activeEnsembleNames.length === 0) {
                return false;
            }

            return activeEnsembleNames.some((activeEnsembleName) => {
                try {
                    // RegularEnsembleIdent throws if invalid case uuid
                    const ident = new RegularEnsembleIdent(selectedCaseUuid, activeEnsembleName);
                    return props.selectedEnsembles.some((el) => el.ensembleIdent.equals(ident));
                } catch (error) {
                    console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
                    return false;
                }
            });
        },
        [selectedCaseUuid, activeEnsembleNames, props.selectedEnsembles],
    );

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setActiveEnsembleNames(ensembleNames);
    }

    function handleActiveSelectedEnsembleChanged(ensembleIdents: RegularEnsembleIdent[]) {
        setActiveSelectedEnsembles(ensembleIdents);
    }

    function handleSelectRegularEnsembles() {
        if (!selectedCaseUuid || !selectedCaseName || activeEnsembleNames.length === 0 || ensembleAlreadySelected) {
            return;
        }

        for (const activeEnsembleName of activeEnsembleNames) {
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

        setActiveEnsembleNames([]);
    }

    function handleRemoveSelectedEnsembles() {
        if (!activeSelectedEnsembles || !props.onRemoveEnsembles) {
            return;
        }

        // Remove all selected ensembles
        const matchingEnsemble = props.selectedEnsembles.find((ens) =>
            activeSelectedEnsembles.some((activeEnsemble) => activeEnsemble.equals(ens.ensembleIdent)),
        );
        if (!matchingEnsemble || !matchingEnsemble.caseName) {
            return;
        }

        props.onRemoveEnsembles(...activeSelectedEnsembles);

        // Select the first ensemble in the list after removal, or set to null if no ensembles remain
        const remainingEnsembles = props.selectedEnsembles.filter(
            (ens) => !activeSelectedEnsembles.some((activeEnsemble) => activeEnsemble.equals(ens.ensembleIdent)),
        );
        if (remainingEnsembles.length > 0) {
            setActiveSelectedEnsembles([remainingEnsembles[0].ensembleIdent]);
        } else {
            setActiveSelectedEnsembles([]);
        }
    }

    function handleCaseSelectedChange(caseSelection: CaseSelection | null) {
        if (!caseSelection) {
            setSelectedCaseName(null);
            setSelectedCaseUuid(null);
            setEnsemblesInSelectedCase([]);
            setActiveEnsembleNames([]);
            return;
        }

        // Sort alphabetically by name
        const selectedCaseSortedEnsembles = [...caseSelection.filteredEnsembles].sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setEnsemblesInSelectedCase(selectedCaseSortedEnsembles);
        if (selectedCaseSortedEnsembles.length > 0) {
            setActiveEnsembleNames([selectedCaseSortedEnsembles[0].name]);
        } else {
            setActiveEnsembleNames([]);
        }
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
                    <div className="gap-horizontal-sm flex w-full items-center justify-evenly">
                        <FieldCompositions.Default
                            label="Ensembles in case"
                            indicator={`(${ensemblesInSelectedCase.length})`}
                            layoutClassName="w-full"
                        >
                            <StatusWrapper
                                className={`w-full ${!selectedCaseUuid ? "text-neutral-subtle" : ""}`}
                                infoMessage={!selectedCaseUuid ? "No case selected" : undefined}
                            >
                                <Select
                                    filter
                                    filterPlaceholder="Filter ensembles..."
                                    options={ensembleOptions}
                                    value={activeEnsembleNames}
                                    onChange={handleRegularEnsembleChanged}
                                    disabled={!selectedCaseUuid}
                                    size={5}
                                    width="100%"
                                    placeholder="No ensembles available..."
                                    multiple
                                />
                            </StatusWrapper>
                        </FieldCompositions.Default>
                        {props.multiSelect && (
                            <>
                                <div className="gap-vertical-2xs flex flex-col">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSelectRegularEnsembles}
                                        tone="accent"
                                        disabled={ensembleAlreadySelected || ensembleOptions.length === 0}
                                    >
                                        <span className="flex justify-end">
                                            Add
                                            <ArrowRight fontSize="inherit" />
                                        </span>
                                    </Button>
                                </div>
                                <Field.Root layoutClassName="flex flex-col gap-vertical-2xs min-w-1/2">
                                    <div className="gap-horizontal-xs flex w-full items-center justify-between">
                                        <Field.Label indicator={`(${props.selectedEnsembles.length})`}>
                                            My selected Ensembles
                                        </Field.Label>
                                        <TooltipCompositions.Default content="Remove selected ensembles">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleRemoveSelectedEnsembles}
                                                tone="danger"
                                                iconOnly
                                                disabled={activeSelectedEnsembles.length === 0}
                                            >
                                                <Remove size={16} />
                                            </Button>
                                        </TooltipCompositions.Default>
                                    </div>
                                    <Select
                                        filter
                                        filterPlaceholder="Filter selected ensembles..."
                                        options={props.selectedEnsembles.map((ens) => ({
                                            label: `${ens.ensembleIdent.getEnsembleName()} (${ens.caseName} [${ens.ensembleIdent.getCaseUuid()}])`,
                                            value: ens.ensembleIdent,
                                        }))}
                                        value={activeSelectedEnsembles}
                                        onChange={handleActiveSelectedEnsembleChanged}
                                        size={5}
                                        layoutClassName="w-full"
                                        placeholder="No ensembles selected..."
                                        multiple
                                    />
                                </Field.Root>
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
                            onClick={handleSelectRegularEnsembles}
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
