import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Wellbore } from "@framework/types/wellbore";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import { useRealizationSurfacesMetadataQuery } from "@modules/_shared/Surface";
import { useDrilledWellboreHeadersQuery } from "@modules/_shared/WellBore";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import {
    extensionAtom,
    seismicAddressAtom,
    surfaceAddressAtom,
    wellboreAddressAtom,
    wellborePickCaseUuidAtom,
    wellborePickSelectionAtom,
    zScaleAtom,
} from "./atoms/baseAtoms";
import { useSeismicCubeMetaListQuery } from "./hooks/queryHooks";

import { Interfaces } from "../interfaces";
import {
    SeismicAddress,
    SurfaceAddress,
    WellborePickSelectionType,
    WellborePickSelectionTypeEnumToStringMapping,
} from "../typesAndEnums";
import { SeismicCubeMetaDirectory, SeismicTimeType } from "../utils/seismicCubeDirectory";

const SeismicTimeTypeEnumToSurveyTypeStringMapping = {
    [SeismicTimeType.TimePoint]: "3D",
    [SeismicTimeType.Interval]: "4D",
};
const SeismicTimeTypeEnumToSeismicTimeTypeStringMapping = {
    [SeismicTimeType.TimePoint]: "Seismic timestamps",
    [SeismicTimeType.Interval]: "Seismic intervals",
};

enum SeismicDataSource {
    SIMULATED = "Simulated",
    OBSERVED = "Observed",
}

const SeismicDataSourceTypeToStringMapping = {
    [SeismicDataSource.SIMULATED]: "Simulated",
    [SeismicDataSource.OBSERVED]: "Observed",
};

// To be a variable in the future?
const WELLBORE_TYPE = "smda";

// Hardcoded min/max limits for input elements
const EXTENSION_LIMITS = { min: 100, max: 100000 }; // Min/max extension in meters outside both sides of the well path [m]
const Z_SCALE_LIMITS = { min: 1, max: 100 }; // Minimum z-scale factor

// Hardcoded surface time type - no surface as function of time
const SURFACE_TIME_TYPE = SurfaceTimeType.None;

export function Settings({
    settingsContext,
    workbenchSession,
    workbenchServices,
}: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const setSeismicAddress = useSetAtom(seismicAddressAtom);
    const setSurfaceAddress = useSetAtom(surfaceAddressAtom);
    const [wellboreAddress, setWellboreAddress] = useAtom(wellboreAddressAtom);
    const setWellborePickCaseUuid = useSetAtom(wellborePickCaseUuidAtom);
    const [wellborePickSelection, setWellborePickSelection] = useAtom(wellborePickSelectionAtom);
    const [extension, setExtension] = useAtom(extensionAtom);
    const [zScale, setZScale] = useAtom(zScaleAtom);

    const [fetchedSurfaceNames, setFetchedSurfaceNames] = React.useState<string[]>([]);
    const [fetchedSurfaceAttributes, setFetchedSurfaceAttributes] = React.useState<string[]>([]);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [realizationNumber, setRealizationNumber] = React.useState<number>(0);
    const [isObserved, setIsObserved] = React.useState<boolean>(false);

    const [seismicTimeType, setSeismicTimeType] = React.useState<SeismicTimeType>(SeismicTimeType.TimePoint);
    const [selectedWellboreAddress, setSelectedWellboreAddress] = React.useState<Wellbore | null>(wellboreAddress);
    const [selectedWellborePickSelection, setSelectedWellborePickSelection] =
        React.useState<WellborePickSelectionType>(wellborePickSelection);

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const isValidRealizationNumber = selectedEnsembleIdent
        ? ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations().includes(realizationNumber) ?? false
        : false;
    if (!isValidRealizationNumber) {
        statusWriter.addError("Realization number does not exist in ensemble");
    }

    // Queries
    const wellHeadersQuery = useDrilledWellboreHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    const seismicCubeMetaListQuery = useSeismicCubeMetaListQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const surfaceMetadataQuery = useRealizationSurfacesMetadataQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    usePropagateApiErrorToStatusWriter(wellHeadersQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(seismicCubeMetaListQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(surfaceMetadataQuery, statusWriter);

    if (seismicCubeMetaListQuery.data && seismicCubeMetaListQuery.data.length === 0) {
        statusWriter.addWarning("No seismic cubes found for ensemble");
    }
    if (surfaceMetadataQuery.data && surfaceMetadataQuery.data.surfaces.length === 0) {
        statusWriter.addWarning("No surfaces found for ensemble");
    }

    // Handling well headers query
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: WELLBORE_TYPE,
            uwi: wellbore.uniqueWellboreIdentifier,
            uuid: wellbore.wellboreUuid,
        })) || [];
    const computedWellboreAddress = fixupSyncedOrSelectedOrFirstWellbore(
        syncedWellBore || null,
        selectedWellboreAddress || null,
        availableWellboreList
    );

    if (!isEqual(computedWellboreAddress, selectedWellboreAddress)) {
        setSelectedWellboreAddress(computedWellboreAddress);
    }

    // Create surface directory (depth and time to match attributes for seismic cube)
    const surfaceDirectory = new SurfaceDirectory({
        realizationMetaSet: surfaceMetadataQuery.data,
        timeType: SURFACE_TIME_TYPE,
        includeAttributeTypes: [SurfaceAttributeType_api.DEPTH, SurfaceAttributeType_api.TIME],
    });

    // Get attributes for available surfaces and set valid state hook
    let computedSurfaceAttributes: string[] = fetchedSurfaceAttributes;
    const noSurfaceNameFilter = null; // No filter for surface attributes
    const candidateSurfaceAttributes = surfaceDirectory.getAttributeNames(noSurfaceNameFilter);
    if (surfaceMetadataQuery.data && !isEqual(computedSurfaceAttributes, candidateSurfaceAttributes)) {
        computedSurfaceAttributes = candidateSurfaceAttributes;
        setFetchedSurfaceAttributes(candidateSurfaceAttributes);
    }
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = useValidState<string | null>({
        initialState: null,
        validStates: computedSurfaceAttributes,
    });

    // Find surface names which has selected attribute and set valid state hook
    let computedSurfaceNames: string[] = fetchedSurfaceNames;
    const candidateSurfaceNames = surfaceDirectory.getSurfaceNames(selectedSurfaceAttribute);
    if (surfaceMetadataQuery.data && !isEqual(computedSurfaceNames, candidateSurfaceNames)) {
        computedSurfaceNames = candidateSurfaceNames;
        setFetchedSurfaceNames(candidateSurfaceNames);
    }
    const [selectedSurfaceNames, setSelectedSurfaceNames] = useValidArrayState<string>({
        initialState: [],
        validStateArray: computedSurfaceNames,
    });

    // Create seismic cube directory
    const seismicCubeMetaDirectory = seismicCubeMetaListQuery.data
        ? new SeismicCubeMetaDirectory({
              seismicCubeMetaList: seismicCubeMetaListQuery.data,
              timeType: seismicTimeType,
              useObservedSeismicCubes: isObserved,
          })
        : null;

    const [selectedSeismicAttribute, setSelectedSeismicAttribute] = useValidState<string | null>({
        initialState: null,
        validStates: seismicCubeMetaDirectory?.getAttributeNames() ?? [],
    });
    const [selectedSeismicTime, setSelectedSeismicTime] = useValidState<string | null>({
        initialState: null,
        validStates: seismicCubeMetaDirectory?.getTimeOrIntervalStrings() ?? [],
    });

    const seismicAttributeOptions = seismicCubeMetaDirectory
        ? seismicCubeMetaDirectory.getAttributeNames().map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];
    const seismicTimeOptions = seismicCubeMetaDirectory
        ? createOptionsFromTimeOrIntervalStrings(seismicCubeMetaDirectory.getTimeOrIntervalStrings())
        : [];

    React.useEffect(
        function propagateSeismicAddressToView() {
            let seismicAddress: SeismicAddress | null = null;
            if (computedEnsembleIdent && selectedSeismicAttribute && selectedSeismicTime && isValidRealizationNumber) {
                seismicAddress = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    realizationNumber: realizationNumber,
                    attribute: selectedSeismicAttribute,
                    timeString: selectedSeismicTime,
                    observed: isObserved,
                };
            }
            setSeismicAddress(seismicAddress);
        },
        [
            computedEnsembleIdent,
            selectedSeismicAttribute,
            selectedSeismicTime,
            isObserved,
            isValidRealizationNumber,
            realizationNumber,
            setSeismicAddress,
        ]
    );

    React.useEffect(
        function propagateSurfaceAddressToView() {
            let surfaceAddress: SurfaceAddress | null = null;
            if (
                computedEnsembleIdent &&
                selectedSurfaceAttribute &&
                selectedSurfaceNames.length !== 0 &&
                isValidRealizationNumber
            ) {
                surfaceAddress = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    realizationNumber: realizationNumber,
                    surfaceNames: selectedSurfaceNames,
                    attribute: selectedSurfaceAttribute,
                };
            }
            setSurfaceAddress(surfaceAddress);
        },
        [
            computedEnsembleIdent,
            selectedSurfaceAttribute,
            selectedSurfaceNames,
            isValidRealizationNumber,
            realizationNumber,
            setSurfaceAddress,
        ]
    );

    React.useEffect(
        function propagateWellBoreAddressToView() {
            setWellboreAddress(selectedWellboreAddress);
        },
        [selectedWellboreAddress, setWellboreAddress]
    );

    React.useEffect(
        function propagateWellborePickCaseUuidToView() {
            setWellborePickCaseUuid(computedEnsembleIdent?.getCaseUuid() ?? null);
        },
        [computedEnsembleIdent, setWellborePickCaseUuid]
    );

    React.useEffect(
        function propagateWellborePickSelectionToView() {
            setWellborePickSelection(selectedWellborePickSelection);
        },
        [selectedWellborePickSelection, setWellborePickSelection]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const base10 = 10;
        const realNum = Math.max(0, parseInt(event.target.value, base10));
        setRealizationNumber(realNum);
    }

    function handleSurfaceNameChange(values: string[]) {
        setSelectedSurfaceNames(values);
    }

    function handleSurfaceAttributeChange(values: string[]) {
        if (values.length === 0) {
            setSelectedSurfaceAttribute(null);
            return;
        }
        setSelectedSurfaceAttribute(values[0]);
    }

    function handleSeismicAttributeChange(values: string[]) {
        if (values.length === 0) {
            setSelectedSeismicAttribute(null);
            return;
        }
        setSelectedSeismicAttribute(values[0]);
    }

    function handleSeismicTimeChange(values: string[]) {
        if (values.length === 0) {
            setSelectedSeismicTime(null);
            return;
        }
        setSelectedSeismicTime(values[0]);
    }

    function handleWellChange(selectedWellboreUuids: string[], validWellboreList: Wellbore[]) {
        if (selectedWellboreUuids.length === 0) {
            setSelectedWellboreAddress(null);
            return;
        }

        // Use only first wellbore
        const wellboreUuid = selectedWellboreUuids[0];
        const wellUwi = validWellboreList.find((wellbore) => wellbore.uuid === wellboreUuid)?.uwi;

        if (!wellUwi) return;

        const newWellboreAddress: Wellbore = { type: WELLBORE_TYPE, uuid: wellboreUuid, uwi: wellUwi };
        setSelectedWellboreAddress(newWellboreAddress);
        syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", newWellboreAddress);
    }

    function handleExtensionChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newExtension = parseInt(event.target.value, 10);
        setExtension(newExtension);
    }

    function handleZScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newZScale = parseInt(event.target.value, 10);
        setZScale(newZScale);
    }

    return (
        <div className="flex flex-col gap-4 overflow-y-auto">
            <CollapsibleGroup title="Ensemble and Realization" expanded={true}>
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                        <EnsembleDropdown
                            ensembleSet={ensembleSet}
                            value={computedEnsembleIdent ? computedEnsembleIdent : null}
                            onChange={handleEnsembleSelectionChange}
                        />
                    </Label>
                    <Label
                        text={`Realization (max: ${
                            selectedEnsembleIdent
                                ? ensembleSet.findEnsemble(selectedEnsembleIdent)?.getMaxRealizationNumber()
                                : 0
                        })`}
                    >
                        <Input
                            error={!isValidRealizationNumber}
                            type={"number"}
                            value={realizationNumber}
                            onChange={handleRealizationTextChanged}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well trajectory">
                <QueryStateWrapper
                    queryResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <Select
                            options={availableWellboreList.map((header) => ({
                                label: header.uwi,
                                value: header.uuid,
                            }))}
                            value={computedWellboreAddress ? [computedWellboreAddress.uuid] : []}
                            onChange={(wellboreUuids: string[]) =>
                                handleWellChange(wellboreUuids, availableWellboreList)
                            }
                            size={10}
                            multiple={true}
                        />
                    </Label>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Surface specifications">
                <QueryStateWrapper
                    queryResult={surfaceMetadataQuery}
                    errorComponent={"Error loading metadata for surfaces"}
                    loadingComponent={<CircularProgress />}
                >
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <Label text={`Surface attributes`}>
                            <Select
                                options={computedSurfaceAttributes.map((attribute) => {
                                    return { label: attribute, value: attribute };
                                })}
                                value={selectedSurfaceAttribute ? [selectedSurfaceAttribute] : []}
                                size={4}
                                onChange={handleSurfaceAttributeChange}
                            />
                        </Label>
                        <Label text="Surfaces with selected attribute">
                            <Select
                                options={computedSurfaceNames.map((name) => {
                                    return { label: name, value: name };
                                })}
                                value={selectedSurfaceNames}
                                multiple={true}
                                size={4}
                                onChange={handleSurfaceNameChange}
                            />
                        </Label>
                        <Label text="Wellbore pick selection">
                            <Dropdown
                                options={Object.values(WellborePickSelectionType).map(
                                    (val: WellborePickSelectionType) => {
                                        return { value: val, label: WellborePickSelectionTypeEnumToStringMapping[val] };
                                    }
                                )}
                                value={selectedWellborePickSelection}
                                onChange={(value: string) =>
                                    setSelectedWellborePickSelection(value as WellborePickSelectionType)
                                }
                            />
                        </Label>
                    </div>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Seismic specifications">
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Label text="Seismic data type">
                        <RadioGroup
                            direction="horizontal"
                            options={Object.values(SeismicDataSource).map((val: SeismicDataSource) => {
                                return { value: val, label: SeismicDataSourceTypeToStringMapping[val] };
                            })}
                            value={isObserved ? SeismicDataSource.OBSERVED : SeismicDataSource.SIMULATED}
                            onChange={(_, value: string | number) =>
                                setIsObserved(value === SeismicDataSource.OBSERVED)
                            }
                        />
                    </Label>
                    <Label text="Seismic survey type">
                        <RadioGroup
                            options={Object.values(SeismicTimeType).map((val: SeismicTimeType) => {
                                return { value: val, label: SeismicTimeTypeEnumToSurveyTypeStringMapping[val] };
                            })}
                            direction="horizontal"
                            value={seismicTimeType}
                            onChange={(_, value: string | number) => setSeismicTimeType(value as SeismicTimeType)}
                        />
                    </Label>
                    <QueryStateWrapper
                        queryResult={seismicCubeMetaListQuery}
                        errorComponent={"Error loading seismic directory"}
                        loadingComponent={<CircularProgress />}
                    >
                        <div className="flex flex-col gap-4 overflow-y-auto">
                            <Label text="Seismic attribute">
                                <Select
                                    options={seismicAttributeOptions}
                                    value={selectedSeismicAttribute ? [selectedSeismicAttribute] : []}
                                    size={5}
                                    onChange={handleSeismicAttributeChange}
                                />
                            </Label>
                            <Label text={SeismicTimeTypeEnumToSeismicTimeTypeStringMapping[seismicTimeType]}>
                                <Select
                                    options={seismicTimeOptions}
                                    value={selectedSeismicTime ? [selectedSeismicTime] : []}
                                    onChange={handleSeismicTimeChange}
                                    size={8}
                                />
                            </Label>
                        </div>
                    </QueryStateWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection Settings" expanded={false}>
                <Label text="Extension">
                    <Input
                        type={"number"}
                        min={EXTENSION_LIMITS.min}
                        max={EXTENSION_LIMITS.max}
                        value={extension}
                        onChange={handleExtensionChange}
                    />
                </Label>
                <Label text="Z-scale">
                    <Input
                        type={"number"}
                        min={Z_SCALE_LIMITS.min}
                        max={Z_SCALE_LIMITS.max}
                        value={zScale}
                        onChange={handleZScaleChange}
                    />
                </Label>
            </CollapsibleGroup>
        </div>
    );
}

function fixupSyncedOrSelectedOrFirstWellbore(
    syncedWellbore: Wellbore | null,
    selectedWellbore: Wellbore | null,
    legalWellbores: Wellbore[]
): Wellbore | null {
    const allUuids = legalWellbores.map((elm) => elm.uuid);
    if (syncedWellbore && allUuids.includes(syncedWellbore.uuid)) {
        return syncedWellbore;
    }
    if (selectedWellbore && allUuids.includes(selectedWellbore.uuid)) {
        return selectedWellbore;
    }
    if (legalWellbores.length !== 0) {
        return legalWellbores[0];
    }
    return null;
}

function createOptionsFromTimeOrIntervalStrings(timeOrIntervalStrings: string[]): SelectOption[] {
    if (timeOrIntervalStrings.length == 0) {
        return [];
    }

    // '2018-01-01T00:00:00.000/2019-07-01T00:00:00.000' to '2018-01-01/2019-07-01'
    const options = timeOrIntervalStrings.map((elm) => {
        const isInterval = elm.includes("/");
        return { value: elm, label: isInterval ? isoIntervalStringToDateLabel(elm) : isoStringToDateLabel(elm) };
    });
    return options;
}

/**
 * Extracts the date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00.000'
 * Returns: '2018-01-01'
 */
function isoStringToDateLabel(inputIsoString: string): string {
    const date = inputIsoString.split("T")[0];
    return `${date}`;
}

/**
 * Extracts interval date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00.000/2019-07-01T00:00:00.000'
 * Returns: '2018-01-01/2019-07-01'
 */
function isoIntervalStringToDateLabel(inputIsoIntervalString: string): string {
    const [start, end] = inputIsoIntervalString.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}
