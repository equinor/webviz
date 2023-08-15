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
import { useSurfaceDirectory } from "./queryHooks";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;

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

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }

    React.useEffect(function propagateSurfaceSelectionToView() {
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
    });

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()", newEnsembleIdent);

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

    if (!surfDirQuery.data) {
        return <div />;
    }

    const validAttrNames = getValidAttributesForSurfName(computedSurfaceName ?? "", surfDirQuery.data);
    surfNameOptions = surfDirQuery.data.names.map((name) => ({ value: name, label: name }));
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
        </div>
    );
}
