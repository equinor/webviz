import type React from "react";

import { Add, Info } from "@mui/icons-material";
import { v4 } from "uuid";

import { IconButton } from "@lib/components/IconButton";

import type { InternalDeltaEnsembleItem, RegularEnsembleItem } from "../types";
import { isSameEnsembleItem } from "../utils";

import { DeltaEnsembleRow } from "./DeltaEnsembleRow";
import { RegularEnsembleRow } from "./RegularEnsembleRow";

export type EnsembleTablesProps = {
    nextEnsembleColor: string;
    regularEnsembles: RegularEnsembleItem[];
    deltaEnsembles: InternalDeltaEnsembleItem[];

    onUpdateRegularEnsemble: (updatedEnsemble: RegularEnsembleItem) => void;
    onRemoveRegularEnsemble: (removedEnsemble: RegularEnsembleItem) => void;

    onAddDeltaEnsemble: (newEnsemble: InternalDeltaEnsembleItem) => void;
    onUpdateDeltaEnsemble: (updatedEnsemble: InternalDeltaEnsembleItem) => void;
    onRemoveDeltaEnsemble: (removedEnsemble: InternalDeltaEnsembleItem) => void;
};

export function EnsembleTables(props: EnsembleTablesProps): React.ReactNode {
    function isDuplicateDelta(deltaEnsemble: InternalDeltaEnsembleItem) {
        const { uuid, referenceEnsemble, comparisonEnsemble } = deltaEnsemble;

        return props.deltaEnsembles.some((other) => {
            if (other.uuid === uuid) return false;
            return (
                isSameEnsembleItem(other.comparisonEnsemble, comparisonEnsemble) ||
                isSameEnsembleItem(other.referenceEnsemble, referenceEnsemble)
            );
        });
    }

    function isValidDelta(deltaEnsemble: InternalDeltaEnsembleItem) {
        return !!deltaEnsemble.comparisonEnsemble && !!deltaEnsemble.referenceEnsemble;
    }

    function createNewDeltaEnsemble() {
        if (!props.regularEnsembles.length) return;

        const comparisonEns = props.regularEnsembles[0];
        const referenceEns = props.regularEnsembles[1] ?? props.regularEnsembles[0];

        props.onAddDeltaEnsemble({
            uuid: v4(),
            color: props.nextEnsembleColor,
            comparisonEnsemble: comparisonEns,
            referenceEnsemble: referenceEns,
            customName: null,
        });
    }

    return (
        <>
            {/* Regular ensemble table */}
            <div className="flex-1 flex-col">
                <div className="shrink">Selected Ensembles</div>
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
                            {props.regularEnsembles.map((item) => (
                                <RegularEnsembleRow
                                    key={`${item.caseName}-${item.ensembleName}`}
                                    ensembleItem={item}
                                    onUpdate={props.onUpdateRegularEnsemble}
                                    onDelete={props.onRemoveRegularEnsemble}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                {props.regularEnsembles.length === 0 && <div className="text-gray-500">No ensembles selected.</div>}
            </div>

            {/* Delta-ensemble table */}
            <div className="flex-1 flex-col">
                <div className="shrink flex flex-row">
                    <Info
                        fontSize="medium"
                        titleAccess={`Create delta ensemble using selected ensembles:\n\n"Delta Ensemble" = "Comparison Ensemble" - "Reference Ensemble"`}
                        className={
                            "rounded-md px-0.25 py-0.25 border  border-transparent text-white bg-indigo-600 hover:bg-indigo-700 cursor-help"
                        }
                    />
                    <div className="pl-2 pr-2">Delta Ensembles</div>
                    <IconButton
                        title="New delta ensemble"
                        disabled={props.regularEnsembles.length < 1}
                        onClick={createNewDeltaEnsemble}
                    >
                        <Add />
                    </IconButton>
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
                            {props.deltaEnsembles.map((deltaItem) => {
                                return (
                                    <DeltaEnsembleRow
                                        key={deltaItem.uuid}
                                        deltaEnsembleItem={deltaItem}
                                        availableRegularEnsembles={props.regularEnsembles}
                                        isDuplicate={isDuplicateDelta(deltaItem)}
                                        isValid={isValidDelta(deltaItem)}
                                        onUpdate={props.onUpdateDeltaEnsemble}
                                        onDelete={props.onRemoveDeltaEnsemble}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!props.deltaEnsembles.length && <div className="text-gray-500">No delta ensembles created.</div>}
            </div>
        </>
    );
}
