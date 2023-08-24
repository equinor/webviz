import React from "react";

import { SumoContent_api, SurfaceData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import { GridParameterAddress } from "./GridParameterAddress";
import { SeismicAddress } from "./SeismicAddress";
import { SurfAddr } from "./SurfaceAddress";
import { SurfaceDirectoryProvider } from "./SurfaceDirectoryProvider";
import {
    useGetSeismic3DsurveyDirectory,
    useGetSeismic4DsurveyDirectory,
    useGetWellHeaders,
    useGridModelNames,
    useGridParameterNames,
    useSurfaceDirectoryQuery,
} from "./queryHooks";
import { state } from "./state";
import { IntersectionViewSettings } from "./view";

type LabelledCheckboxProps = {
    label: string;
    checked: boolean;
    onChange: any;
};

function LabelledCheckbox(props: LabelledCheckboxProps): JSX.Element {
    return (
        <Label wrapperClassName=" text-xs flow-root mb-2" labelClassName="float-left text-xs" text={props.label}>
            <div className=" float-right">
                <Checkbox onChange={props.onChange} checked={props.checked} />
            </div>
        </Label>
    );
}
export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<state>) {
    const [viewSettings, setViewSettings] = moduleContext.useStoreState("viewSettings");
    const [selectedWellBore, setSelectedWellBore] = React.useState<Wellbore | null>(
        moduleContext.useStoreValue("wellBoreAddress")
    );

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [selectedSurfaceNames, setSelectedSurfaceNames] = React.useState<string[] | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [surveyType, setSurveyType] = React.useState<string>("3D");
    const [selectedGridName, setSelectedGridName] = React.useState<string | null>(null);
    const [selectedGridParameterName, setSelectedGridParameterName] = React.useState<string | null>(null);
    const [selectedSeismicAttribute, setSelectedSeismicattribute] = React.useState<string | null>(null);
    const [useGridColorRange, toggleUseGridColorRange] = React.useState<boolean>(false);
    const [gridColorMin, setGridColorMin] = React.useState<number>(0);
    const [gridColorMax, setGridColorMax] = React.useState<number>(1);
    const [isObserved, setIsObserved] = React.useState<boolean>(false);
    const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    if (syncedWellBore && selectedWellBore?.uuid !== syncedWellBore.uuid) {
        setSelectedWellBore(syncedWellBore);
    }

    const wellHeadersQuery = useGetWellHeaders(computedEnsembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];
    let computedWellBoreUuid: string | null = null;
    if (wellHeadersQuery.data) {
        const possibleSyncedWellBore = syncedWellBore || selectedWellBore;
        computedWellBoreUuid = fixupStringValueFromList(
            possibleSyncedWellBore ? possibleSyncedWellBore.uuid : null,
            wellHeadersQuery.data.map((header) => header.wellbore_uuid)
        );
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
        if (computedWellBoreUuid && computedWellBoreUuid !== selectedWellBore?.uuid) {
            setSelectedWellBore({
                type: "smda",
                uwi: wellHeaderOptions.find((option) => option.value === computedWellBoreUuid)?.label || "",
                uuid: computedWellBoreUuid,
            });
        } else if (!computedWellBoreUuid) {
            setSelectedWellBore(null);
        }
    }
    // Surfaces
    const surfaceDirQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName(),
        [SumoContent_api.DEPTH]
    );
    const surfaceDirProvider = new SurfaceDirectoryProvider(surfaceDirQuery);
    const availableSurfaceAttributes = surfaceDirProvider.getAttributes();
    const computedSurfaceAttribute = fixupStringValueFromList(selectedSurfaceAttribute, availableSurfaceAttributes);
    const computedSurfaceNames: string[] = fixupCompareTwoLists(selectedSurfaceNames, surfaceDirProvider.getNames());
    console.log(computedSurfaceNames);
    if (computedSurfaceNames && computedSurfaceNames.length > 0) {
        if (!selectedSurfaceNames || !selectedSurfaceNames.every((name) => computedSurfaceNames.includes(name))) {
            console.log(selectedSurfaceNames);
            setSelectedSurfaceNames(computedSurfaceNames);
        }
    }

    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }
    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    surfNameOptions = surfaceDirProvider.getNames().map((name) => ({ value: name, label: name }));
    surfAttributeOptions = surfaceDirProvider.getAttributes().map((attr) => ({ value: attr, label: attr }));

    const seismic3DsurveyDirectoryQuery = useGetSeismic3DsurveyDirectory(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const seismic4DsurveyDirectoryQuery = useGetSeismic4DsurveyDirectory(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    let seismicAttributeOptions: SelectOption[] = [];
    let timeOptions: SelectOption[] = [];
    let computedSeismicAttribute: string | null = null;
    let computedTime: string | null = null;

    if (seismic3DsurveyDirectoryQuery.data && surveyType === "3D") {
        const data = seismic3DsurveyDirectoryQuery.data;
        computedSeismicAttribute = fixupStringValueFromList(selectedSeismicAttribute, data.attributes);
        computedTime = fixupStringValueFromList(selectedTime, data.timestamps);
        seismicAttributeOptions = data.attributes.map((attribute) => ({
            label: attribute,
            value: attribute,
        }));
        timeOptions = fixupDateOptions(data.timestamps);
    }
    if (seismic4DsurveyDirectoryQuery.data && surveyType === "4D") {
        const data = seismic4DsurveyDirectoryQuery.data;
        computedSeismicAttribute = fixupStringValueFromList(selectedSeismicAttribute, data.attributes);
        computedTime = fixupStringValueFromList(selectedTime, data.intervals);
        seismicAttributeOptions = data.attributes.map((attribute) => ({
            label: attribute,
            value: attribute,
        }));
        timeOptions = fixupDateOptions(data.intervals);
    }
    if (computedSeismicAttribute !== selectedSeismicAttribute) {
        setSelectedSeismicattribute(computedSeismicAttribute);
    }
    if (computedTime !== selectedTime) {
        setSelectedTime(computedTime);
    }

    let gridNameOptions: SelectOption[] = [];
    let gridParameterNameOptions: SelectOption[] = [];
    let computedGridName: string | null = null;
    let computedGridParameterName: string | null = null;

    const gridNamesQuery = useGridModelNames(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    computedGridName = fixupStringValueFromList(selectedGridName, gridNamesQuery.data ?? null);
    gridNameOptions =
        gridNamesQuery.data?.map((gridName) => ({
            label: gridName,
            value: gridName,
        })) ?? [];

    const gridParameterNamesQuery = useGridParameterNames(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName(),
        computedGridName ?? undefined
    );
    computedGridParameterName = fixupStringValueFromList(
        selectedGridParameterName,
        gridParameterNamesQuery.data ?? null
    );
    gridParameterNameOptions =
        gridParameterNamesQuery.data?.map((parameterName) => ({
            label: parameterName,
            value: parameterName,
        })) ?? [];

    React.useEffect(
        function propagateWellBoreAddress() {
            moduleContext.getStateStore().setValue("wellBoreAddress", selectedWellBore);
        },
        [selectedWellBore]
    );
    React.useEffect(function propagateSeismicAddress() {
        let seismicAddress: SeismicAddress | null = null;
        if (computedEnsembleIdent && realizationNum !== undefined && selectedSeismicAttribute && selectedTime) {
            seismicAddress = {
                caseUuid: computedEnsembleIdent.getCaseUuid(),
                ensemble: computedEnsembleIdent.getEnsembleName(),
                realizationNum: realizationNum,
                attribute: selectedSeismicAttribute,
                timeString: selectedTime,
                observed: isObserved,
            };
        }
        moduleContext.getStateStore().setValue("seismicAddress", seismicAddress);
    });
    React.useEffect(function propogateGridParameterAddress() {
        let gridParameterAddress: GridParameterAddress | null = null;
        if (computedEnsembleIdent && realizationNum !== undefined && computedGridName && computedGridParameterName) {
            gridParameterAddress = {
                caseUuid: computedEnsembleIdent.getCaseUuid(),
                ensemble: computedEnsembleIdent.getEnsembleName(),
                realizationNum: realizationNum,
                gridName: computedGridName,
                parameterName: computedGridParameterName,
                lockColorRange: useGridColorRange,
                colorMin: gridColorMin,
                colorMax: gridColorMax,
            };
        }
        moduleContext.getStateStore().setValue("gridParameterAddress", gridParameterAddress);
    });
    React.useEffect(function propogateSurfaceAddress() {
        let surfaceAddress: SurfAddr | null = null;
        if (
            computedEnsembleIdent &&
            realizationNum !== undefined &&
            computedSurfaceNames &&
            computedSurfaceNames.length > 0 &&
            computedSurfaceAttribute
        ) {
            surfaceAddress = {
                addressType: "static",
                caseUuid: computedEnsembleIdent.getCaseUuid(),
                ensemble: computedEnsembleIdent.getEnsembleName(),
                realizationNum: realizationNum,
                names: computedSurfaceNames,
                attribute: computedSurfaceAttribute,
            };
        }
        moduleContext.getStateStore().setValue("surfaceAddress", surfaceAddress);
    });
    const handleWellChange = (selectedWellBoreUuids: string[], wellHeaderOptions: SelectOption[]) => {
        if (selectedWellBoreUuids.length > 0) {
            const wellUwi = wellHeaderOptions.find((option) => option.value === selectedWellBoreUuids[0])?.label || "";
            setSelectedWellBore({ type: "smda", uwi: wellUwi, uuid: selectedWellBoreUuids[0] });

            syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", {
                type: "smda",
                uwi: wellUwi,
                uuid: selectedWellBoreUuids[0],
            });
        } else {
            setSelectedWellBore(null);
        }
    };
    function fixupStringValueFromList(currValue: string | null, legalValues: string[] | null): string | null {
        if (!legalValues || legalValues.length == 0) {
            return null;
        }
        if (currValue && legalValues.includes(currValue)) {
            return currValue;
        }

        return legalValues[0];
    }
    function fixupCompareTwoLists(currValues: string[] | null, legalValues: string[] | null): string[] {
        if (!legalValues || legalValues.length == 0) {
            return [];
        }
        if (currValues && currValues.length > 0 && currValues.every((value) => legalValues.includes(value))) {
            return currValues;
        }

        return legalValues;
    }
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }
    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }
    function handleSeismicAttributeChange(selectedSeismicAttributes: string[]) {
        const newName = selectedSeismicAttributes[0] ?? null;
        setSelectedSeismicattribute(newName);
    }
    function handleSeismicTimeChange(selectedSeismicTimes: string[]) {
        const newName = selectedSeismicTimes[0] ?? null;
        setSelectedTime(newName);
    }
    function handleGridNameChange(selectedGridName: string[]) {
        const newName = selectedGridName[0] ?? null;
        setSelectedGridName(newName);
    }
    function handleGridParameterNameChange(selectedGridParameterName: string[]) {
        const newName = selectedGridParameterName[0] ?? null;
        setSelectedGridParameterName(newName);
    }
    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        setSelectedSurfaceNames(selectedSurfNames);
    }
    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
    }
    function handleExtensionChange(event: React.ChangeEvent<HTMLInputElement>) {
        const extension = parseInt(event.target.value, 10);
        if (extension >= 0) {
            setViewSettings({ ...viewSettings, extension: extension });
        }
    }
    function handleZScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const zScale = parseInt(event.target.value, 10);
        if (zScale >= 0) {
            setViewSettings({ ...viewSettings, zScale: zScale });
        }
    }
    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensemble and realization">
                <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent ? computedEnsembleIdent : null}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>

                <Label text="Realization:">
                    <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well trajectory">
                <ApiStateWrapper
                    apiResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <Select
                            options={wellHeaderOptions}
                            value={computedWellBoreUuid ? [computedWellBoreUuid] : []}
                            onChange={(selectedWellBoreUuids: string[]) =>
                                handleWellChange(selectedWellBoreUuids, wellHeaderOptions)
                            }
                            size={10}
                            multiple={true}
                        />
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Well picks">
                <LabelledCheckbox
                    label="Show wellpicks"
                    checked={viewSettings?.showWellMarkers}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setViewSettings({ ...viewSettings, showWellMarkers: e.target.checked })
                    }
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Depth surfaces">
                <LabelledCheckbox
                    label="Show surfaces"
                    checked={viewSettings?.showSurfaces}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setViewSettings({ ...viewSettings, showSurfaces: e.target.checked })
                    }
                />
                {viewSettings?.showSurfaces && (
                    <div className="text-xs">
                        <ApiStateWrapper
                            apiResult={surfaceDirQuery}
                            errorComponent={"Error loading surface directory"}
                            loadingComponent={<CircularProgress />}
                        >
                            <Label
                                text="Stratigraphic name"
                                labelClassName={
                                    syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                                }
                            >
                                <Select
                                    options={surfNameOptions}
                                    value={computedSurfaceNames ?? []}
                                    onChange={handleSurfNameSelectionChange}
                                    size={5}
                                    multiple={true}
                                />
                            </Label>
                            <Label
                                text="Attribute"
                                labelClassName={
                                    syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                                }
                            >
                                <Select
                                    options={surfAttributeOptions}
                                    value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                                    onChange={handleSurfAttributeSelectionChange}
                                    size={5}
                                />
                            </Label>
                        </ApiStateWrapper>
                    </div>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Seismic">
                <LabelledCheckbox
                    label="Show seismic"
                    checked={viewSettings?.showSeismic}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setViewSettings({ ...viewSettings, showSeismic: e.target.checked })
                    }
                />
                {viewSettings?.showSeismic && (
                    <div className="text-xs">
                        <RadioGroup
                            options={[
                                { label: "Simulated", value: "simulated" },
                                { label: "Observed", value: "observed" },
                            ]}
                            direction="horizontal"
                            value={isObserved ? "observed" : "simulated"}
                            onChange={(e, value: string | number) => setIsObserved(value === "observed")}
                        />
                        <Label wrapperClassName=" mb-4" text="Seismic survey type">
                            <RadioGroup
                                options={[
                                    { label: "3D Survey", value: "3D" },
                                    { label: "Preprocessed 4D Survey", value: "4D" },
                                    { label: "Calculate 4D Survey", value: "4D_compute" },
                                ]}
                                direction="horizontal"
                                value={surveyType}
                                onChange={(e, value: string | number) => setSurveyType(value as string)}
                            />
                        </Label>
                        <ApiStateWrapper
                            apiResult={
                                surveyType === "3D" ? seismic3DsurveyDirectoryQuery : seismic4DsurveyDirectoryQuery
                            }
                            errorComponent={"Error loading surveys"}
                            loadingComponent={<CircularProgress />}
                        >
                            <Label text="Seismic attribute">
                                <Select
                                    options={seismicAttributeOptions}
                                    size={5}
                                    onChange={handleSeismicAttributeChange}
                                    value={computedSeismicAttribute ? [computedSeismicAttribute] : []}
                                />
                            </Label>
                            <Label text={surveyType === "3D" ? "Seismic timestamps" : "Seismic intervals"}>
                                <Select
                                    options={timeOptions}
                                    onChange={handleSeismicTimeChange}
                                    size={8}
                                    value={computedTime ? [computedTime] : []}
                                />
                            </Label>
                        </ApiStateWrapper>
                    </div>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Grid parameters">
                <LabelledCheckbox
                    label="Show grid parameter"
                    checked={viewSettings?.showGridParameter}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setViewSettings({ ...viewSettings, showGridParameter: e.target.checked })
                    }
                />
                {viewSettings?.showGridParameter && (
                    <div className="text-xs">
                        <ApiStateWrapper
                            apiResult={gridNamesQuery}
                            errorComponent={"Error loading grid models"}
                            loadingComponent={<CircularProgress />}
                        >
                            <Label text="Grid model">
                                <Select
                                    options={gridNameOptions}
                                    size={5}
                                    onChange={handleGridNameChange}
                                    value={computedGridName ? [computedGridName] : []}
                                />
                            </Label>
                        </ApiStateWrapper>

                        <Label text="Grid parameter">
                            <Select
                                options={gridParameterNameOptions}
                                size={5}
                                onChange={handleGridParameterNameChange}
                                value={computedGridParameterName ? [computedGridParameterName] : []}
                            />
                        </Label>
                        <LabelledCheckbox
                            label="Lock grid color range"
                            checked={useGridColorRange}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                toggleUseGridColorRange(e.target.checked)
                            }
                        />
                        {useGridColorRange && (
                            <div className="flex flex-row text-xs">
                                <Label text="Min">
                                    <Input
                                        type={"number"}
                                        value={gridColorMin}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setGridColorMin(parseFloat(e.target.value))
                                        }
                                    />
                                </Label>
                                <Label text="Max">
                                    <Input
                                        type={"number"}
                                        value={gridColorMax}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setGridColorMax(parseFloat(e.target.value))
                                        }
                                    />
                                </Label>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="View settings">
                <Label text="Extension">
                    <Input type={"number"} value={viewSettings?.extension} onChange={handleExtensionChange} />
                </Label>
                <Label text="Z-scale">
                    <Input type={"number"} value={viewSettings?.zScale} onChange={handleZScaleChange} />
                </Label>
            </CollapsibleGroup>
        </div>
    );
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

function fixupDateOptions(dateStrings: string[] | null): SelectOption[] | [] {
    if (!dateStrings || dateStrings.length == 0) {
        return [];
    }
    // '2018-01-01T00:00:00.000Z--2019-07-01T00:00:00.000Z' to '2018-01-01--2019-07-01'
    const dateOptions = dateStrings.map((dateString) => {
        const date = dateString.replaceAll("T00:00:00.000Z", "");
        return { label: date, value: dateString };
    });
    return dateOptions;
}
