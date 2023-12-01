import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import { isEqual } from "lodash";

import { useSeismicCubeMetaListQuery } from "./queryHooks";
import { State } from "./state";
import { SeismicAddress } from "./types";
import { SeismicCubeMetaDirectory, TimeType } from "./utils/seismicCubeDirectory";

const TimeTypeEnumToSurveyTypeStringMapping = {
    [TimeType.TimePoint]: "3D",
    [TimeType.Interval]: "4D",
};
const TimeTypeEnumToSeismicTimeTypeStringMapping = {
    [TimeType.TimePoint]: "Seismic timestamps",
    [TimeType.Interval]: "Seismic intervals",
};
const enum SeismicDataSource {
    SIMULATED = "Simulated",
    OBSERVED = "Observed",
}

// To be a variable in the future?
const WELLBORE_TYPE = "smda";

// Hardcoded min/max limits for input elements
const EXTENSION_LIMITS = { min: 100, max: 100000 }; // Min/max extension in meters outside both sides of the well path [m]
const Z_SCALE_LIMITS = { min: 1, max: 100 }; // Minimum z-scale factor

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(moduleContext);

    const setSeismicAddress = moduleContext.useSetStoreValue("seismicAddress");
    const setWellboreAddress = moduleContext.useSetStoreValue("wellboreAddress");
    const [extension, setExtension] = moduleContext.useStoreState("extension");
    const [zScale, setZScale] = moduleContext.useStoreState("zScale");

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [realizationNumber, setRealizationNumber] = React.useState<number>(0);
    const [isObserved, setIsObserved] = React.useState<boolean>(false);

    const [surveyTimeType, setSurveyTimeType] = React.useState<TimeType>(TimeType.TimePoint);
    const [selectedWellboreAddress, setSelectedWellboreAddress] = React.useState<Wellbore | null>(
        moduleContext.useStoreValue("wellboreAddress")
    );

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    // Queries
    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    const seismicCubeMetaListQuery = useSeismicCubeMetaListQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    if (wellHeadersQuery.isError) {
        statusWriter.addError("Error loading well headers");
    }
    if (seismicCubeMetaListQuery.isError) {
        statusWriter.addError("Error loading seismic cube meta list");
    }

    // Handling well headers query
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: WELLBORE_TYPE,
            uwi: wellbore.unique_wellbore_identifier,
            uuid: wellbore.wellbore_uuid,
        })) || [];
    const computedWellboreAddress = fixupSyncedOrSelectedOrFirstWellbore(
        syncedWellBore || null,
        selectedWellboreAddress || null,
        availableWellboreList
    );

    if (!isEqual(computedWellboreAddress, selectedWellboreAddress)) {
        setSelectedWellboreAddress(computedWellboreAddress);
    }

    // Create seismic cube directory
    const seismicCubeMetaDirectory = seismicCubeMetaListQuery.data
        ? new SeismicCubeMetaDirectory({
              seismicCubeMetaList: seismicCubeMetaListQuery.data,
              timeType: surveyTimeType,
              useObservedSeismicCubes: isObserved,
          })
        : null;

    const [selectedSeismicAttribute, setSelectedSeismicAttribute] = useValidState<string | null>(
        null,
        seismicCubeMetaDirectory?.getAttributeNames() ?? []
    );
    const [selectedTime, setSelectedTime] = useValidState<string | null>(
        null,
        seismicCubeMetaDirectory?.getTimeOrIntervalStrings() ?? []
    );

    const seismicAttributeOptions = seismicCubeMetaDirectory
        ? seismicCubeMetaDirectory.getAttributeNames().map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];
    const timeOptions = seismicCubeMetaDirectory
        ? createOptionsFromTimeOrIntervalStrings(seismicCubeMetaDirectory.getTimeOrIntervalStrings())
        : [];

    React.useEffect(
        function propagateSeismicAddressToView() {
            let seismicAddress: SeismicAddress | null = null;
            if (computedEnsembleIdent && selectedSeismicAttribute && selectedTime) {
                seismicAddress = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    realizationNumber: realizationNumber,
                    attribute: selectedSeismicAttribute,
                    timeString: selectedTime,
                    observed: isObserved,
                };
            }
            setSeismicAddress(seismicAddress);
        },
        [computedEnsembleIdent, selectedSeismicAttribute, selectedTime, isObserved, realizationNumber]
    );

    React.useEffect(
        function propagateWellBoreAddressToView() {
            setWellboreAddress(selectedWellboreAddress);
        },
        [selectedWellboreAddress]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const base10 = 10;
        const realNum = parseInt(event.target.value, base10);
        const isValidRealNum = selectedEnsembleIdent
            ? ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations().includes(realNum)
            : null;
        if (realNum >= 0 && isValidRealNum) {
            setRealizationNumber(realNum);
            return;
        } else {
            setRealizationNumber(0);
        }
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
            setSelectedTime(null);
            return;
        }
        setSelectedTime(values[0]);
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
                        <SingleEnsembleSelect
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
                        <Input type={"number"} value={realizationNumber} onChange={handleRealizationTextChanged} />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well trajectory">
                <ApiStateWrapper
                    apiResult={wellHeadersQuery}
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
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Seismic specifications">
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Label text="Seismic data type">
                        <RadioGroup
                            direction="horizontal"
                            options={[
                                { label: "Simulated", value: SeismicDataSource.SIMULATED },
                                { label: "Observed", value: SeismicDataSource.OBSERVED },
                            ]}
                            value={isObserved ? SeismicDataSource.OBSERVED : SeismicDataSource.SIMULATED}
                            onChange={(_, value: string | number) =>
                                setIsObserved(value === SeismicDataSource.OBSERVED)
                            }
                        />
                    </Label>
                    <Label text="Seismic survey type">
                        <RadioGroup
                            options={[
                                {
                                    label: TimeTypeEnumToSurveyTypeStringMapping[TimeType.TimePoint],
                                    value: TimeType.TimePoint,
                                },
                                {
                                    label: TimeTypeEnumToSurveyTypeStringMapping[TimeType.Interval],
                                    value: TimeType.Interval,
                                },
                            ]}
                            direction="horizontal"
                            value={surveyTimeType}
                            onChange={(_, value: string | number) => setSurveyTimeType(value as TimeType)}
                        />
                    </Label>
                    <ApiStateWrapper
                        apiResult={seismicCubeMetaListQuery}
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
                            <Label text={TimeTypeEnumToSeismicTimeTypeStringMapping[surveyTimeType]}>
                                <Select
                                    options={timeOptions}
                                    value={selectedTime ? [selectedTime] : []}
                                    onChange={handleSeismicTimeChange}
                                    size={8}
                                />
                            </Label>
                        </div>
                    </ApiStateWrapper>
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
