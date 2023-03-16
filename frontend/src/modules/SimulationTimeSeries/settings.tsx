import React from "react";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { ModuleFCProps } from "@framework/Module";
import { Frequency, VectorDescription } from "@api";
import { apiService } from "@framework/ApiService";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Input } from "@lib/components/Input";
import { ListBoxDeprecated, ListBoxItem } from "@lib/components/ListBox/list-box";

import { sortBy, sortedUniq } from "lodash";

import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    console.log("render Settings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const [vectorName, setVectorName] = moduleContext.useStoreState("vectorName");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [showStatistics, setShowStatistics] = moduleContext.useStoreState("showStatistics");

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", caseUuid],
        queryFn: () => apiService.explore.getEnsembles(caseUuid || ""),
        enabled: caseUuid ? true : false,
        onSuccess: function selectDefaultEnsemble(ensembleArr) {
            if (ensembleArr.length > 0) {
                setEnsembleName(ensembleArr[0].name);
            }
        },
    });

    const vectorsQuery = useQuery({
        queryKey: ["getVectorNamesAndDescriptions", caseUuid, ensembleName],
        queryFn: () => apiService.timeseries.getVectorNamesAndDescriptions(caseUuid ?? "", ensembleName ?? ""),
        enabled: caseUuid && ensembleName ? true : false,
        onSuccess: function selectDefaultVector(vectorArr) {
            console.log("selectDefaultVector()");
            if (vectorArr.length > 0) {
                setVectorName(vectorArr[vectorArr.length - 1].name);
            }
        },
        select: function capVectorArrayTo50Entries(vectorArr) {
            console.log("capVectorArrayTo50Entries()");
            return vectorArr.slice(0, 50);
        },
    });

    function makeVectorListItems(vectorsQuery: UseQueryResult<VectorDescription[]>): ListBoxItem[] {
        const itemArr: ListBoxItem[] = [];
        if (vectorsQuery.isSuccess && vectorsQuery.data.length > 0) {
            for (const vec of vectorsQuery.data) {
                itemArr.push({ value: vec.name, label: vec.descriptive_name });
            }
        } else {
            itemArr.push({ value: "", label: `${vectorsQuery.status.toString()}...`, disabled: true });
        }
        return itemArr;
    }

    function handleVectorSelectionChange(vecName: string) {
        console.log("handleVectorSelectionChange()");
        setVectorName(vecName);
    }

    function makeFrequencyListItems(): ListBoxItem[] {
        const itemArr: ListBoxItem[] = [
            { value: Frequency.DAILY, label: "Daily" },
            { value: Frequency.MONTHLY, label: "Monthly" },
            { value: Frequency.QUARTERLY, label: "Quarterly" },
            { value: Frequency.YEARLY, label: "Yearly" },
            { value: "RAW", label: "None (raw)" },
        ];
        return itemArr;
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
        moduleContext.stateStore.setValue("realizationsToInclude", rangeArr.length > 0 ? rangeArr : null);
    }

    return (
        <>
            <label>Vector:</label>
            <ListBoxDeprecated
                items={makeVectorListItems(vectorsQuery)}
                selectedItem={vectorName ?? ""}
                onSelect={handleVectorSelectionChange}
            />

            <br />
            <label>Frequency:</label>
            <ListBoxDeprecated
                items={makeFrequencyListItems()}
                selectedItem={resampleFrequency ?? "RAW"}
                onSelect={handleFrequencySelectionChange}
            />

            <br />
            <label>
                <input type="checkbox" checked={showStatistics} onChange={handleShowStatisticsCheckboxChange} />
                Show statistics
            </label>

            <br />
            <br />
            <label>
                Realizations:
                <Input onChange={handleRealizationRangeTextChanged} />
            </label>
        </>
    );
}

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

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