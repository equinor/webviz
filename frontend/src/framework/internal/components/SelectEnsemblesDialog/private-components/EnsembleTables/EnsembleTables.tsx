import React from "react";

import { Add, History, InfoOutlined } from "@mui/icons-material";
import { v4 } from "uuid";

import { ColorTile } from "@lib/components/ColorTile";
import { SortableList } from "@lib/components/SortableList";
import { Tag } from "@lib/components/Tag";
import { Button } from "@lib/newComponents/Button";
import { Popover } from "@lib/newComponents/Popover";
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
    onRemoveRegularEnsemble: (removedEnsemble: InternalRegularEnsembleSetting) => void;
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
            adornment: <ColorTile color={ens.color} />,
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
        <div className="gap-vertical-sm flex h-full flex-col">
            {/* Regular ensemble table */}
            <div className="gap-vertical-2xs flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between">
                    <Heading as="h6">Regular Ensembles</Heading>
                    <Button variant="text" onClick={handleAddRegularEnsemble}>
                        <Add fontSize="inherit" />
                        Add Ensemble
                    </Button>
                </div>
                <div className="relative flex-1 overflow-auto">
                    <SortableList
                        isMoveAllowed={() => true}
                        onItemMoved={(movedItemId, _originId, _destinationId, position) =>
                            handleOnRegularEnsembleMoved(movedItemId, position)
                        }
                    >
                        <SortableList.ScrollContainer>
                            <div className="grow overflow-auto">
                                <table className="text-body-sm bg-neutral w-full table-fixed">
                                    <SortableList.NoDropZone>
                                        <thead className="z-elevated px-horizontal-xs py-vertical-xs sticky top-0">
                                            <tr>
                                                <th className="w-5 bg-slate-300 p-2">{/* For drag handle column */}</th>
                                                <th className="w-20 bg-slate-300 p-2 text-left">Color</th>
                                                <th className="min-w-1/3 bg-slate-300 p-2 text-left">Custom name</th>
                                                <th className="min-w-1/3 bg-slate-300 p-2 text-left">Case</th>
                                                <th className="min-w-1/4 bg-slate-300 p-2 text-left">Ensemble</th>
                                                <th className="w-20 bg-slate-300 p-2 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                    </SortableList.NoDropZone>
                                    <SortableList.Content>
                                        <tbody>
                                            {props.selectedRegularEnsembles.map((item) => (
                                                <RegularEnsembleRow
                                                    key={`${item.ensembleIdent.toString()}`}
                                                    ensembleSetting={item}
                                                    onUpdate={props.onUpdateRegularEnsemble}
                                                    onDelete={props.onRemoveRegularEnsemble}
                                                />
                                            ))}
                                        </tbody>
                                    </SortableList.Content>
                                </table>
                            </div>
                        </SortableList.ScrollContainer>
                    </SortableList>
                    {props.selectedRegularEnsembles.length === 0 && (
                        <div className="text-ui-md text-neutral-subtle absolute inset-0 flex items-center justify-center">
                            No regular ensembles selected.
                        </div>
                    )}
                </div>
            </div>

            {/* Delta-ensemble table */}
            <div className="gap-vertical-xs flex min-h-0 flex-1 flex-col">
                <div className="gap-horizontal-2xs flex shrink-0 items-center justify-between">
                    <div className="gap-horizontal-sm flex items-center">
                        <Heading as="h6">Delta Ensembles</Heading>
                        <div className="fill-indigo-600">
                            <Popover.Root>
                                <Popover.Trigger variant="text">
                                    <InfoOutlined fontSize="medium" className="cursor-help" />
                                </Popover.Trigger>
                                <Popover.Popup>
                                    <Popover.Content>
                                        Create delta ensemble:
                                        <br />
                                        <Tag label="Delta Ensemble" /> = <Tag label="Comparison Ensemble" /> -{" "}
                                        <Tag label="Reference Ensemble" />
                                    </Popover.Content>
                                </Popover.Popup>
                            </Popover.Root>
                        </div>
                    </div>
                    <Button variant="text" onClick={handleCreateDeltaEnsemble}>
                        <Add fontSize="inherit" />
                        Create Delta Ensemble
                    </Button>
                </div>
                <div className="relative flex-1 overflow-auto">
                    <SortableList
                        isMoveAllowed={() => true}
                        onItemMoved={(movedItemId, _originId, _destinationId, position) =>
                            handleOnDeltaEnsembleMoved(movedItemId, position)
                        }
                    >
                        <SortableList.ScrollContainer>
                            <div className="grow overflow-auto">
                                <table className="text-body-sm bg-neutral w-full table-fixed">
                                    <SortableList.NoDropZone>
                                        <thead className="z-elevated px-horizontal-xs py-vertical-xs sticky top-0">
                                            <tr>
                                                <th className="w-5 bg-slate-300 p-2">{/* For drag handle column */}</th>
                                                <th className="w-20 bg-slate-300 p-2 text-left">Color</th>
                                                <th className="min-w-1/3 bg-slate-300 p-2 text-left">Custom name</th>
                                                <th className="min-w-1/3 bg-slate-300 p-2 text-left">
                                                    Comparison Ensemble
                                                </th>
                                                <th className="min-w-1/4 bg-slate-300 p-2 text-left">
                                                    Reference Ensemble
                                                </th>
                                                <th className="w-20 bg-slate-300 p-2 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                    </SortableList.NoDropZone>
                                    <SortableList.Content>
                                        <tbody className="w-full overflow-y-auto">
                                            {props.selectedDeltaEnsembles.map((deltaItem) => {
                                                return (
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
                                                        onRequestOtherReferenceEnsemble={
                                                            props.onRequestOtherReferenceEnsemble
                                                        }
                                                    />
                                                );
                                            })}
                                        </tbody>
                                    </SortableList.Content>
                                </table>
                            </div>
                        </SortableList.ScrollContainer>
                    </SortableList>
                    {props.selectedDeltaEnsembles.length === 0 && (
                        <div className="text-ui-md absolute inset-0 flex items-center justify-center text-gray-500">
                            No delta ensembles created.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
