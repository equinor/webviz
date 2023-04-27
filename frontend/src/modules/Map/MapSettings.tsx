import React from "react";

import { StaticSurfaceDirectory } from "@api";
import { SurfaceStatisticFunction } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { useDynamicSurfaceDirectoryQuery, useStaticSurfaceDirectoryQuery } from "./MapQueryHooks";
import { MapState } from "./MapState";
import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { AggregationDropdown } from "./UiComponents";

//-----------------------------------------------------------------------------------------------------------
export function MapSettings({ moduleContext, workbenchServices }: ModuleFCProps<MapState>) {
    console.log("render MapSettings");

    const ensembles = useSubscribedValue("navigator.ensembles", workbenchServices);

    const [surfaceType, setSurfaceType] = React.useState<"static" | "dynamic">("dynamic");
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [selectedTimeOrInterval, setSelectedTimeOrInterval] = React.useState<string | null>(null);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction | null>(null);

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const firstEnsemble = ensembles?.at(0) ?? null;

    const dynamicSurfDirQuery = useDynamicSurfaceDirectoryQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName, surfaceType === "dynamic");
    const staticSurfDirQuery = useStaticSurfaceDirectoryQuery(firstEnsemble?.caseUuid, firstEnsemble?.ensembleName, surfaceType === "static");

    let computedSurfaceName: string | null = null;
    let computedSurfaceAttribute: string | null = null;
    let computedTimeOrInterval: string | null = null;
    if (surfaceType == "static" && staticSurfDirQuery.data) {
        computedSurfaceName = fixupStringValueFromList(selectedSurfaceName, staticSurfDirQuery.data.names);
        computedSurfaceAttribute = fixupStaticSurfAttribute(computedSurfaceName, selectedSurfaceAttribute, staticSurfDirQuery.data);
        computedTimeOrInterval = null;
    }
    if (surfaceType == "dynamic" && dynamicSurfDirQuery.data) {
        computedSurfaceName = fixupStringValueFromList(selectedSurfaceName, dynamicSurfDirQuery.data.names);
        computedSurfaceAttribute = fixupStringValueFromList(selectedSurfaceAttribute, dynamicSurfDirQuery.data.attributes);
        computedTimeOrInterval = fixupStringValueFromList(selectedTimeOrInterval, dynamicSurfDirQuery.data.time_or_interval_strings);
    }

    // Possibly update our surface selection states
    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }
    if (computedTimeOrInterval && computedTimeOrInterval !== selectedTimeOrInterval) {
        setSelectedTimeOrInterval(computedTimeOrInterval);
    }

    React.useEffect(function propagateSurfaceSelectionToView() {
        // console.log("propagateSurfaceSelectionToView()");
        // console.log(`  caseUuid=${caseUuid}`);
        // console.log(`  ensembleName=${ensembleName}`);
        // console.log(`  surfaceName=${surfaceName}`);
        // console.log(`  surfaceAttribute=${surfaceAttribute}`);
        // console.log(`  surfaceType=${surfaceType}`);
        // console.log(`  aggregation=${aggregation}`);
        // console.log(`  realizationNum=${realizationNum}`);
        // console.log(`  timeOrInterval=${timeOrInterval}`);

        let surfAddr: SurfAddr | null = null;
        if (firstEnsemble && computedSurfaceName && computedSurfaceAttribute) {
            const addrFactory = new SurfAddrFactory(
                firstEnsemble.caseUuid,
                firstEnsemble.ensembleName,
                computedSurfaceName,
                computedSurfaceAttribute
            );
            if (surfaceType === "dynamic" && computedTimeOrInterval) {
                if (aggregation === null) {
                    surfAddr = addrFactory.createDynamicAddr(realizationNum, computedTimeOrInterval);
                } else {
                    surfAddr = addrFactory.createStatisticalDynamicAddr(aggregation, computedTimeOrInterval);
                }
            } else if (surfaceType === "static") {
                if (aggregation === null) {
                    surfAddr = addrFactory.createStaticAddr(realizationNum);
                } else {
                    surfAddr = addrFactory.createStatisticalStaticAddr(aggregation);
                }
            }
        }

        console.log(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
        moduleContext.getStateStore().setValue("surfaceAddress", surfAddr);
    });

    function handleStaticSurfacesCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, staticChecked: boolean) {
        const newSurfType = staticChecked ? "static" : "dynamic";
        setSurfaceType(newSurfType);
    }

    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        console.log("handleSurfNameSelectionChange()");
        const newName = selectedSurfNames[0] ?? null;
        setSelectedSurfaceName(newName);
    }

    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        console.log("handleSurfAttributeSelectionChange()");
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
    }

    function handleTimeOrIntervalSelectionChange(selectedTimeOrIntervals: string[]) {
        console.log("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedTimeOrIntervals[0] ?? null;
        setSelectedTimeOrInterval(newTimeOrInterval);
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

    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    let timeOrIntervalOptions: SelectOption[] = [];

    if (surfaceType == "static" && staticSurfDirQuery.data) {
        const validAttrNames = getValidAttributesForSurfName(computedSurfaceName ?? "", staticSurfDirQuery.data);
        surfNameOptions = staticSurfDirQuery.data.names.map((name) => ({ value: name, label: name }));
        surfAttributeOptions = validAttrNames.map((attr) => ({ value: attr, label: attr }));
    } else if (surfaceType == "dynamic" && dynamicSurfDirQuery.data) {
        surfNameOptions = dynamicSurfDirQuery.data.names.map((name) => ({ value: name, label: name }));
        surfAttributeOptions = dynamicSurfDirQuery.data.attributes.map((attr) => ({ value: attr, label: attr }));
        timeOrIntervalOptions = dynamicSurfDirQuery.data.time_or_interval_strings.map((time) => ({ value: time, label: time }));
    }

    let chooseTimeOrIntervalElement: JSX.Element | null = null;
    if (surfaceType === "dynamic") {
        chooseTimeOrIntervalElement = (
            <Label text="Time or interval:">
                <Select
                    options={timeOrIntervalOptions}
                    value={computedTimeOrInterval ? [computedTimeOrInterval] : []}
                    onChange={handleTimeOrIntervalSelectionChange}
                    size={5}
                />
            </Label>
        );
    }

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <Label text="Realization:">
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </Label>
        );
    }

    const activeSurfDirQuery = surfaceType == "static" ? staticSurfDirQuery : dynamicSurfDirQuery;

    return (
        <>
            <Checkbox
                label="Static surfaces"
                checked={surfaceType === "static"}
                onChange={handleStaticSurfacesCheckboxChanged}
            />
            <ApiStateWrapper
                apiResult={activeSurfDirQuery}
                errorComponent={"Error loading surface directory"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Surface name:">
                    <Select
                        options={surfNameOptions}
                        value={computedSurfaceName ? [computedSurfaceName] : []}
                        onChange={handleSurfNameSelectionChange}
                        size={5}
                    />
                </Label>
                <Label text="Surface attribute:">
                    <Select
                        options={surfAttributeOptions}
                        value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                        onChange={handleSurfAttributeSelectionChange}
                        size={5}
                    />
                </Label>
                {chooseTimeOrIntervalElement}
            </ApiStateWrapper>
            <AggregationDropdown
                selectedAggregation={aggregation}
                onAggregationSelectionChange={handleAggregationChanged}
            />
            {chooseRealizationElement}
            <div>({renderCount.current})</div>
        </>
    );
}

// Helpers
// -------------------------------------------------------------------------------------
function getValidAttributesForSurfName(surfName: string, surfDir: StaticSurfaceDirectory): string[] {
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
    const validAttrNames = getValidAttributesForSurfName(surfName, surfDir);
    if (validAttrNames.length == 0) {
        return null;
    }

    if (currAttribute && validAttrNames.includes(currAttribute)) {
        return currAttribute;
    }

    return validAttrNames[0];
}
