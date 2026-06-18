import React from "react";

import { Add, Check, CheckBox, CheckBoxOutlineBlank, FilterList, Remove } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { Button } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";
import { Field } from "@lib/newComponents/Field";
import { type SelectOption } from "@lib/newComponents/Select";
import { Separator } from "@lib/newComponents/Separator";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
    const [filterText, setFilterText] = React.useState("");

    const filteredEnsembles = React.useMemo(
        function filterEnsemblesInCase() {
            if (filterText.trim() === "") {
                return ensemblesInSelectedCase;
            }
            const searchText = filterText.toLowerCase();
            return ensemblesInSelectedCase.filter((ens) => ens.name.toLowerCase().includes(searchText));
        },
        [filterText, ensemblesInSelectedCase],
    );

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

    function isEnsembleSelected(ensembleName: string): boolean {
        return props.selectedEnsembles.some(
            (sel) =>
                sel.ensembleIdent.getCaseUuid() === selectedCaseUuid &&
                sel.ensembleIdent.getEnsembleName() === ensembleName,
        );
    }

    function handleSelectEnsemble(ensembleName: string) {
        if (!selectedCaseUuid || !selectedCaseName) return;
        let ensembleIdent: RegularEnsembleIdent;
        try {
            ensembleIdent = new RegularEnsembleIdent(selectedCaseUuid, ensembleName);
        } catch (error) {
            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
            return;
        }
        props.onSelectEnsemble({
            ensembleIdent,
            caseName: selectedCaseName,
            color: props.nextEnsembleColor,
            customName: null,
        });
        setActiveEnsembleNames((prev) => [...prev, ensembleName]);
    }

    function handleUnselectEnsemble(ensembleName: string) {
        if (!selectedCaseUuid) return;
        let ensembleIdent: RegularEnsembleIdent;
        try {
            ensembleIdent = new RegularEnsembleIdent(selectedCaseUuid, ensembleName);
        } catch (error) {
            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
            return;
        }
        props.onRemoveEnsembles?.(ensembleIdent);
        setActiveEnsembleNames((prev) => prev.filter((name) => name !== ensembleName));
    }

    function handleSelectAll() {
        if (!selectedCaseUuid || !selectedCaseName) return;
        for (const ens of ensemblesInSelectedCase) {
            if (isEnsembleSelected(ens.name)) continue;
            try {
                const ensembleIdent = new RegularEnsembleIdent(selectedCaseUuid, ens.name);
                props.onSelectEnsemble({
                    ensembleIdent,
                    caseName: selectedCaseName,
                    color: props.nextEnsembleColor,
                    customName: null,
                });
            } catch (error) {
                console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
            }
        }
    }

    function handleRemoveAll() {
        if (!selectedCaseUuid || !props.onRemoveEnsembles) return;
        const toRemove: RegularEnsembleIdent[] = [];
        for (const ens of ensemblesInSelectedCase) {
            try {
                const ensembleIdent = new RegularEnsembleIdent(selectedCaseUuid, ens.name);
                if (props.selectedEnsembles.some((sel) => sel.ensembleIdent.equals(ensembleIdent))) {
                    toRemove.push(ensembleIdent);
                }
            } catch (error) {
                console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
            }
        }
        if (toRemove.length > 0) {
            props.onRemoveEnsembles(...toRemove);
        }
    }

    return (
        <>
            <Dialog.Body layoutClassName="grow min-h-0">
                <div className="gap-y-sm relative flex h-full w-full flex-col">
                    <CaseExplorer
                        queriesDisabled={props.queriesDisabled}
                        selectedEnsembles={props.selectedEnsembles}
                        onCaseSelectionChange={handleCaseSelectedChange}
                    />
                    <Separator orientation="horizontal" />
                    <Field.Root layoutClassName="flex flex-col gap-y-2xs min-h-52 h-52 w-full">
                        <div className="gap-md flex w-full flex-nowrap items-center">
                            <Field.Label indicator={`(${ensemblesInSelectedCase.length})`}>
                                Ensembles in selected case
                            </Field.Label>
                            <Tooltip content="Add all ensembles from selected case">
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleSelectAll}
                                    tone="accent"
                                    disabled={
                                        ensemblesInSelectedCase.length === 0 ||
                                        ensemblesInSelectedCase.every((ens) => isEnsembleSelected(ens.name))
                                    }
                                >
                                    <Add style={{ fontSize: 16 }} /> Add all
                                </Button>
                            </Tooltip>
                            <Tooltip content="Remove all ensembles from selected case">
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleRemoveAll}
                                    tone="danger"
                                    disabled={
                                        ensemblesInSelectedCase.length === 0 ||
                                        !ensemblesInSelectedCase.some((ens) => isEnsembleSelected(ens.name))
                                    }
                                >
                                    <Remove style={{ fontSize: 16 }} /> Remove all
                                </Button>
                            </Tooltip>
                            <span className="grow" />
                            <TextInput
                                placeholder="Filter..."
                                startAdornment={<FilterList fontSize="inherit" className="mr-2xs" />}
                                layoutClassName="max-w-60"
                                value={filterText}
                                onValueChange={setFilterText}
                                size="small"
                            />
                        </div>
                        <div className="form-element gap-x-sm group/grid text-body-sm grid w-full grow grid-cols-[2rem_1fr] content-start overflow-auto">
                            {filteredEnsembles.map((ens) => (
                                <EnsembleRow
                                    key={ens.name}
                                    ensemble={ens}
                                    selected={isEnsembleSelected(ens.name)}
                                    onSelect={() => handleSelectEnsemble(ens.name)}
                                    onUnselect={() => handleUnselectEnsemble(ens.name)}
                                />
                            ))}
                        </div>
                    </Field.Root>
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
type EnsembleRowProps = {
    ensemble: EnsembleInfo_api;
    selected: boolean;
    onSelect: () => void;
    onUnselect: () => void;
};

function EnsembleRow(props: EnsembleRowProps) {
    const rowRef = React.useRef<HTMLDivElement>(null);

    function handleClick() {
        if (props.selected) {
            props.onUnselect();
        } else {
            props.onSelect();
        }
        rowRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
            next?.focus({ preventScroll: true });
            next?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
            prev?.focus({ preventScroll: true });
            prev?.scrollIntoView({ block: "nearest" });
        }
    }

    function makeIcon() {
        if (props.selected) {
            return <CheckBox />;
        }

        return <CheckBoxOutlineBlank />;
    }

    return (
        <div
            className={resolveClassNames(
                "selectable group/row px-2xs hover:bg-neutral focus-within:bg-accent focus-within:hover:bg-accent-hover active:bg-accent-active h-selectable-md col-span-3 grid grid-cols-subgrid items-center justify-items-center rounded-none!",
                {
                    "bg-accent-strong! text-accent-strong-on-emphasis! hover:bg-accent-strong-hover! active:bg-accent-strong-active!":
                        props.selected,
                },
            )}
            ref={rowRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
        >
            <span className="text-body-md">{makeIcon()}</span>
            <span className={resolveClassNames("justify-self-start", { "font-bolder": props.selected })}>
                {props.ensemble.name}
            </span>
        </div>
    );
}
