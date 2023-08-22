import React from "react";

import { Frequency_api, VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { VectorSelector } from "@lib/components/VectorSelector";

import { isEqual } from "lodash";

import { useVectorsQueries } from "./queryHooks";
import { GroupBy, GroupByString as GroupByEnumToStringMapping, State, VectorSpec } from "./state";
import { makeFrequencyDropdownOptions } from "./utils/elementOptionsUtils";
import {
    EnsembleVectorDescriptionHelper,
    createEnsembleIdentAndVectorDescriptionMap,
    isEnsembleAndVectorInMap,
} from "./utils/ensemblesVectorDescriptionHelper";

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [groupBy, setGroupBy] = moduleContext.useStoreState("groupBy");
    const setVectorSpecifications = moduleContext.useSetStoreValue("vectorSpecifications");

    const [previousEnsembleSet, setPreviousEnsembleSet] = React.useState<EnsembleSet>(ensembleSet);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [selectedVectorNames, setSelectedVectorNames] = React.useState<string[]>([]);

    const vectorsQueries = useVectorsQueries(selectedEnsembleIdents);

    const vectorsUnion: VectorDescription_api[] = [];
    for (const query of vectorsQueries) {
        if (!query.data) continue;

        for (const vector of query.data) {
            if (!vectorsUnion.find((item) => item.name == vector.name)) {
                vectorsUnion.push(vector);
            }
        }
    }

    const newSelectedVectorNames = [];
    for (const vector of selectedVectorNames) {
        if (
            vectorsUnion.some((item) => {
                return item.name === vector;
            })
        ) {
            newSelectedVectorNames.push(vector);
        }
    }
    if (!isEqual(selectedVectorNames, newSelectedVectorNames)) {
        setSelectedVectorNames(newSelectedVectorNames);
    }

    if (!isEqual(ensembleSet, previousEnsembleSet)) {
        // TODO:
        // Handle change of ensembleSet-> validity of ensemble selection and vector selection

        setPreviousEnsembleSet(ensembleSet);
    }

    React.useEffect(
        function propagateVectorSpecsToView() {
            // Only add vector specs for valid ensemble/vector combination
            // const ensemblesVectorDescriptionHelper = new EnsembleVectorDescriptionHelper(
            //     selectedEnsembleIdents,
            //     vectorsQueries
            // );

            // const newVectorSpecifications: VectorSpec[] = [];
            // for (const ensemble of selectedEnsembleIdents) {
            //     for (const vector of selectedVectorNames) {
            //         if (!ensemblesVectorDescriptionHelper.isVectorInEnsemble(ensemble, vector)) {
            //             return;
            //         }

            //         newVectorSpecifications.push({ ensembleIdent: ensemble, vectorName: vector });
            //     }
            // }

            const ensembleVectorDescriptionMap = createEnsembleIdentAndVectorDescriptionMap(
                selectedEnsembleIdents,
                vectorsQueries
            );
            const newVectorSpecifications: VectorSpec[] = [];
            for (const ensemble of selectedEnsembleIdents) {
                for (const vector of selectedVectorNames) {
                    if (!isEnsembleAndVectorInMap(ensembleVectorDescriptionMap, ensemble, vector)) {
                        return;
                    }

                    newVectorSpecifications.push({ ensembleIdent: ensemble, vectorName: vector });
                }
            }

            setVectorSpecifications(newVectorSpecifications);
        },
        [selectedEnsembleIdents, selectedVectorNames]
    );

    function handleEnsembleSelectChange(ensembleIdentArr: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdentArr);
    }

    function handleVectorSelectChange(vectors: string[]) {
        setSelectedVectorNames(vectors);
    }

    function handleFrequencySelectionChange(frequency: string) {
        setResamplingFrequency(frequency as Frequency_api);
    }

    return (
        <>
            <Label text="Group By">
                <RadioGroup
                    value={groupBy}
                    options={Object.values(GroupBy).map((val: GroupBy) => {
                        return { value: val, label: GroupByEnumToStringMapping[val] };
                    })}
                    onChange={(_e, value) => {
                        setGroupBy(value as GroupBy);
                    }}
                />
            </Label>
            <Label text="Ensemble">
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdents}
                    size={5}
                    onChange={handleEnsembleSelectChange}
                />
            </Label>
            {/* <Label text="Vectors">
                <VectorSelector
                    data={[]}
                    customVectorDefinitions={undefined}
                    placeholder="Add new vector..."
                    maxNumSelectedNodes={50}
                />
            </Label> */}
            <Label text="Vector Old">
                <Select
                    options={vectorsUnion.map((vector) => {
                        return { value: vector.name, label: vector.name };
                    })}
                    multiple={true}
                    value={selectedVectorNames}
                    onChange={handleVectorSelectChange}
                    filter={true}
                    size={5}
                />
            </Label>
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyDropdownOptions()}
                    value={resampleFrequency ?? makeFrequencyDropdownOptions()[0].value}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>
        </>
    );
}
