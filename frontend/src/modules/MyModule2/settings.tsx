import React from "react";

import { VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom } from "jotai";

import { atomBasedOnVectors, selectedEnsembleAtom, vectorsAtom } from "./atoms";
import { State } from "./state";

export const Settings = (props: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [selectedEnsemble, setSelectedEnsemble] = useAtom(selectedEnsembleAtom);
    const [result] = useAtom(vectorsAtom);
    const [isFetching] = useAtom(atomBasedOnVectors);

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsemble(ensembleIdent);
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
                    <Select options={makeVectorOptionItems(result.data)} filter={true} size={5} />
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
