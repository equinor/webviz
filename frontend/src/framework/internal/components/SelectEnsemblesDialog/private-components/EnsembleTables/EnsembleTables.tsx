import React from "react";

import { Add, History, InfoOutlined } from "@mui/icons-material";
import { v4 } from "uuid";

import { Button } from "@lib/components/Button";
import { ColorTile } from "@lib/components/ColorTile";
import { SortableList } from "@lib/components/SortableList";

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
        <div className="flex flex-col h-full gap-2">
            {/* Regular ensemble table */}
            <div className="flex flex-1 flex-col min-h-0">
                <div className="flex justify-between items-center shrink-0 pt-1 pb-1">
                    <div className="font-medium text-xl">Regular Ensembles</div>
                    <Button
                        variant="contained"
                        onClick={handleAddRegularEnsemble}
                        size="medium"
                        startIcon={<Add fontSize="inherit" />}
                    >
                        Add Ensemble
                    </Button>
                </div>
                <div className="flex-1 overflow-auto relative">
                    <SortableList
                        isMoveAllowed={() => true}
                        onItemMoved={(movedItemId, _originId, _destinationId, position) =>
                            handleOnRegularEnsembleMoved(movedItemId, position)
                        }
                    >
                        <SortableList.ScrollContainer>
                            <div className="grow overflow-auto">
                                <table className="w-full border border-collapse table-fixed text-sm">
                                    <SortableList.NoDropZone>
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="w-5 p-2 bg-slate-300">{/* For drag handle column */}</th>
                                                <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Case</th>
                                                <th className="min-w-1/4 text-left p-2 bg-slate-300">Ensemble</th>
                                                <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
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
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            No regular ensembles selected.
                        </div>
                    )}
                </div>
            </div>

            {/* Delta-ensemble table */}
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center shrink-0 pt-1 pb-1">
                    <div className="flex items-center">
                        <div className="font-medium text-xl">Delta Ensembles</div>
                        <div className="fill-indigo-600">
                            <InfoOutlined
                                fontSize="medium"
                                titleAccess={`Create delta ensemble:\n\n"Delta Ensemble" = "Comparison Ensemble" - "Reference Ensemble"`}
                                className="text-indigo-600 cursor-help ml-2"
                            />
                        </div>
                    </div>
                    <Button
                        variant="contained"
                        size="medium"
                        startIcon={<Add fontSize="inherit" />}
                        onClick={handleCreateDeltaEnsemble}
                    >
                        Create Delta Ensemble
                    </Button>
                </div>
                <div className="flex-1 overflow-auto relative">
                    <SortableList
                        isMoveAllowed={() => true}
                        onItemMoved={(movedItemId, _originId, _destinationId, position) =>
                            handleOnDeltaEnsembleMoved(movedItemId, position)
                        }
                    >
                        <SortableList.ScrollContainer>
                            <div className="grow overflow-auto">
                                <table className="w-full border border-collapse table-fixed text-sm">
                                    <SortableList.NoDropZone>
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="w-5 p-2 bg-slate-300">{/* For drag handle column */}</th>
                                                <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                                <th className="min-w-1/3 text-left p-2 bg-slate-300">
                                                    Comparison Ensemble
                                                </th>
                                                <th className="min-w-1/4 text-left p-2 bg-slate-300">
                                                    Reference Ensemble
                                                </th>
                                                <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                                            </tr>
                                        </thead>
                                    </SortableList.NoDropZone>
                                    <SortableList.Content>
                                        <tbody className="overflow-y-auto w-full">
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
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            No delta ensembles created.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
