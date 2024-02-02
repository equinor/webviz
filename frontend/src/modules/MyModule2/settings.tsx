import React from "react";

import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ModuleFCProps } from "@framework/Module";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom, useAtomValue } from "jotai";

import {
    atomBasedOnVectors,
    selectedEnsembleAtom,
    selectedVectorAtom,
    userSelectedVectorAtom,
    vectorsAtom,
} from "./atoms";
import { State } from "./state";

export const Settings = (props: ModuleFCProps<State>) => {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const [selectedEnsemble, setSelectedEnsemble] = useAtom(selectedEnsembleAtom);
    const [result] = useAtom(vectorsAtom);
    const [isFetching] = useAtom(atomBasedOnVectors);

    const [, setUserSelectedVector] = useAtom(userSelectedVectorAtom);
    const [selectedVector] = useAtom(selectedVectorAtom);

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsemble(ensembleIdent);
    }

    function handleVectorSelectionChange(selectedVectors: string[]) {
        setUserSelectedVector(selectedVectors[0]);
    }

    return (
        <>
            <Label text="Ensemble">
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={selectedEnsemble}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            {isFetching ? (
                <div>Loading...</div>
            ) : (
                <Label text="Vector">
                    <Select
                        options={makeVectorOptionItems(result.data)}
                        filter={true}
                        size={5}
                        value={selectedVector ? [selectedVector] : undefined}
                        onChange={handleVectorSelectionChange}
                    />
                </Label>
            )}
        </>
    );
};

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription_api[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
            //itemArr.push({ value: vec.name, label: vec.descriptive_name + (vec.has_historical ? " (hasHist)" : "") });
        }
    }
    return itemArr;
}

Settings.displayName = "Settings";
