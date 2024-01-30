import React from "react";

import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSetAtom } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import {
    atomBasedOnVectors,
    selectedEnsembleAtom,
    selectedVectorAtom,
    userSelectedVectorAtom,
    vectorsAtom,
} from "./atoms";
import { State } from "./state";

export const Settings = (props: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSetAtom(props.workbenchSession);

    const [selectedEnsemble, setSelectedEnsemble] = props.moduleContext.useAtom(selectedEnsembleAtom);
    const [result] = props.moduleContext.useAtom(vectorsAtom);
    const [isFetching] = props.moduleContext.useAtom(atomBasedOnVectors);

    const [, setUserSelectedVector] = props.moduleContext.useAtom(userSelectedVectorAtom);
    const [selectedVector] = props.moduleContext.useAtom(selectedVectorAtom);

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
