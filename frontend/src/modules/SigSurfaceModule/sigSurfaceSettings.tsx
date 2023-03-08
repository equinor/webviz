import React from "react";
import { UseQueryResult } from "react-query";

import { Ensemble } from "@api";
import { DynamicSurfaceDirectory, StaticSurfaceDirectory } from "@api";
import { SurfaceStatisticFunction } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Input } from "@lib/components/Input";
import { ListBox, ListBoxItem } from "@lib/components/ListBox/list-box";
import { Select } from "@lib/components/Select";
import { ToggleButton } from "@lib/components/ToggleButton";

import { useEnsemblesQuery } from "./sigSurfaceQueryHooks";
import { useDynamicSurfaceDirectoryQuery, useStaticSurfaceDirectoryQuery } from "./sigSurfaceQueryHooks";
import { SigSurfaceState } from "./sigSurfaceState";

//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceSettings({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    console.log("render SigSurfaceSettings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const [surfaceType, setSurfaceType] = moduleContext.useStoreState("surfaceType");
    const [surfaceName, setSurfaceName] = moduleContext.useStoreState("surfaceName");
    const [surfaceAttribute, setSurfaceAttribute] = moduleContext.useStoreState("surfaceAttribute");
    const [realizationNum, setRealizationNum] = moduleContext.useStoreState("realizationNum");
    const [timeOrInterval, setTimeOrInterval] = moduleContext.useStoreState("timeOrInterval");
    const [aggregation, setAggregation] = moduleContext.useStoreState("aggregation");

    const stashedEnsembleName = React.useRef("");

    const ensemblesQuery = useEnsemblesQuery(caseUuid);
    const dynamicSurfDirQuery = useDynamicSurfaceDirectoryQuery(caseUuid, ensembleName, true);
    const staticSurfDirQuery = useStaticSurfaceDirectoryQuery(caseUuid, ensembleName, true);

    React.useEffect(
        function fixEnsembleSelectionOnNewEnsemblesList() {
            console.log(`fixEnsembleSelectionOnNewEnsemblesList(), data ${ensemblesQuery.data ? "yes" : "no"}`);
            if (ensemblesQuery.data) {
                const candidateName = ensembleName ?? stashedEnsembleName.current;
                setEnsembleName(fixupEnsembleName(candidateName, ensemblesQuery.data));
            } else {
                stashedEnsembleName.current = ensembleName ?? "";
                setEnsembleName(null);
            }
        },
        [ensemblesQuery.data]
    );

    React.useEffect(
        function fixSurfaceSelectionOnNewStaticSurfaceDir() {
            console.log(
                `fixSurfaceSelectionOnNewStaticSurfaceDir(), surfType=${surfaceType}, data ${
                    staticSurfDirQuery.data ? "yes" : "no"
                }`
            );
            if (surfaceType == "static") {
                fixAndSetStaticSurfaceSelectionStates(
                    surfaceName,
                    surfaceAttribute,
                    null,
                    staticSurfDirQuery.data ?? null
                );
            }
        },
        [staticSurfDirQuery.data]
    );

    React.useEffect(
        function fixSurfaceSelectionOnNewDynamicSurfaceDir() {
            console.log(
                `fixSurfaceSelectionOnNewDynamicSurfaceDir(), surfType=${surfaceType}, data ${
                    dynamicSurfDirQuery.data ? "yes" : "no"
                }`
            );
            if (surfaceType == "dynamic") {
                fixAndSetDynamicSurfaceSelectionStates(
                    surfaceName,
                    surfaceAttribute,
                    timeOrInterval,
                    dynamicSurfDirQuery.data ?? null
                );
            }
        },
        [dynamicSurfDirQuery.data]
    );

    function handleEnsembleSelectionChange(ensembleName: string) {
        console.log("handleEnsembleSelectionChange()");
        setEnsembleName(ensembleName);
    }

    function fixAndSetDynamicSurfaceSelectionStates(
        surfName: string | null,
        surfAttribute: string | null,
        time_or_interval: string | null,
        surfDir: DynamicSurfaceDirectory | null
    ) {
        if (!surfDir) {
            setSurfaceName(null);
            setSurfaceAttribute(null);
            setTimeOrInterval(null);
            return;
        }
        setSurfaceName(fixupStringValueFromList(surfName, surfDir.names));
        setSurfaceAttribute(fixupStringValueFromList(surfAttribute, surfDir.attributes));
        setTimeOrInterval(fixupStringValueFromList(time_or_interval, surfDir.time_or_interval_strings));
    }

    function fixAndSetStaticSurfaceSelectionStates(
        surfName: string | null,
        surfAttribute: string | null,
        time_or_interval: string | null,
        surfDir: StaticSurfaceDirectory | null
    ) {
        if (!surfDir) {
            setSurfaceName(null);
            setSurfaceAttribute(null);
            setTimeOrInterval(null);
            return;
        }

        const newSurfName = fixupStringValueFromList(surfName, surfDir.names);
        const validAttrNames = getValidAttributesForSurfaceName(newSurfName ?? "", surfDir);
        const newAttrName = fixupStringValueFromList(surfAttribute, validAttrNames);
        setSurfaceName(newSurfName);
        setSurfaceAttribute(newAttrName);
        setTimeOrInterval(null);
    }

    function handleStaticSurfacesToggle(staticSurfActive: boolean) {
        const newSurfType = staticSurfActive ? "static" : "dynamic";
        setSurfaceType(newSurfType);
        if (newSurfType == "static") {
            fixAndSetStaticSurfaceSelectionStates(surfaceName, surfaceAttribute, null, staticSurfDirQuery.data ?? null);
        } else {
            fixAndSetDynamicSurfaceSelectionStates(
                surfaceName,
                surfaceAttribute,
                timeOrInterval,
                dynamicSurfDirQuery.data ?? null
            );
        }
    }

    function handleSurfNameSelectionChange(surfName: string) {
        console.log("handleSurfNameSelectionChange()");
        setSurfaceName(surfName);
        if (surfaceType == "static" && staticSurfDirQuery.data) {
            setSurfaceAttribute(fixupStaticSurfAttribute(surfName, surfaceAttribute, staticSurfDirQuery.data));
        }
    }

    function handleSurfAttributeSelectionChange(attributeName: string) {
        console.log("handleSurfAttributeSelectionChange()");
        setSurfaceAttribute(attributeName);
    }

    function handleTimeOrIntervalSelectionChange(timeOrInterval: string) {
        console.log("handleTimeOrIntervalSelectionChange()");
        setTimeOrInterval(timeOrInterval);
    }

    function handleAggregationChanged(aggregation: SurfaceStatisticFunction | null) {
        console.log("handleAggregationChanged()");
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.log("handleRealizationTextChanged() " + event.target.value);
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }

    type SelectItemType = { value: string; label: string };
    let surfNameOptions: SelectItemType[] = [];
    let surfAttributeOptions: SelectItemType[] = [];
    let timeOrIntervalOptions: SelectItemType[] = [];

    if (surfaceType == "static") {
        if (staticSurfDirQuery.data) {
            const validAttrNames = getValidAttributesForSurfaceName(surfaceName ?? "", staticSurfDirQuery.data);
            surfNameOptions = staticSurfDirQuery.data.names.map((name) => ({ value: name, label: name }));
            surfAttributeOptions = validAttrNames.map((attr) => ({ value: attr, label: attr }));
        }
    } else if (surfaceType == "dynamic") {
        surfNameOptions = dynamicSurfDirQuery.data?.names.map((name) => ({ value: name, label: name })) ?? [];
        surfAttributeOptions = dynamicSurfDirQuery.data?.attributes.map((attr) => ({ value: attr, label: attr })) ?? [];
        timeOrIntervalOptions =
            dynamicSurfDirQuery.data?.time_or_interval_strings.map((time) => ({ value: time, label: time })) ?? [];
    }

    let chooseTimeOrIntervalElements: JSX.Element | null = null;
    if (surfaceType === "dynamic") {
        chooseTimeOrIntervalElements = (
            <>
                <label>Time or interval:</label>
                <Select
                    options={timeOrIntervalOptions}
                    value={timeOrInterval ?? ""}
                    onChange={handleTimeOrIntervalSelectionChange}
                    size={5}
                />
            </>
        );
    }

    return (
        <>
            <label>Ensemble:</label>
            <EnsemblesDropdown
                ensemblesQuery={ensemblesQuery}
                selectedEnsemble={ensembleName}
                onEnsembleSelectionChange={handleEnsembleSelectionChange}
            />
            <ToggleButton active={surfaceType == "static"} onToggle={handleStaticSurfacesToggle}>
                Static surfaces
            </ToggleButton>
            <label>Surface name:</label>
            <Select
                options={surfNameOptions}
                value={surfaceName ?? ""}
                onChange={handleSurfNameSelectionChange}
                size={5}
            />
            <label>Surface attribute:</label>
            <Select
                options={surfAttributeOptions}
                value={surfaceAttribute ?? ""}
                onChange={handleSurfAttributeSelectionChange}
                size={5}
            />
            {chooseTimeOrIntervalElements}
            <br />
            <label>Aggregation/statistic:</label>
            <AggregationDropdown
                selectedAggregation={aggregation}
                onAggregationSelectionChange={handleAggregationChanged}
            />
            <label>
                Realizations:
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </label>
        </>
    );
}

// Sub-component for ensemble selection
// -------------------------------------------------------------------------------------
type EnsemblesDropdownProps = {
    ensemblesQuery: UseQueryResult<Ensemble[]>;
    selectedEnsemble: string | null;
    onEnsembleSelectionChange: (ensembleName: string) => void;
};

const EnsemblesDropdown = ({ ensemblesQuery, selectedEnsemble, onEnsembleSelectionChange }: EnsemblesDropdownProps) => {
    const itemArr: ListBoxItem[] = [];

    if (ensemblesQuery.isSuccess && ensemblesQuery.data.length > 0) {
        for (const ens of ensemblesQuery.data) {
            itemArr.push({ value: ens.name, label: ens.name });
        }
    } else {
        let placeholderStr = "<no ensembles>";
        if (ensemblesQuery.isError || ensemblesQuery.isLoading) {
            placeholderStr = `${ensemblesQuery.status.toString()}...`;
        }

        itemArr.push({ value: "", label: placeholderStr, disabled: true });
        selectedEnsemble = "";
    }

    console.log("render EnsemblesDropdown - selectedEnsemble=" + selectedEnsemble);

    return <ListBox items={itemArr} selectedItem={selectedEnsemble ?? ""} onSelect={onEnsembleSelectionChange} />;
};

// Sub-component for aggregation/statistic selection
// -------------------------------------------------------------------------------------
type AggregationDropdownProps = {
    selectedAggregation: SurfaceStatisticFunction | null;
    onAggregationSelectionChange: (aggregation: SurfaceStatisticFunction | null) => void;
};

const AggregationDropdown = ({ selectedAggregation, onAggregationSelectionChange }: AggregationDropdownProps) => {
    const itemArr: ListBoxItem[] = [
        { value: "SINGLE_REAL", label: "Single realization" },
        { value: SurfaceStatisticFunction.MEAN, label: "Mean" },
        { value: SurfaceStatisticFunction.STD, label: "Std" },
        { value: SurfaceStatisticFunction.MIN, label: "Min" },
        { value: SurfaceStatisticFunction.MAX, label: "Max" },
        { value: SurfaceStatisticFunction.P10, label: "P10" },
        { value: SurfaceStatisticFunction.P90, label: "P90" },
        { value: SurfaceStatisticFunction.P50, label: "P50" },
    ];

    return (
        <ListBox
            items={itemArr}
            selectedItem={selectedAggregation ?? "SINGLE_REAL"}
            onSelect={(newVal: string) =>
                onAggregationSelectionChange(newVal != "SINGLE_REAL" ? (newVal as SurfaceStatisticFunction) : null)
            }
        />
    );
};

// Helpers
// -------------------------------------------------------------------------------------
function fixupEnsembleName(currEnsembleName: string | null, ensemblesArr: Ensemble[] | null): string | null {
    const ensembleNames = ensemblesArr ? ensemblesArr.map((item) => item.name) : [];
    if (currEnsembleName && ensembleNames.includes(currEnsembleName)) {
        return currEnsembleName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return null;
}

function getValidAttributesForSurfaceName(surfName: string, surfDir: StaticSurfaceDirectory): string[] {
    const idxOfSurfName = surfDir.names.indexOf(surfName);
    if (idxOfSurfName == -1) {
        return [];
    }

    const attrIndices = surfDir.valid_attributes_for_name[idxOfSurfName];
    const attrNames: string[] = [];
    for (const idx of attrIndices) {
        attrNames.push(surfDir.attributes[idx]);
    }

    return attrNames;
}

function fixupStringValueFromList(currValue: string | null, legalValues: string[] | null): string | null {
    if (!legalValues || legalValues.length == 0) {
        return null;
    }
    if (currValue && legalValues.includes(currValue)) {
        return currValue;
    }

    return legalValues[0];
}

function fixupStaticSurfAttribute(
    surfName: string | null,
    currAttribute: string | null,
    surfDir: StaticSurfaceDirectory
): string | null {
    if (!surfName) {
        return null;
    }
    const validAttrNames = getValidAttributesForSurfaceName(surfName, surfDir);
    if (validAttrNames.length == 0) {
        return null;
    }

    if (currAttribute && validAttrNames.includes(currAttribute)) {
        return currAttribute;
    }

    return validAttrNames[0];
}
