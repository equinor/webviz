import React from "react";

import { Add, Check, CheckBox, CheckBoxOutlineBlank, Close, FilterList, Remove } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";
import { Field } from "@lib/newComponents/Field";
import { Hidden } from "@lib/newComponents/Hidden";
import { Separator } from "@lib/newComponents/Separator";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
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

    function handleCaseSelectedChange(caseSelection: CaseSelection | null) {
        if (!caseSelection) {
            setSelectedCaseName(null);
            setSelectedCaseUuid(null);
            setEnsemblesInSelectedCase([]);
            return;
        }

        // Sort alphabetically by name
        const selectedCaseSortedEnsembles = [...caseSelection.filteredEnsembles].sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        setSelectedCaseName(caseSelection.caseName);
        setSelectedCaseUuid(caseSelection.caseUuid);
        setEnsemblesInSelectedCase(selectedCaseSortedEnsembles);
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
                        <div className="form-element gap-x-sm group/grid text-body-sm grid w-full grow grid-cols-[2rem_1fr] content-start overflow-auto">
                            {filteredEnsembles.map((ens) => (
                                <EnsembleRow
                                    key={ens.name}
                                    ensemble={ens}
                                    selected={isEnsembleSelected(ens.name)}
                                    onSelect={() => handleSelectEnsemble(ens.name)}
                                    onUnselect={() => handleUnselectEnsemble(ens.name)}
                                    singleSelect={!props.multiSelect}
                                />
                            ))}
                        </div>
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
                        <Button onClick={() => props.onRequestClose?.()} tone="neutral" variant="contained">
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
                        props.selected && !props.singleSelect,
                },
            )}
            ref={rowRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
        >
            <span className="text-body-md">{makeIcon()}</span>
            <span
                className={resolveClassNames("gap-sm flex items-center justify-self-start", {
                    "font-bolder": props.selected && !props.singleSelect,
                })}
            >
                {props.ensemble.name}{" "}
                <Typography size="xs">({props.ensemble.realizationCount} realizations)</Typography>
            </span>
        </div>
    );
}
