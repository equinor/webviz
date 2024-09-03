import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { FullSurfaceAddress, SurfaceAddressBuilder, SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import { useObservedSurfacesMetadataQuery, useRealizationSurfacesMetadataQuery } from "@modules/_shared/Surface";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useSetAtom } from "jotai";

import { surfaceAddressAtom } from "./atoms/baseAtoms";

import { AggregationDropdown } from "../UiComponents";
import { Interfaces } from "../interfaces";

const SurfaceTimeTypeEnumToStringMapping = {
    [SurfaceTimeType.None]: "Static",
    [SurfaceTimeType.TimePoint]: "Time point",
    [SurfaceTimeType.Interval]: "Time interval",
};
//-----------------------------------------------------------------------------------------------------------
export function MapSettings(props: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [timeType, setTimeType] = React.useState<SurfaceTimeType>(SurfaceTimeType.None);

    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [selectedTimeOrInterval, setSelectedTimeOrInterval] = React.useState<string | null>(null);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const [useObserved, toggleUseObserved] = React.useState(false);
    const setSurfaceAddress = useSetAtom(surfaceAddressAtom);
    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSurface = syncHelper.useValue(SyncSettingKey.SURFACE, "global.syncValue.surface");
    const syncedValueDate = syncHelper.useValue(SyncSettingKey.DATE, "global.syncValue.date");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    const realizationSurfacesMetaQuery = useRealizationSurfacesMetadataQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const observedSurfacesMetaQuery = useObservedSurfacesMetadataQuery(computedEnsembleIdent?.getCaseUuid());

    usePropagateApiErrorToStatusWriter(realizationSurfacesMetaQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(observedSurfacesMetaQuery, statusWriter);

    const surfaceDirectory = new SurfaceDirectory({
        realizationMetaSet: realizationSurfacesMetaQuery.data,
        observedMetaSet: observedSurfacesMetaQuery.data,
        timeType: timeType,
        useObservedSurfaces: useObserved,
    });

    const fixedSurfSpec = fixupSurface(
        surfaceDirectory,
        {
            surfaceName: selectedSurfaceName,
            surfaceAttribute: selectedSurfaceAttribute,
            timeOrInterval: selectedTimeOrInterval,
        },
        {
            surfaceName: syncedValueSurface?.name || null,
            surfaceAttribute: syncedValueSurface?.attribute || null,
            timeOrInterval: syncedValueDate?.timeOrInterval || null,
        }
    );
    const computedSurfaceName = fixedSurfSpec.surfaceName;
    const computedSurfaceAttribute = fixedSurfSpec.surfaceAttribute;
    const computedTimeOrInterval = fixedSurfSpec.timeOrInterval;

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
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
        let surfaceAddress: FullSurfaceAddress | null = null;
        if (computedEnsembleIdent && computedSurfaceName && computedSurfaceAttribute) {
            const addrBuilder = new SurfaceAddressBuilder();
            addrBuilder.withEnsembleIdent(computedEnsembleIdent);
            addrBuilder.withName(computedSurfaceName);
            addrBuilder.withAttribute(computedSurfaceAttribute);
            if (computedTimeOrInterval) {
                addrBuilder.withTimeOrInterval(computedTimeOrInterval);
            }

            if (aggregation) {
                addrBuilder.withStatisticFunction(aggregation);
                surfaceAddress = addrBuilder.buildStatisticalAddress();
            } else {
                if (useObserved) {
                    surfaceAddress = addrBuilder.buildObservedAddress();
                } else {
                    addrBuilder.withRealization(realizationNum);
                    surfaceAddress = addrBuilder.buildRealizationAddress();
                }
            }
        }

        console.debug(`propagateSurfaceSelectionToView() => ${surfaceAddress ? "valid surfAddr" : "NULL surfAddr"}`);
        setSurfaceAddress(surfaceAddress);
    });

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()");
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
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

    function handleTimeOrIntervalSelectionChange(selectedSurfTimeIntervals: string[]) {
        console.debug("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedSurfTimeIntervals[0] ?? null;
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

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as SurfaceTimeType);
    }

    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    let timeOrIntervalOptions: SelectOption[] = [];

    surfNameOptions = surfaceDirectory.getSurfaceNames(null).map((name) => ({
        value: name,
        label: name,
    }));
    surfAttributeOptions = surfaceDirectory.getAttributeNames(computedSurfaceName).map((attr) => ({
        value: attr,
        label: attr,
    }));

    if (timeType === SurfaceTimeType.Interval || timeType === SurfaceTimeType.TimePoint) {
        timeOrIntervalOptions = surfaceDirectory.getTimeOrIntervalStrings().map((interval) => ({
            value: interval,
            label:
                timeType === SurfaceTimeType.TimePoint
                    ? isoStringToDateLabel(interval)
                    : isoIntervalStringToDateLabel(interval),
        }));
    }

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <Label text="Realization:">
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </Label>
        );
    }

    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <RadioGroup
                value={timeType}
                options={Object.values(SurfaceTimeType).map((val: SurfaceTimeType) => {
                    return { value: val, label: SurfaceTimeTypeEnumToStringMapping[val] };
                })}
                onChange={handleTimeModeChange}
            />
            <Label
                wrapperClassName="mt-4 mb-4 flex items-center"
                labelClassName="text-l"
                text={"Use observed surfaces"}
            >
                <div className={"ml-2"}>
                    <Checkbox onChange={(e: any) => toggleUseObserved(e.target.checked)} checked={useObserved} />
                </div>
            </Label>

            <QueryStateWrapper
                queryResult={realizationSurfacesMetaQuery}
                errorComponent={"Error loading surface directoryAAA"}
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
                {timeType !== SurfaceTimeType.None && (
                    <Label text={timeType === SurfaceTimeType.TimePoint ? "Time Point" : "Time Interval"}>
                        <Select
                            options={timeOrIntervalOptions}
                            value={computedTimeOrInterval ? [computedTimeOrInterval] : []}
                            onChange={handleTimeOrIntervalSelectionChange}
                            size={5}
                        />
                    </Label>
                )}
            </QueryStateWrapper>
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

type PartialSurfSpec = {
    surfaceName: string | null;
    surfaceAttribute: string | null;
    timeOrInterval: string | null;
};

function fixupSurface(
    surfaceDirectory: SurfaceDirectory,
    selectedSurface: PartialSurfSpec,
    syncedSurface: PartialSurfSpec
): PartialSurfSpec {
    const surfaceNames = surfaceDirectory.getSurfaceNames(null);
    const finalSurfaceName = fixupSyncedOrSelectedOrFirstValue(
        syncedSurface.surfaceName,
        selectedSurface.surfaceName,
        surfaceNames
    );
    let finalSurfaceAttribute: string | null = null;
    let finalTimeOrInterval: string | null = null;
    if (finalSurfaceName) {
        const surfaceAttributes = surfaceDirectory.getAttributeNames(finalSurfaceName);
        finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.surfaceAttribute,
            selectedSurface.surfaceAttribute,
            surfaceAttributes
        );
    }
    if (finalSurfaceName && finalSurfaceAttribute) {
        const selectedTimeOrIntervals = surfaceDirectory.getTimeOrIntervalStrings();
        finalTimeOrInterval = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.timeOrInterval,
            selectedSurface.timeOrInterval,
            selectedTimeOrIntervals
        );
    }
    return {
        surfaceName: finalSurfaceName,
        surfaceAttribute: finalSurfaceAttribute,
        timeOrInterval: finalTimeOrInterval,
    };
}

function fixupSyncedOrSelectedOrFirstValue(
    syncedValue: string | null,
    selectedValue: string | null,
    values: string[]
): string | null {
    if (syncedValue && values.includes(syncedValue)) {
        return syncedValue;
    }
    if (selectedValue && values.includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

function isoStringToDateLabel(input: string): string {
    const date = input.split("T")[0];
    return `${date}`;
}

function isoIntervalStringToDateLabel(input: string): string {
    const [start, end] = input.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}
