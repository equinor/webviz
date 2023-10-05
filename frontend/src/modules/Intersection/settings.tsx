import React from "react";

import { SurfaceAttributeType_api } from "@api";
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
import {
    SurfaceAddress,
    SurfaceAddressFactory,
    SurfaceDirectory,
    TimeType,
    useSurfaceDirectoryQuery,
} from "@modules/_shared/Surface";

import { isEqual } from "lodash";

import { useGetWellHeaders } from "./queryHooks";
import { state } from "./state";

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<state>) {
    const [viewSettings, setViewSettings] = moduleContext.useStoreState("viewSettings");
    const [selectedWellBore, setSelectedWellBore] = React.useState<Wellbore | null>(
        moduleContext.useStoreValue("wellBoreAddress")
    );

    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const wellHeadersQuery = useGetWellHeaders(computedEnsembleIdent?.getCaseUuid());
    const availableWellBores: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: "smda",
            uwi: wellbore.unique_wellbore_identifier,
            uuid: wellbore.wellbore_uuid,
        })) || [];
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    const computedWellBore = fixupSyncedOrSelectedOrFirstWellBore(
        syncedWellBore || null,
        selectedWellBore || null,
        availableWellBores.map((wellBore) => wellBore)
    );

    if (!isEqual(computedWellBore, selectedWellBore)) {
        setSelectedWellBore(computedWellBore);
    }
    let wellHeaderOptions: SelectOption[] = [];
    wellHeaderOptions = availableWellBores.map((header) => ({
        label: header.uwi,
        value: header.uuid,
    }));

    React.useEffect(
        function propagateWellBoreAddress() {
            moduleContext.getStateStore().setValue("wellBoreAddress", selectedWellBore);
        },
        [selectedWellBore]
    );

    // Mesh surface
    const surfDirQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const surfaceDirectory = new SurfaceDirectory(
        surfDirQuery.data
            ? {
                  surfaceMetas: surfDirQuery.data,
                  timeType: TimeType.None,
                  includeAttributeTypes: [SurfaceAttributeType_api.DEPTH],
              }
            : null
    );
    const fixedSurfSpec = fixupSurface(
        surfaceDirectory,
        {
            surfaceName: selectedSurfaceName,
            surfaceAttribute: selectedSurfaceAttribute,
            timeOrInterval: null,
        },
        {
            surfaceName: null,
            surfaceAttribute: null,
            timeOrInterval: null,
        }
    );
    const computedSurfaceName = fixedSurfSpec.surfaceName;
    const computedSurfaceAttribute = fixedSurfSpec.surfaceAttribute;

    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }
    React.useEffect(
        function propagateSurfaceSelectionToView() {
            let surfAddr: SurfaceAddress | null = null;

            if (computedEnsembleIdent && computedSurfaceName && computedSurfaceAttribute) {
                const addrFactory = new SurfaceAddressFactory(
                    computedEnsembleIdent.getCaseUuid(),
                    computedEnsembleIdent.getEnsembleName(),
                    computedSurfaceName,
                    computedSurfaceAttribute,
                    null
                );

                // if (aggregation === null) {
                surfAddr = addrFactory.createRealizationAddress(0);
                // } else {
                // surfAddr = addrFactory.createStatisticalAddress(aggregation);
                // }
            }

            console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
            moduleContext.getStateStore().setValue("surfaceAddress", surfAddr);
        },
        [selectedEnsembleIdent, selectedSurfaceName, selectedSurfaceAttribute]
    );
    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    surfNameOptions = surfaceDirectory.getSurfaceNames(null).map((name) => ({ value: name, label: name }));
    surfAttributeOptions = surfaceDirectory
        .getAttributeNames(computedSurfaceName)
        .map((attr) => ({ value: attr, label: attr }));

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
    return (
        <div>
            <CollapsibleGroup expanded={true} title="Well trajectory">
                <ApiStateWrapper
                    apiResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <Select
                            options={wellHeaderOptions}
                            value={computedWellBore ? [computedWellBore.uuid] : []}
                            onChange={(selectedWellBoreUuids: string[]) =>
                                handleWellChange(selectedWellBoreUuids, wellHeaderOptions)
                            }
                            size={10}
                            multiple={true}
                        />
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
            {/* <CollapsibleGroup expanded={false} title="Well picks">
                <LabelledCheckbox
                    label="Show wellpicks"
                    checked={viewSettings?.showWellMarkers}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setViewSettings({ ...viewSettings, showWellMarkers: e.target.checked })
                    }
                />
            </CollapsibleGroup> */}
            <CollapsibleGroup expanded={true} title="Depth surface">
                <ApiStateWrapper
                    apiResult={surfDirQuery}
                    errorComponent={"Error loading surface directory"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label
                        text="Stratigraphic name"
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
                        text="Attribute"
                        labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                    >
                        <Select
                            options={surfAttributeOptions}
                            value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                            onChange={handleSurfAttributeSelectionChange}
                            size={5}
                        />
                    </Label>
                </ApiStateWrapper>
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

function fixupSyncedOrSelectedOrFirstWellBore(
    syncedValue: Wellbore | null,
    selectedValue: Wellbore | null,
    values: Wellbore[]
): Wellbore | null {
    const allUuids = values.map((value) => value.uuid);
    if (syncedValue && allUuids.includes(syncedValue.uuid)) {
        return syncedValue;
    }
    if (selectedValue && allUuids.includes(selectedValue.uuid)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

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
        const selectedTimeOrIntervals = surfaceDirectory.getTimeOrIntervalStrings(
            finalSurfaceName,
            finalSurfaceAttribute
        );
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
