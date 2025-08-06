import type React from "react";

import { Add, InfoOutlined } from "@mui/icons-material";
import { v4 } from "uuid";

import { Button } from "@lib/components/Button";

import type {
    ExploredRegularEnsembleInfo as InternalExploredRegularEnsembleInfo,
    InternalDeltaEnsembleSetting,
    InternalRegularEnsembleSetting,
} from "../types";

import { DeltaEnsembleRow } from "./DeltaEnsembleRow";
import { RegularEnsembleRow } from "./RegularEnsembleRow";

export type EnsembleTablesProps = {
    nextEnsembleColor: string;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[];
    exploredRegularEnsembleInfos: InternalExploredRegularEnsembleInfo[];

    onAddRegularEnsemble: () => void;
    onUpdateRegularEnsemble: (updatedEnsemble: InternalRegularEnsembleSetting) => void;
    onRemoveRegularEnsemble: (removedEnsemble: InternalRegularEnsembleSetting) => void;

    onCreateDeltaEnsemble: (newEnsemble: InternalDeltaEnsembleSetting) => void;
    onUpdateDeltaEnsemble: (updatedEnsemble: InternalDeltaEnsembleSetting) => void;
    onRequestOtherComparisonEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRequestOtherReferenceEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    onRemoveDeltaEnsemble: (removedEnsemble: InternalDeltaEnsembleSetting) => void;
};

export function EnsembleTables(props: EnsembleTablesProps): React.ReactNode {
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
        let referenceEnsembleIdent = null;
        let comparisonEnsembleIdent = null;
        if (props.selectedRegularEnsembles.length === 1) {
            referenceEnsembleIdent = props.selectedRegularEnsembles[0].ensembleIdent;
            comparisonEnsembleIdent = props.selectedRegularEnsembles[0].ensembleIdent;
        }
        if (props.selectedRegularEnsembles.length >= 2) {
            referenceEnsembleIdent = props.selectedRegularEnsembles[0].ensembleIdent;
            comparisonEnsembleIdent = props.selectedRegularEnsembles[1].ensembleIdent;
        }

        props.onCreateDeltaEnsemble({
            uuid: v4(),
            color: props.nextEnsembleColor,
            comparisonEnsembleIdent: comparisonEnsembleIdent,
            referenceEnsembleIdent: referenceEnsembleIdent,
            customName: null,
        });
    }

    function isValidDelta(deltaEnsemble: InternalDeltaEnsembleSetting): boolean {
        return !!deltaEnsemble.comparisonEnsembleIdent && !!deltaEnsemble.referenceEnsembleIdent;
    }

    return (
        <>
            {/* Regular ensemble table */}
            <div className="flex-1 flex-col">
                <div className="flex justify-between items-center shrink mb-1">
                    <div>Regular Ensembles</div>
                    <Button
                        variant="contained"
                        onClick={handleAddRegularEnsemble}
                        size="medium"
                        startIcon={<Add fontSize="inherit" />}
                    >
                        Add Ensemble
                    </Button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full border border-collapse table-fixed text-sm">
                        <thead className="sticky top-0">
                            <tr>
                                <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Case</th>
                                <th className="min-w-1/4 text-left p-2 bg-slate-300">Ensemble</th>
                                <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                            </tr>
                        </thead>
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
                    </table>
                </div>
                {props.selectedRegularEnsembles.length === 0 && (
                    <div className="text-gray-500">No ensembles selected.</div>
                )}
            </div>

            {/* Delta-ensemble table */}
            <div className="flex-1 flex-col">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                        <div className="fill-indigo-600">
                            <InfoOutlined
                                fontSize="medium"
                                titleAccess={`Create delta ensemble:\n\n"Delta Ensemble" = "Comparison Ensemble" - "Reference Ensemble"`}
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-gray-200 rounded-md cursor-help mr-2"
                            />
                        </div>
                        <div>Delta Ensembles</div>
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
                <div className="flex-1 overflow-auto">
                    <table className="w-full border border-collapse table-fixed text-sm">
                        <thead>
                            <tr>
                                <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                <th className="min-w-1/3 text-left p-2 bg-slate-300">Comparison Ensemble</th>
                                <th className="min-w-1/4 text-left p-2 bg-slate-300">Reference Ensemble</th>
                                <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="overflow-y-auto w-full">
                            {props.selectedDeltaEnsembles.map((deltaItem) => {
                                return (
                                    <DeltaEnsembleRow
                                        key={deltaItem.uuid}
                                        deltaEnsembleSetting={deltaItem}
                                        selectedRegularEnsembles={props.selectedRegularEnsembles}
                                        exploredRegularEnsembleInfos={props.exploredRegularEnsembleInfos}
                                        isDuplicate={isDuplicateDelta(deltaItem)}
                                        isValid={isValidDelta(deltaItem)}
                                        onUpdate={props.onUpdateDeltaEnsemble}
                                        onDelete={props.onRemoveDeltaEnsemble}
                                        onRequestOtherComparisonEnsemble={props.onRequestOtherComparisonEnsemble}
                                        onRequestOtherReferenceEnsemble={props.onRequestOtherReferenceEnsemble}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!props.selectedDeltaEnsembles.length && (
                    <div className="text-gray-500">No delta ensembles created.</div>
                )}
            </div>
        </>
    );
}
