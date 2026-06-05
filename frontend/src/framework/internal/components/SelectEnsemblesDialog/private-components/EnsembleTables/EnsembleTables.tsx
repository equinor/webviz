import React from "react";

import { Add, History, InfoOutlined } from "@mui/icons-material";
import { v4 } from "uuid";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { SortableList } from "@lib/components/SortableList";
import { Tag } from "@lib/components/Tag";
import { Button } from "@lib/newComponents/Button";
import { ColorTile } from "@lib/newComponents/ColorTile";
import { Popover } from "@lib/newComponents/Popover";
import { Table } from "@lib/newComponents/Table";
import { Heading } from "@lib/newComponents/Typography/compositions";

import type {
    EnsembleIdentWithCaseName,
    InternalDeltaEnsembleSetting,
    InternalRegularEnsembleSetting,
} from "../../types";

import { DeltaEnsembleRow, type RegularEnsembleOption } from "./DeltaEnsembleRow";
import { RegularEnsembleRow } from "./RegularEnsembleRow";

export type EnsembleTablesProps = {
    nextEnsembleColor: string;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[];
    selectableEnsemblesForDelta: EnsembleIdentWithCaseName[];

    onAddRegularEnsemble: () => void;
    onUpdateRegularEnsemble: (updatedEnsemble: InternalRegularEnsembleSetting) => void;
    onRemoveRegularEnsemble: (removedEnsemble: RegularEnsembleIdent) => void;
    onMoveRegularEnsemble: (movedEnsemble: InternalRegularEnsembleSetting, newIndex: number) => void;

    onCreateDeltaEnsemble: (newEnsemble: InternalDeltaEnsembleSetting) => void;
    onUpdateDeltaEnsemble: (updatedEnsemble: InternalDeltaEnsembleSetting) => void;
    onRequestOtherComparisonEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherReferenceEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRemoveDeltaEnsemble: (removedEnsemble: InternalDeltaEnsembleSetting) => void;
    onMoveDeltaEnsemble: (movedEnsemble: InternalDeltaEnsembleSetting, newIndex: number) => void;
};

function makeRegularEnsembleOptionsForDeltaEnsemble(
    selectedRegularEnsembles: InternalRegularEnsembleSetting[],
    selectableEnsemblesForDelta: EnsembleIdentWithCaseName[],
): RegularEnsembleOption[] {
    // Only show additional selectable ensembles not among selected ensembles
    const selectableEnsemblesNotAmongSelected = selectableEnsemblesForDelta.filter(
        (elm) => !selectedRegularEnsembles.some((ens) => ens.ensembleIdent.equals(elm.ensembleIdent)),
    );

    return [
        ...selectedRegularEnsembles.map((ens) => ({
            ensembleIdent: ens.ensembleIdent,
            caseName: ens.caseName,
            customName: ens.customName,
            adornment: <ColorTile.Tile color={ens.color} size="small" />,
        })),
        ...selectableEnsemblesNotAmongSelected.map((ens) => ({
            ensembleIdent: ens.ensembleIdent,
            caseName: ens.caseName,
            adornment: <History fontSize="small" />,
        })),
    ];
}

export function EnsembleTables(props: EnsembleTablesProps): React.ReactNode {
    const regularEnsembleOptionsForDelta = React.useMemo(
        () =>
            makeRegularEnsembleOptionsForDeltaEnsemble(
                props.selectedRegularEnsembles,
                props.selectableEnsemblesForDelta,
            ),
        [props.selectedRegularEnsembles, props.selectableEnsemblesForDelta],
    );

    function isDuplicateDelta(deltaEnsemble: InternalDeltaEnsembleSetting) {
        const { uuid, referenceEnsembleIdent, comparisonEnsembleIdent } = deltaEnsemble;

        return props.selectedDeltaEnsembles.some((other) => {
            if (other.uuid === uuid) return false;

            // Only categorize as duplicate when delta ensembles contain both comparison and reference ensembles.
            if (!other.comparisonEnsembleIdent || !other.referenceEnsembleIdent) return false;
            if (!comparisonEnsembleIdent || !referenceEnsembleIdent) return false;

            return (
                other.comparisonEnsembleIdent.equals(comparisonEnsembleIdent) &&
                other.referenceEnsembleIdent.equals(referenceEnsembleIdent)
            );
        });
    }

    function handleAddRegularEnsemble() {
        props.onAddRegularEnsemble?.();
    }

    function handleCreateDeltaEnsemble() {
        props.onCreateDeltaEnsemble({
            uuid: v4(),
            color: props.nextEnsembleColor,
            comparisonEnsembleIdent: null,
            referenceEnsembleIdent: null,
            comparisonEnsembleCaseName: null,
            referenceEnsembleCaseName: null,
            customName: null,
        });
    }

    function handleOnRegularEnsembleMoved(movedItemId: string, position: number) {
        const ensemble = props.selectedRegularEnsembles.find((ens) => ens.ensembleIdent.toString() === movedItemId);
        if (!ensemble) return;

        props.onMoveRegularEnsemble(ensemble, position);
    }

    function handleOnDeltaEnsembleMoved(movedItemId: string, position: number) {
        const ensemble = props.selectedDeltaEnsembles.find((ens) => ens.uuid === movedItemId);
        if (!ensemble) return;

        props.onMoveDeltaEnsemble(ensemble, position);
    }

    return (
        <div className="gap-vertical-sm flex h-full min-h-0 flex-col">
            <div className="gap-vertical-xs flex min-h-0 flex-1 flex-col">
                <div className="gap-horizontal-sm flex shrink-0 items-center">
                    <Heading as="h6">Regular Ensembles</Heading>
                    <Button variant="contained" size="small" onClick={handleAddRegularEnsemble}>
                        <Add fontSize="inherit" />
                        Add
                    </Button>
                </div>

                {/* Regular ensemble table */}
                <div className="relative flex-1 overflow-auto">
                    <SortableList
                        className="flex-1"
                        isMoveAllowed={() => true}
                        onItemMoved={handleOnRegularEnsembleMoved}
                    >
                        <SortableList.ScrollContainer>
                            <Table.Root compact fixed size="small" width="100%">
                                <SortableList.NoDropZone>
                                    <Table.Head sticky>
                                        <Table.Column layoutClassName="w-5" colKey="handle" />
                                        <Table.Column layoutClassName="w-20">Color</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/3">Custom name</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/3">Case</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/4">Ensemble</Table.Column>
                                        <Table.Column layoutClassName="w-20">Remove</Table.Column>
                                    </Table.Head>
                                </SortableList.NoDropZone>

                                <SortableList.Content>
                                    <Table.Body emptyMessage="No regular ensembles selected.">
                                        {props.selectedRegularEnsembles.map((item) => (
                                            <RegularEnsembleRow
                                                key={`${item.ensembleIdent.toString()}`}
                                                ensembleSetting={item}
                                                onUpdate={props.onUpdateRegularEnsemble}
                                                onDelete={props.onRemoveRegularEnsemble}
                                            />
                                        ))}
                                    </Table.Body>
                                </SortableList.Content>
                            </Table.Root>
                        </SortableList.ScrollContainer>
                    </SortableList>
                </div>
            </div>

            {/* Delta-ensemble table */}
            <div className="gap-vertical-xs flex min-h-0 flex-1 flex-col">
                <div className="gap-horizontal-2xs flex shrink-0 items-center">
                    <div className="gap-horizontal-sm flex items-center">
                        <Heading as="h6">Delta Ensembles</Heading>
                        <div className="fill-indigo-600">
                            <Popover.Root>
                                <Popover.Trigger variant="ghost" size="small">
                                    <InfoOutlined style={{ fontSize: 16 }} className="cursor-help" />
                                </Popover.Trigger>
                                <Popover.Popup>
                                    <Popover.Content>
                                        <div className="gap-vertical-2xs flex flex-col">
                                            Create delta ensemble:
                                            <div className="whitespace-nowrap">
                                                <Tag label="Delta Ensemble" /> = <Tag label="Comparison Ensemble" /> -{" "}
                                                <Tag label="Reference Ensemble" />
                                            </div>
                                        </div>
                                    </Popover.Content>
                                </Popover.Popup>
                            </Popover.Root>
                        </div>
                    </div>
                    <Button variant="contained" size="small" onClick={handleCreateDeltaEnsemble}>
                        <Add fontSize="inherit" />
                        Add
                    </Button>
                </div>

                <div className="relative flex-1 overflow-auto">
                    <SortableList isMoveAllowed={() => true} onItemMoved={handleOnDeltaEnsembleMoved}>
                        <SortableList.ScrollContainer>
                            <Table.Root compact fixed size="small" width="100%">
                                <SortableList.NoDropZone>
                                    <Table.Head sticky>
                                        <Table.Column layoutClassName="w-5" colKey="handle" />
                                        <Table.Column layoutClassName="w-20">Color</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/3">Custom name</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/3">Comparison Ensemble</Table.Column>
                                        <Table.Column layoutClassName="min-w-1/4">Reference Ensemble</Table.Column>
                                        <Table.Column layoutClassName="w-20">Remove</Table.Column>
                                    </Table.Head>
                                </SortableList.NoDropZone>
                                <SortableList.Content>
                                    <Table.Body emptyMessage="No delta ensembles created.">
                                        {props.selectedDeltaEnsembles.map((deltaItem) => (
                                            <DeltaEnsembleRow
                                                key={deltaItem.uuid}
                                                deltaEnsembleSetting={deltaItem}
                                                regularEnsembleOptions={regularEnsembleOptionsForDelta}
                                                isDuplicate={isDuplicateDelta(deltaItem)}
                                                onUpdate={props.onUpdateDeltaEnsemble}
                                                onDelete={props.onRemoveDeltaEnsemble}
                                                onRequestOtherComparisonEnsemble={
                                                    props.onRequestOtherComparisonEnsemble
                                                }
                                                onRequestOtherReferenceEnsemble={props.onRequestOtherReferenceEnsemble}
                                            />
                                        ))}
                                    </Table.Body>
                                </SortableList.Content>
                            </Table.Root>
                        </SortableList.ScrollContainer>
                    </SortableList>
                </div>
            </div>
        </div>
    );
}
