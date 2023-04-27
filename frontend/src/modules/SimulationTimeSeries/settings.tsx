import React from "react";

import { Frequency, VectorDescription } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { sortBy, sortedUniq } from "lodash";

import { useVectorsQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    console.log("render SimulationTimeSeries settings");

    const ensembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const [selectedVectorName, setSelectedVectorName] = React.useState<string>("");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [showStatistics, setShowStatistics] = moduleContext.useStoreState("showStatistics");

    const firstEnsemble = ensembles?.at(0) ?? null;
    const vectorsQuery = useVectorsQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName);

    const computedVectorName = fixupVectorName(selectedVectorName, vectorsQuery.data);

    if (computedVectorName && computedVectorName !== selectedVectorName) {
        setSelectedVectorName(computedVectorName);
    }

    React.useEffect(
        function propagateVectorSpecToView() {
            if (firstEnsemble && computedVectorName) {
                moduleContext.getStateStore().setValue("vectorSpec", {
                    caseUuid: firstEnsemble.caseUuid,
                    caseName: firstEnsemble.caseName,
                    ensembleName: firstEnsemble.ensembleName,
                    vectorName: computedVectorName,
                });
            } else {
                moduleContext.getStateStore().setValue("vectorSpec", null);
            }
        },
        [firstEnsemble, computedVectorName]
    );

    function handleVectorSelectionChange(selectedVecNames: string[]) {
        console.log("handleVectorSelectionChange()");
        const newName = selectedVecNames[0] ?? "";
        setSelectedVectorName(newName);
    }

    function handleFrequencySelectionChange(newFreqStr: string) {
        console.log(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}`);
        let newFreq: Frequency | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency;
        }
        console.log(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}  newFreq=${newFreq}`);
        setResamplingFrequency(newFreq);
    }

    function handleShowStatisticsCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleShowStatisticsCheckboxChange() " + event.target.checked);
        setShowStatistics(event.target.checked);
    }

    function handleRealizationRangeTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleRealizationRangeTextChanged() " + event.target.value);
        const rangeArr = parseRealizationRangeString(event.target.value, 200);
        console.log(rangeArr);
        moduleContext.getStateStore().setValue("realizationsToInclude", rangeArr.length > 0 ? rangeArr : null);
    }

    return (
        <>
            <ApiStateWrapper
                apiResult={vectorsQuery}
                errorComponent={"Error loading vector names"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Vector">
                    <Select
                        options={makeVectorOptionItems(vectorsQuery.data)}
                        value={computedVectorName ? [computedVectorName] : []}
                        onChange={handleVectorSelectionChange}
                        filter={true}
                        size={5}
                    />
                </Label>
            </ApiStateWrapper>
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyOptionItems()}
                    value={resampleFrequency ?? "RAW"}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>
            <Checkbox label="Show statistics" checked={showStatistics} onChange={handleShowStatisticsCheckboxChange} />
            <Label text="Realizations">
                <Input onChange={handleRealizationRangeTextChanged} />
            </Label>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function fixupVectorName(currVectorName: string, vectorDescriptionsArr: VectorDescription[] | undefined): string {
    if (!vectorDescriptionsArr || vectorDescriptionsArr.length === 0) {
        return "";
    }

    if (vectorDescriptionsArr.find((item) => item.name === currVectorName)) {
        return currVectorName;
    }

    return vectorDescriptionsArr[0].name;
}

function makeVectorOptionItems(vectorDescriptionsArr: VectorDescription[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (vectorDescriptionsArr) {
        for (const vec of vectorDescriptionsArr) {
            itemArr.push({ value: vec.name, label: vec.descriptive_name });
        }
    }
    return itemArr;
}

function makeFrequencyOptionItems(): DropdownOption[] {
    const itemArr: DropdownOption[] = [
        { value: Frequency.DAILY, label: "Daily" },
        { value: Frequency.MONTHLY, label: "Monthly" },
        { value: Frequency.QUARTERLY, label: "Quarterly" },
        { value: Frequency.YEARLY, label: "Yearly" },
        { value: "RAW", label: "None (raw)" },
    ];
    return itemArr;
}

// Parse page ranges into array of numbers
function parseRealizationRangeString(realRangeStr: string, maxLegalReal: number): number[] {
    const realArr: number[] = [];

    const rangeArr = realRangeStr.split(",");
    for (const aRange of rangeArr) {
        const rangeParts = aRange.split("-");
        if (rangeParts.length === 1) {
            const real = parseInt(rangeParts[0], 10);
            if (real >= 0 && real <= maxLegalReal) {
                realArr.push(real);
            }
        } else if (rangeParts.length === 2) {
            const startReal = parseInt(rangeParts[0], 10);
            const endReal = parseInt(rangeParts[1], 10);
            if (startReal >= 0 && startReal <= maxLegalReal && endReal >= startReal) {
                for (let i = startReal; i <= Math.min(endReal, maxLegalReal); i++) {
                    realArr.push(i);
                }
            }
        }
    }

    // Sort and remove duplicates
    return sortedUniq(sortBy(realArr));
}
