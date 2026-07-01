import React from "react";

import { Add, Check, CheckBox, CheckBoxOutlineBlank, Close, FilterList, Remove } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Field } from "@lib/components/Field";
import { HasChangesIndicator } from "@lib/components/HasChangesIndicator";
import { Hidden } from "@lib/components/Hidden";
import { Separator } from "@lib/components/Separator";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { InternalRegularEnsembleSetting } from "../types";

import { CaseExplorer, type CaseSelection } from "./CaseExplorer/CaseExplorer";

export type EnsembleExplorerProps = {
    queriesDisabled: boolean;

    colorGenerator: Generator<string, never, undefined>;

    // The ensembles that are currently selected. This is used to determine which ensembles are already selected and should be displayed as such in the UI.
    selectedEnsembles: InternalRegularEnsembleSetting[];

    // Whether multiple ensembles can be selected at once. If true, the UI will allow selecting multiple ensembles.
    multiSelect?: boolean;

    // Callback function that is called when the new ensemble selection is confirmed
    onSelectionChange: (selection: InternalRegularEnsembleSetting[]) => void;

    // Callback function that is called when an ensemble is selected. This is used to immediately select an ensemble without having to confirm the selection.
    onSelect: (ensemble: InternalRegularEnsembleSetting) => void;

    // Callback function that is called when the dialog is requested to be closed, either by clicking the cancel button or the close icon.
    onRequestClose?: () => void;
};

export function EnsembleExplorer(props: EnsembleExplorerProps): React.ReactNode {
    const [prevSelectedEnsembles, setPrevSelectedEnsembles] = React.useState<InternalRegularEnsembleSetting[]>(
        props.selectedEnsembles,
    );
    const [localSelection, setLocalSelection] = React.useState<InternalRegularEnsembleSetting[]>(
        props.selectedEnsembles,
    );

    const [selectedCase, setSelectedCase] = React.useState<CaseSelection | null>(null);

    const [filterText, setFilterText] = React.useState("");

    if (prevSelectedEnsembles !== props.selectedEnsembles) {
        setPrevSelectedEnsembles(props.selectedEnsembles);
        setLocalSelection(props.selectedEnsembles);
    }

    const filteredEnsembles = React.useMemo(
        function filterEnsemblesInCase() {
            if (!selectedCase) {
                return [];
            }

            if (filterText.trim() === "") {
                return selectedCase.filteredEnsembles;
            }
            const searchText = filterText.toLowerCase();
            return selectedCase.filteredEnsembles.filter((ens) => ens.name.toLowerCase().includes(searchText));
        },
        [filterText, selectedCase],
    );

    function handleCaseSelectedChange(caseSelection: CaseSelection | null) {
        if (!caseSelection) {
            setSelectedCase(null);
            return;
        }

        // Sort ensembles alphabetically by name
        const selectedCaseSortedEnsembles = [...caseSelection.filteredEnsembles].sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        setSelectedCase({
            ...caseSelection,
            filteredEnsembles: selectedCaseSortedEnsembles,
        });
    }

    function isEnsembleSelected(ensembleName: string): boolean {
        return localSelection.some(
            (sel) =>
                sel.ensembleIdent.getCaseUuid() === selectedCase?.caseUuid &&
                sel.ensembleIdent.getEnsembleName() === ensembleName,
        );
    }

    function handleSelectEnsemble(ensembleName: string) {
        if (!selectedCase) return;

        if (props.multiSelect === false) {
            try {
                props.onSelect({
                    ensembleIdent: new RegularEnsembleIdent(selectedCase.caseUuid, ensembleName),
                    color: props.colorGenerator.next().value,
                    caseName: selectedCase.caseName,
                    customName: null,
                });
                return;
            } catch (error) {
                console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
                return;
            }
        }

        if (isEnsembleSelected(ensembleName)) return;

        try {
            setLocalSelection((prev) => [
                ...prev,
                {
                    ensembleIdent: new RegularEnsembleIdent(selectedCase.caseUuid, ensembleName),
                    color: props.colorGenerator.next().value,
                    caseName: selectedCase.caseName,
                    customName: null,
                },
            ]);
        } catch (error) {
            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
        }
    }

    function handleSelectAllEnsembles() {
        if (!selectedCase) return;

        for (const ens of selectedCase.filteredEnsembles) {
            if (isEnsembleSelected(ens.name)) continue;
            handleSelectEnsemble(ens.name);
        }
    }

    function handleUnselectEnsemble(ensembleName: string) {
        if (!selectedCase) return;

        try {
            const ensembleIdent = new RegularEnsembleIdent(selectedCase.caseUuid, ensembleName);
            setLocalSelection((prev) => removeEnsembleFromSelection(prev, ensembleIdent));
        } catch (error) {
            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
        }
    }

    function handleRemoveAll() {
        if (!selectedCase) return;

        for (const ens of selectedCase.filteredEnsembles) {
            if (!isEnsembleSelected(ens.name)) continue;
            handleUnselectEnsemble(ens.name);
        }
    }

    function handleConfirmSelection() {
        props.onSelectionChange?.(localSelection);
        props.onRequestClose?.();
    }

    function handleCancelSelection() {
        setLocalSelection(props.selectedEnsembles);
        props.onRequestClose?.();
    }

    const selectionChanges = React.useMemo(
        function computeSelectionChanges() {
            const added = localSelection.filter(
                (sel) => !props.selectedEnsembles.some((prev) => prev.ensembleIdent.equals(sel.ensembleIdent)),
            );
            const removed = props.selectedEnsembles.filter(
                (prev) => !localSelection.some((sel) => sel.ensembleIdent.equals(prev.ensembleIdent)),
            );
            return { added, removed };
        },
        [localSelection, props.selectedEnsembles],
    );

    const ensemblesInSelectedCase = selectedCase?.filteredEnsembles ?? [];

    return (
        <>
            <Dialog.Body layoutClassName="grow min-h-0">
                <div className="gap-y-sm relative flex h-full w-full flex-col">
                    <CaseExplorer
                        queriesDisabled={props.queriesDisabled}
                        ensembleSelection={props.selectedEnsembles}
                        newEnsembleSelection={localSelection}
                        onCaseSelectionChange={handleCaseSelectedChange}
                    />
                    <Separator orientation="horizontal" />
                    <div className="gap-y-2xs flex h-52 min-h-52 w-full flex-col">
                        <div className="gap-md flex w-full flex-nowrap items-center">
                            <Field.Root>
                                <Field.Label indicator={`(${ensemblesInSelectedCase.length})`}>
                                    Ensembles in selected case
                                </Field.Label>
                            </Field.Root>
                            <Hidden hidden={!props.multiSelect}>
                                <Tooltip content="Add all ensembles from selected case">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSelectAllEnsembles}
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
                            </Hidden>
                            <span className="grow" />
                            <TextInput
                                placeholder="Filter ensembles..."
                                startAdornment={<FilterList fontSize="inherit" className="mr-2xs" />}
                                layoutClassName="max-w-60"
                                value={filterText}
                                onValueChange={setFilterText}
                                size="small"
                                endAdornment={
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        tone="neutral"
                                        onClick={() => setFilterText("")}
                                        iconOnly
                                        compact
                                        data-density="comfortable"
                                    >
                                        <Close fontSize="inherit" />
                                    </Button>
                                }
                            />
                        </div>
                        <div className="form-element group/grid text-body-sm gap-x-2xs grid w-full grow grid-cols-[2rem_1rem_1fr] content-start overflow-auto">
                            {selectedCase &&
                                filteredEnsembles.map((ens) => (
                                    <EnsembleRow
                                        key={ens.name}
                                        ensemble={ens}
                                        selected={isEnsembleSelected(ens.name)}
                                        onSelect={() => handleSelectEnsemble(ens.name)}
                                        onUnselect={() => handleUnselectEnsemble(ens.name)}
                                        singleSelect={!props.multiSelect}
                                        status={computeEnsembleStatus(
                                            props.selectedEnsembles,
                                            localSelection,
                                            selectedCase?.caseUuid,
                                            ens.name,
                                        )}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            </Dialog.Body>
            <Dialog.Actions>
                {props.multiSelect ? (
                    <>
                        <Tooltip
                            content={`By clicking "Apply" you confirm to add ${selectionChanges.added.length} and remove ${selectionChanges.removed.length} ensembles from your previous selection.`}
                        >
                            <div className="text-body-sm text-neutral-strong mr-sm flex h-full cursor-help items-center justify-end">
                                {selectionChanges.added.length > 0 && (
                                    <span className="text-success-subtle">
                                        <Add /> {selectionChanges.added.length}
                                    </span>
                                )}
                                {selectionChanges.added.length > 0 && selectionChanges.removed.length > 0 && (
                                    <span className="mx-2xs">|</span>
                                )}
                                {selectionChanges.removed.length > 0 && (
                                    <span className="text-danger-subtle">
                                        <Remove /> {selectionChanges.removed.length}
                                    </span>
                                )}
                                {selectionChanges.added.length > 0 || selectionChanges.removed.length > 0 ? (
                                    <span className="mx-2xs">ensembles</span>
                                ) : null}
                            </div>
                        </Tooltip>
                        <Button onClick={handleCancelSelection} variant="ghost" tone="neutral">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmSelection} variant="contained">
                            Apply
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={handleCancelSelection} tone="neutral" variant="contained">
                            Cancel
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
    status: "added" | "removed" | "unchanged";
    onSelect: () => void;
    onUnselect: () => void;
    singleSelect: boolean;
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
        if (props.singleSelect) {
            return props.selected ? <Check fontSize="inherit" /> : <span className="w-3" />;
        }

        if (props.selected) {
            return <CheckBox />;
        }

        return <CheckBoxOutlineBlank />;
    }

    return (
        <div
            className={resolveClassNames(
                "selectable group/row px-2xs hover:bg-neutral focus-within:bg-accent focus-within:hover:bg-accent-hover active:bg-accent-active min-h-selectable-md col-span-3 grid grid-cols-subgrid items-center justify-items-center rounded-none!",
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
            <span className="text-body-md flex w-full items-center justify-end">{makeIcon()}</span>
            <span className="flex w-full items-center">
                {props.status !== "unchanged" && (
                    <HasChangesIndicator
                        size="em"
                        tooltip={
                            props.status === "added"
                                ? "This ensemble is going to be added to your selection."
                                : "This ensemble is going to be removed from your previous selection. All custom names and colors will be lost."
                        }
                    />
                )}
            </span>
            <span
                className={resolveClassNames("gap-sm flex w-full items-center", {
                    "font-bolder": props.selected && !props.singleSelect,
                })}
            >
                {props.ensemble.name}{" "}
                <Typography size="xs">({props.ensemble.realizationCount} realizations)</Typography>
            </span>
        </div>
    );
}

function removeEnsembleFromSelection(
    selection: InternalRegularEnsembleSetting[],
    ensembleIdent: RegularEnsembleIdent,
): InternalRegularEnsembleSetting[] {
    return selection.filter((sel) => !sel.ensembleIdent.equals(ensembleIdent));
}

function computeEnsembleStatus(
    prevSelection: InternalRegularEnsembleSetting[],
    newSelection: InternalRegularEnsembleSetting[],
    caseUuid: string,
    ensembleName: string,
): "added" | "removed" | "unchanged" {
    try {
        const ensembleIdent = new RegularEnsembleIdent(caseUuid, ensembleName);
        const wasSelected = prevSelection.some((sel) => sel.ensembleIdent.equals(ensembleIdent));
        const isSelected = newSelection.some((sel) => sel.ensembleIdent.equals(ensembleIdent));

        if (wasSelected && !isSelected) {
            return "removed";
        } else if (!wasSelected && isSelected) {
            return "added";
        } else {
            return "unchanged";
        }
    } catch (error) {
        console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
        return "unchanged";
    }
}
