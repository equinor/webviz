import React from "react";

import { Ensemble } from "@api";
import { DynamicSurfaceDirectory, StaticSurfaceDirectory } from "@api";
import { SurfaceStatisticFunction } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { Select } from "@lib/components/Select";

import { SurfAddr, SurfAddrFactory } from "./sigSurfaceAddress";
import { useEnsemblesQuery } from "./sigSurfaceQueryHooks";
import { useDynamicSurfaceDirectoryQuery, useStaticSurfaceDirectoryQuery } from "./sigSurfaceQueryHooks";
import { SigSurfaceState } from "./sigSurfaceState";
import { AggregationDropdown, EnsemblesDropdown } from "./sigSurfaceUiComponents";

//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceSettings({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    console.log("render SigSurfaceSettings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = React.useState<string | null>(null);
    const [surfaceType, setSurfaceType] = React.useState<"static" | "dynamic">("dynamic");
    const [surfaceName, setSurfaceName] = React.useState<string | null>(null);
    const [surfaceAttribute, setSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState(0);
    const [timeOrInterval, setTimeOrInterval] = React.useState<string | null>(null);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction | null>(null);

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
        if (caseUuid && ensembleName && surfaceName && surfaceAttribute) {
            const addrFactory = new SurfAddrFactory(caseUuid, ensembleName, surfaceName, surfaceAttribute);
            if (surfaceType === "dynamic" && timeOrInterval) {
                if (aggregation === null) {
                    surfAddr = addrFactory.createDynamicAddr(realizationNum, timeOrInterval);
                } else {
                    surfAddr = addrFactory.createStatisticalDynamicAddr(aggregation, timeOrInterval);
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
        moduleContext.stateStore.setValue("surfaceAddress", surfAddr);
    });

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

    function handleStaticSurfacesCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, staticChecked: boolean) {
        const newSurfType = staticChecked ? "static" : "dynamic";
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

    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        console.log("handleSurfNameSelectionChange()");
        const newName = selectedSurfNames.length > 0 ? selectedSurfNames[0] : null;
        setSurfaceName(newName);
        if (surfaceType == "static" && staticSurfDirQuery.data) {
            setSurfaceAttribute(fixupStaticSurfAttribute(newName, surfaceAttribute, staticSurfDirQuery.data));
        }
    }

    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        console.log("handleSurfAttributeSelectionChange()");
        const newAttr = selectedSurfAttributes.length > 0 ? selectedSurfAttributes[0] : null;
        setSurfaceAttribute(newAttr);
    }

    function handleTimeOrIntervalSelectionChange(selectedTimeOrIntervals: string[]) {
        console.log("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedTimeOrIntervals.length > 0 ? selectedTimeOrIntervals[0] : null;
        setTimeOrInterval(newTimeOrInterval);
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

    let chooseTimeOrIntervalElement: JSX.Element | null = null;
    if (surfaceType === "dynamic") {
        chooseTimeOrIntervalElement = (
            <label>
                Time or interval:
                <Select
                    options={timeOrIntervalOptions}
                    value={timeOrInterval ? [timeOrInterval] : []}
                    onChange={handleTimeOrIntervalSelectionChange}
                    size={5}
                />
            </label>
        );
    }

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <label>
                Realization:
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </label>
        );
    }

    return (
        <>
            <EnsemblesDropdown
                ensemblesQuery={ensemblesQuery}
                selectedEnsemble={ensembleName}
                onEnsembleSelectionChange={handleEnsembleSelectionChange}
            />
            <Checkbox
                label="Static surfaces"
                checked={surfaceType === "static"}
                onChange={handleStaticSurfacesCheckboxChanged}
            />
            <label>
                Surface name:
                <Select
                    options={surfNameOptions}
                    value={surfaceName ? [surfaceName] : []}
                    onChange={handleSurfNameSelectionChange}
                    size={5}
                />
            </label>
            <label>
                Surface attribute:
                <Select
                    options={surfAttributeOptions}
                    value={surfaceAttribute ? [surfaceAttribute] : []}
                    onChange={handleSurfAttributeSelectionChange}
                    size={5}
                />
            </label>
            {chooseTimeOrIntervalElement}
            <AggregationDropdown
                selectedAggregation={aggregation}
                onAggregationSelectionChange={handleAggregationChanged}
            />
            {chooseRealizationElement}
        </>
    );
}

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
