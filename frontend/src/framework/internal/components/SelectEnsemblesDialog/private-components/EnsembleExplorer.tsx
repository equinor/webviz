import React from "react";

import { Add, Check, FilterList, Info, Remove } from "@mui/icons-material";

import { type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { Button } from "@lib/newComponents/Button";
import { Dialog } from "@lib/newComponents/Dialog";
import { Field } from "@lib/newComponents/Field";
import { Hidden } from "@lib/newComponents/Hidden";
import { Popover } from "@lib/newComponents/Popover";
import { type SelectOption } from "@lib/newComponents/Select";
import { Separator } from "@lib/newComponents/Separator";
import { Table } from "@lib/newComponents/Table";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";

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
    const [hoveredEnsembleName, setHoveredEnsembleName] = React.useState<string | null>(null);

    const filteredEnsembles = React.useMemo(
        function filterSelectedEnsembles() {
            if (filterText.trim() === "") {
                return props.selectedEnsembles;
            }

            return props.selectedEnsembles.filter((ens) => {
                const ensembleName = ens.ensembleIdent.getEnsembleName().toLowerCase();
                const caseName = ens.caseName?.toLowerCase() ?? "";
                const caseUuid = ens.ensembleIdent.getCaseUuid().toLowerCase();
                const searchText = filterText.toLowerCase();

                return (
                    ensembleName.includes(searchText) || caseName.includes(searchText) || caseUuid.includes(searchText)
                );
            });
        },
        [filterText, props.selectedEnsembles],
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
                <div className="gap-y-sm relative flex h-full w-full flex-col">
                    <CaseExplorer
                        queriesDisabled={props.queriesDisabled}
                        selectedEnsembles={props.selectedEnsembles}
                        onCaseSelectionChange={handleCaseSelectedChange}
                    />
                    <Separator orientation="horizontal" />
                    <div className="gap-x-sm flex w-full items-center">
                        <Field.Root layoutClassName="flex flex-col gap-y-2xs h-full grow">
                            <div className="gap-md flex w-full flex-nowrap items-center">
                                <Field.Label indicator={`(${ensemblesInSelectedCase.length})`}>
                                    Ensembles in selected case
                                </Field.Label>
                                <span className="grow" />
                                <TextInput
                                    placeholder="Filter..."
                                    startAdornment={<FilterList fontSize="inherit" className="mr-2xs" />}
                                    layoutClassName="max-w-60"
                                    value={filterText}
                                    onValueChange={setFilterText}
                                    size="small"
                                />
                                <Tooltip content="Remove selected ensembles">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleRemoveSelectedEnsembles}
                                        tone="accent"
                                        compact
                                        disabled={props.selectedEnsembles.length === 0}
                                    >
                                        <Add style={{ fontSize: 16 }} /> Add all
                                    </Button>
                                </Tooltip>
                            </div>
                            <Table.Root
                                layoutClassName="w-full h-40 overflow-auto"
                                size="small"
                                compact
                                selectable="multiple"
                                rowSelection={activeEnsembleNames}
                                onChangeRowSelection={(rowKeys) => setActiveEnsembleNames(rowKeys as string[])}
                            >
                                <Table.Head sticky>
                                    <Table.Column colKey="name">Name</Table.Column>
                                    <Table.Column colKey="standard-results" width={100}>
                                        Standard results
                                    </Table.Column>
                                    <Table.Column colKey="add" width={20}>
                                        Add
                                    </Table.Column>
                                </Table.Head>
                                <Table.Body emptyMessage="No ensembles available...">
                                    {ensemblesInSelectedCase.map((ens) => {
                                        return (
                                            <Table.Row
                                                key={ens.name}
                                                rowKey={ens.name}
                                                selectable
                                                onPointerEnter={() => setHoveredEnsembleName(ens.name)}
                                                onPointerLeave={() => setHoveredEnsembleName(null)}
                                            >
                                                <Table.Cell>{ens.name}</Table.Cell>
                                                <Table.Cell>
                                                    <Popover.Root>
                                                        <Popover.Trigger tone="accent" variant="contained" size="small">
                                                            <Info /> {ens.standardResults.length}
                                                        </Popover.Trigger>
                                                        <Popover.Popup side="top">
                                                            <Popover.Content>
                                                                <Typography
                                                                    size="sm"
                                                                    variant="subtle"
                                                                    tone="neutral"
                                                                    lineHeight="default"
                                                                >
                                                                    <strong>Standard results for this ensemble:</strong>
                                                                    <ul className="pl-md list-disc">
                                                                        {ens.standardResults.map((result, idx) => (
                                                                            <li key={idx}>{result}</li>
                                                                        ))}
                                                                    </ul>
                                                                </Typography>
                                                            </Popover.Content>
                                                        </Popover.Popup>
                                                    </Popover.Root>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Hidden
                                                        hidden={
                                                            hoveredEnsembleName !== ens.name ||
                                                            !(
                                                                activeEnsembleNames.length == 0 ||
                                                                activeEnsembleNames.includes(ens.name)
                                                            )
                                                        }
                                                    >
                                                        <Tooltip
                                                            content={
                                                                activeEnsembleNames.length < 2
                                                                    ? "Add ensemble"
                                                                    : "Add selected ensembles"
                                                            }
                                                        >
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                tone="accent"
                                                                iconOnly
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (activeEnsembleNames.length === 0) {
                                                                        if (!selectedCaseUuid || !selectedCaseName) return;
                                                                        try {
                                                                            props.onSelectEnsemble({
                                                                                ensembleIdent: new RegularEnsembleIdent(selectedCaseUuid, ens.name),
                                                                                caseName: selectedCaseName,
                                                                                color: props.nextEnsembleColor,
                                                                                customName: null,
                                                                            });
                                                                        } catch (error) {
                                                                            console.error(`Failed to create RegularEnsembleIdent with following error: `, error);
                                                                        }
                                                                    } else {
                                                                        handleSelectRegularEnsembles();
                                                                    }
                                                                }}
                                                            >
                                                                <Add fontSize="inherit" />
                                                            </Button>
                                                        </Tooltip>
                                                    </Hidden>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Root>
                        </Field.Root>
                        {props.multiSelect && (
                            <>
                                <Separator orientation="vertical" />
                                <Field.Root layoutClassName="flex flex-col gap-y-2xs h-full grow">
                                    <div className="gap-md flex w-full flex-nowrap items-center">
                                        <Field.Label indicator={`(${props.selectedEnsembles.length})`}>
                                            My selected Ensembles
                                        </Field.Label>
                                        <span className="grow" />
                                        <TextInput
                                            placeholder="Filter..."
                                            startAdornment={<FilterList fontSize="inherit" className="mr-2xs" />}
                                            layoutClassName="max-w-60"
                                            value={filterText}
                                            onValueChange={setFilterText}
                                            size="small"
                                        />
                                        <Tooltip content="Remove selected ensembles">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleRemoveSelectedEnsembles}
                                                tone="danger"
                                                compact
                                                disabled={props.selectedEnsembles.length === 0}
                                            >
                                                <Remove style={{ fontSize: 16 }} /> Remove all
                                            </Button>
                                        </Tooltip>
                                    </div>
                                    <Table.Root layoutClassName="w-full max-h-40 overflow-auto" size="small" compact>
                                        <Table.Head sticky>
                                            <Table.Column colKey="name">Name</Table.Column>
                                            <Table.Column colKey="case">Case</Table.Column>
                                            <Table.Column colKey="remove" width={20}>
                                                Remove
                                            </Table.Column>
                                        </Table.Head>
                                        <Table.Body emptyMessage="No ensembles selected">
                                            {filteredEnsembles.map((ens) => {
                                                return (
                                                    <Table.Row key={ens.ensembleIdent.toString()} selectable>
                                                        <Table.Cell>{ens.ensembleIdent.getEnsembleName()}</Table.Cell>
                                                        <Table.Cell>
                                                            {ens.caseName}
                                                            {" - "}
                                                            <Typography variant="subtle" tone="neutral" size="xs">
                                                                {ens.ensembleIdent.getCaseUuid()}
                                                            </Typography>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Tooltip content="Remove ensemble">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="small"
                                                                    onClick={() =>
                                                                        props.onRemoveEnsembles?.(ens.ensembleIdent)
                                                                    }
                                                                    tone="danger"
                                                                    iconOnly
                                                                >
                                                                    <Remove fontSize="inherit" />
                                                                </Button>
                                                            </Tooltip>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                );
                                            })}
                                        </Table.Body>
                                    </Table.Root>
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
