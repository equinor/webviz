import React from "react";

import { DynamicSurfaceDirectory_api, StaticSurfaceDirectory_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { useDynamicSurfaceDirectoryQuery, useStaticSurfaceDirectoryQuery } from "./MapQueryHooks";
import { MapState } from "./MapState";
import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { AggregationDropdown } from "./UiComponents";

//-----------------------------------------------------------------------------------------------------------
export function MapSettings(props: ModuleFCProps<MapState>) {
    const myInstanceIdStr = props.moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render MapSettings`);

    const availableEnsembles = useSubscribedValue("navigator.ensembles", props.workbenchServices);
    const [selectedEnsemble, setSelectedEnsemble] = React.useState<Ensemble | null>(null);

    const [surfaceType, setSurfaceType] = React.useState<"static" | "dynamic">("dynamic");
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [selectedTimeOrInterval, setSelectedTimeOrInterval] = React.useState<string | null>(null);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);

    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSurface = syncHelper.useValue(SyncSettingKey.SURFACE, "global.syncValue.surface");
    const syncedValueDate = syncHelper.useValue(SyncSettingKey.DATE, "global.syncValue.date");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    let candidateEnsemble = selectedEnsemble;
    if (syncedValueEnsembles?.length) {
        candidateEnsemble = syncedValueEnsembles[0];
    }
    const computedEnsemble = fixupEnsemble(candidateEnsemble, availableEnsembles);

    const dynamicSurfDirQuery = useDynamicSurfaceDirectoryQuery(
        computedEnsemble?.caseUuid,
        computedEnsemble?.ensembleName,
        surfaceType === "dynamic"
    );
    const staticSurfDirQuery = useStaticSurfaceDirectoryQuery(
        computedEnsemble?.caseUuid,
        computedEnsemble?.ensembleName,
        surfaceType === "static"
    );

    let computedSurfaceName: string | null = null;
    let computedSurfaceAttribute: string | null = null;
    let computedTimeOrInterval: string | null = null;
    if (surfaceType == "static" && staticSurfDirQuery.data) {
        computedSurfaceName = fixupStringValueFromList(selectedSurfaceName, staticSurfDirQuery.data.names);
        computedSurfaceAttribute = fixupStaticSurfAttribute(
            computedSurfaceName,
            selectedSurfaceAttribute,
            staticSurfDirQuery.data
        );
        computedTimeOrInterval = null;

        if (syncedValueSurface) {
            if (isValidStaticSurf(syncedValueSurface.name, syncedValueSurface.attribute, staticSurfDirQuery.data)) {
                computedSurfaceName = syncedValueSurface.name;
                computedSurfaceAttribute = syncedValueSurface.attribute;
            }
        }
    }
    if (surfaceType == "dynamic" && dynamicSurfDirQuery.data) {
        computedSurfaceName = fixupStringValueFromList(selectedSurfaceName, dynamicSurfDirQuery.data.names);
        computedSurfaceAttribute = fixupStringValueFromList(
            selectedSurfaceAttribute,
            dynamicSurfDirQuery.data.attributes
        );
        computedTimeOrInterval = fixupStringValueFromList(
            selectedTimeOrInterval,
            dynamicSurfDirQuery.data.time_or_interval_strings
        );

        if (syncedValueSurface) {
            if (isValidDynamicSurf(syncedValueSurface.name, syncedValueSurface.attribute, dynamicSurfDirQuery.data)) {
                computedSurfaceName = syncedValueSurface.name;
                computedSurfaceAttribute = syncedValueSurface.attribute;
            }
        }
        if (syncedValueDate) {
            if (isValidDynamicSurfTimeOrInterval(syncedValueDate.timeOrInterval, dynamicSurfDirQuery.data)) {
                computedTimeOrInterval = syncedValueDate.timeOrInterval;
            }
        }
    }

    if (computedEnsemble && computedEnsemble !== selectedEnsemble) {
        setSelectedEnsemble(computedEnsemble);
    }
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
        // console.debug("propagateSurfaceSelectionToView()");
        // console.debug(`  caseUuid=${caseUuid}`);
        // console.debug(`  ensembleName=${ensembleName}`);
        // console.debug(`  surfaceName=${surfaceName}`);
        // console.debug(`  surfaceAttribute=${surfaceAttribute}`);
        // console.debug(`  surfaceType=${surfaceType}`);
        // console.debug(`  aggregation=${aggregation}`);
        // console.debug(`  realizationNum=${realizationNum}`);
        // console.debug(`  timeOrInterval=${timeOrInterval}`);

        let surfAddr: SurfAddr | null = null;
        if (computedEnsemble && computedSurfaceName && computedSurfaceAttribute) {
            const addrFactory = new SurfAddrFactory(
                computedEnsemble.caseUuid,
                computedEnsemble.ensembleName,
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

        console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
        props.moduleContext.getStateStore().setValue("surfaceAddress", surfAddr);
    });

    function handleEnsembleSelectionChange(selectedEnsembleIdStr: string) {
        console.debug("handleEnsembleSelectionChange()");
        const newEnsemble = availableEnsembles?.find((item) => encodeEnsembleAsIdStr(item) === selectedEnsembleIdStr);
        setSelectedEnsemble(newEnsemble ?? null);
        if (newEnsemble) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsemble]);
        }
    }

    function handleStaticSurfacesCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, staticChecked: boolean) {
        const newSurfType = staticChecked ? "static" : "dynamic";
        setSurfaceType(newSurfType);
    }

    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        console.debug("handleSurfNameSelectionChange()");
        const newName = selectedSurfNames[0] ?? null;
        setSelectedSurfaceName(newName);
        if (newName && computedSurfaceAttribute) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: newName,
                attribute: computedSurfaceAttribute,
            });
        }
    }

    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        console.debug("handleSurfAttributeSelectionChange()");
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
        if (newAttr && computedSurfaceName) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: computedSurfaceName,
                attribute: newAttr,
            });
        }
    }

    function handleTimeOrIntervalSelectionChange(selectedTimeOrIntervals: string[]) {
        console.debug("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedTimeOrIntervals[0] ?? null;
        setSelectedTimeOrInterval(newTimeOrInterval);
        if (newTimeOrInterval) {
            syncHelper.publishValue(SyncSettingKey.DATE, "global.syncValue.date", {
                timeOrInterval: newTimeOrInterval,
            });
        }
    }

    function handleAggregationChanged(aggregation: SurfaceStatisticFunction_api | null) {
        console.debug("handleAggregationChanged()");
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.debug("handleRealizationTextChanged() " + event.target.value);
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
        timeOrIntervalOptions = dynamicSurfDirQuery.data.time_or_interval_strings.map((time) => ({
            value: time,
            label: time,
        }));
    }

    let chooseTimeOrIntervalElement: JSX.Element | null = null;
    if (surfaceType === "dynamic") {
        chooseTimeOrIntervalElement = (
            <Label
                text="Time or interval:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.DATE) ? "bg-indigo-700 text-white" : ""}
            >
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
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <Dropdown
                    options={makeEnsembleOptionItems(availableEnsembles)}
                    value={computedEnsemble ? encodeEnsembleAsIdStr(computedEnsemble) : undefined}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
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
                <Label
                    text="Surface name:"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={surfNameOptions}
                        value={computedSurfaceName ? [computedSurfaceName] : []}
                        onChange={handleSurfNameSelectionChange}
                        size={5}
                    />
                </Label>
                <Label
                    text="Surface attribute:"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
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
function fixupEnsemble(currEnsemble: Ensemble | null, availableEnsemblesArr: Ensemble[] | null): Ensemble | null {
    if (!availableEnsemblesArr || availableEnsemblesArr.length === 0) {
        return null;
    }

    if (currEnsemble) {
        const foundItem = availableEnsemblesArr.find(
            (item) => item.caseUuid === currEnsemble.caseUuid && item.ensembleName == currEnsemble.ensembleName
        );
        if (foundItem) {
            return foundItem;
        }
    }

    return availableEnsemblesArr[0];
}

function encodeEnsembleAsIdStr(ensemble: Ensemble): string {
    return `${ensemble.caseUuid}::${ensemble.ensembleName}`;
}

function makeEnsembleOptionItems(ensemblesArr: Ensemble[] | null): DropdownOption[] {
    const itemArr: DropdownOption[] = [];
    if (ensemblesArr) {
        for (const ens of ensemblesArr) {
            itemArr.push({ value: encodeEnsembleAsIdStr(ens), label: `${ens.ensembleName} (${ens.caseName})` });
        }
    }
    return itemArr;
}

function getValidAttributesForSurfName(surfName: string, surfDir: StaticSurfaceDirectory_api): string[] {
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
    surfDir: StaticSurfaceDirectory_api
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

function isValidStaticSurf(
    surfName: string | null,
    surfAttribute: string | null,
    surfDir: StaticSurfaceDirectory_api
): boolean {
    if (!surfName || !surfAttribute) {
        return false;
    }

    const validAttrNames = getValidAttributesForSurfName(surfName, surfDir);
    if (validAttrNames.length == 0) {
        return false;
    }

    if (!validAttrNames.includes(surfAttribute)) {
        return false;
    }

    return true;
}

function isValidDynamicSurf(
    surfName: string | null,
    surfAttribute: string | null,
    surfDir: DynamicSurfaceDirectory_api
): boolean {
    if (!surfName || !surfAttribute) {
        return false;
    }

    if (!surfDir.names.includes(surfName)) {
        return false;
    }
    if (!surfDir.attributes.includes(surfAttribute)) {
        return false;
    }

    return true;
}

function isValidDynamicSurfTimeOrInterval(timeOrInterval: string | null, surfDir: DynamicSurfaceDirectory_api): boolean {
    if (!timeOrInterval || !surfDir) {
        return false;
    }

    if (!surfDir.time_or_interval_strings.includes(timeOrInterval)) {
        return false;
    }

    return true;
}
