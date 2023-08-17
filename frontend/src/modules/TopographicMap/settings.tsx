import React from "react";

import { DynamicSurfaceDirectory_api, StaticSurfaceDirectory_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { SumoContent_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { AggregationSelector } from "./components/AggregationSelector";
import { useGetWellHeaders, useSurfaceDirectory } from "./queryHooks";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
type LabelledSwitchProps = {
    label: string;
    checked: boolean;
    onChange: any;
};

function LabelledSwitch(props: LabelledSwitchProps): JSX.Element {
    return (
        <Label wrapperClassName=" text-xs flow-root" labelClassName="float-left text-xs" text={props.label}>
            <div className=" float-right">
                <Checkbox onChange={props.onChange} checked={props.checked} />
            </div>
        </Label>
    );
}

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [selectedWellUuids, setSelectedWellUuids] = moduleContext.useStoreState("selectedWellUuids");

    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const [showContour, setShowContour] = React.useState(false);
    const [showGrid, setShowGrid] = React.useState(false);
    const [showSmoothShading, setShowSmoothShading] = React.useState(false);
    const [showMaterial, setShowMaterial] = React.useState(false);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const surfDirQuery = useSurfaceDirectory(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName(),
        [SumoContent_api.DEPTH]
    );

    let computedSurfaceName: string | null = null;
    let computedSurfaceAttribute: string | null = null;

    if (surfDirQuery.data) {
        computedSurfaceName = fixupStringValueFromList(selectedSurfaceName, surfDirQuery.data.names);
        computedSurfaceAttribute = fixupStaticSurfAttribute(
            computedSurfaceName,
            selectedSurfaceAttribute,
            surfDirQuery.data
        );
    }

    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }

    React.useEffect(
        function propagateSurfaceSelectionToView() {
            let surfAddr: SurfAddr | null = null;
            if (computedEnsembleIdent && computedSurfaceName && computedSurfaceAttribute) {
                const addrFactory = new SurfAddrFactory(
                    computedEnsembleIdent.getCaseUuid(),
                    computedEnsembleIdent.getEnsembleName(),
                    computedSurfaceName,
                    computedSurfaceAttribute
                );

                if (aggregation === null) {
                    surfAddr = addrFactory.createStaticAddr(realizationNum);
                } else {
                    surfAddr = addrFactory.createStatisticalStaticAddr(aggregation);
                }
            }

            console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
            moduleContext.getStateStore().setValue("surfaceAddress", surfAddr);
        },
        [selectedEnsembleIdent, selectedSurfaceName, selectedSurfaceAttribute, aggregation, realizationNum]
    );

    React.useEffect(
        function propogateSurfaceSettingsToView() {
            moduleContext.getStateStore().setValue("surfaceSettings", {
                contours: showContour,
                gridLines: showGrid,
                smoothShading: showSmoothShading,
                material: showMaterial,
            });
        },
        [showContour, showGrid, showSmoothShading, showMaterial]
    );
    const wellHeadersQuery = useGetWellHeaders(computedEnsembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }

    function handleWellsChange(selectedWellUuids: string[], allWellUuidsOptions: SelectOption[]) {
        console.log(selectedWellUuids);
        console.log(allWellUuidsOptions);
        let newSelectedWellUuids = selectedWellUuids.filter((wellUuid) =>
            allWellUuidsOptions.some((wellHeader) => wellHeader.value === wellUuid)
        );
        console.log(newSelectedWellUuids);
        setSelectedWellUuids(newSelectedWellUuids);
    }

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
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
    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
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
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
        if (newAttr && computedSurfaceName) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: computedSurfaceName,
                attribute: newAttr,
            });
        }
    }
    function handleAggregationChanged(aggregation: SurfaceStatisticFunction_api | null) {
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }

    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];

    let validAttrNames: string[] = [];

    if (surfDirQuery.data) {
        validAttrNames = getValidAttributesForSurfName(computedSurfaceName ?? "", surfDirQuery.data);
        surfNameOptions = surfDirQuery.data.names.map((name) => ({ value: name, label: name }));
    }

    surfAttributeOptions = validAttrNames.map((attr) => ({ value: attr, label: attr }));
    return (
        <div>
            <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent ? computedEnsembleIdent : null}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <ApiStateWrapper
                apiResult={surfDirQuery}
                errorComponent={"Error loading surface directory"}
                loadingComponent={<CircularProgress />}
            >
                <Label
                    text="Stratigraphic unit top/base"
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
                <AggregationSelector
                    selectedAggregation={aggregation}
                    onAggregationSelectorChange={handleAggregationChanged}
                />
                {aggregation === null && (
                    <Label text="Realization:">
                        <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
                    </Label>
                )}
            </ApiStateWrapper>
            <ApiStateWrapper
                apiResult={wellHeadersQuery}
                errorComponent={"Error loading wells"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Official Wells">
                    <Select
                        options={wellHeaderOptions}
                        value={selectedWellUuids}
                        onChange={(selectedWellUuids: string[]) =>
                            handleWellsChange(selectedWellUuids, wellHeaderOptions)
                        }
                        size={20}
                        multiple={true}
                    />
                </Label>
            </ApiStateWrapper>
            <div>
                <div className="p-2">
                    <LabelledSwitch
                        label="Contours"
                        checked={showContour}
                        onChange={(e: any) => setShowContour(e.target.checked)}
                    />
                    <LabelledSwitch
                        label="Grid lines"
                        checked={showGrid}
                        onChange={(e: any) => setShowGrid(e.target.checked)}
                    />
                    <LabelledSwitch
                        label="Smooth shading"
                        checked={showSmoothShading}
                        onChange={(e: any) => setShowSmoothShading(e.target.checked)}
                    />
                    <LabelledSwitch
                        label="Material"
                        checked={showMaterial}
                        onChange={(e: any) => setShowMaterial(e.target.checked)}
                    />
                </div>
            </div>
        </div>
    );
}
