import React from "react";

import { SurfaceAttributeType_api } from "@api";
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
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, TimeType, useSurfaceDirectoryQuery } from "@modules/_shared/Surface";
import { useGetWellHeaders } from "@modules/_shared/WellBore";

import { isEqual } from "lodash";

import { State, SurfaceSetSpec } from "./state";

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);

    const statusWriter = useSettingsStatusWriter(moduleContext);

    const wellboreType = "smda";

    const setSurfaceSetSpec = moduleContext.useSetStoreValue("surfaceSetSpec");
    const setWellboreAddress = moduleContext.useSetStoreValue("wellboreAddress");
    const [extension, setExtension] = moduleContext.useStoreState("extension");
    const [zScale, setZScale] = moduleContext.useStoreState("zScale");

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    const [selectedWellboreAddress, setSelectedWellboreAddress] = React.useState<Wellbore | null>(
        moduleContext.useStoreValue("wellboreAddress")
    );

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const availableReals = selectedEnsembleIdent
        ? ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations()
        : null;
    const [selectedReals, setSelectedReals] = React.useState<number[] | null>(null);

    if (availableReals && selectedReals) {
        const newSelectedReals = selectedReals.filter((real) => availableReals.includes(real));
        if (newSelectedReals.length === 0) {
            setSelectedReals(availableReals.map((real) => real));
        } else if (!isEqual(newSelectedReals, selectedReals)) {
            setSelectedReals(newSelectedReals);
        }
    } else {
        if (availableReals && !selectedReals) {
            setSelectedReals(availableReals.map((real) => real));
        }
    }
    console.log(selectedReals);
    // Queries
    const wellHeadersQuery = useGetWellHeaders(computedEnsembleIdent?.getCaseUuid());
    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    if (wellHeadersQuery.isError) {
        statusWriter.addError("Error loading well headers");
    }
    if (surfaceDirectoryQuery.isError) {
        statusWriter.addError("Error loading surface directory");
    }

    // Handling well headers query
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: wellboreType,
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

    // Handling seismic cube directory query
    const surfaceDirectory = surfaceDirectoryQuery.data
        ? new SurfaceDirectory({
              surfaceMetas: surfaceDirectoryQuery.data,
              timeType: TimeType.None,
              includeAttributeTypes: [SurfaceAttributeType_api.DEPTH],
          })
        : null;

    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = useValidState<string | null>(
        null,
        surfaceDirectory?.getAttributeNames(null) ?? []
    );
    const [selectedSurfaceNames, setSelectedSurfaceNames] = React.useState<string[] | null>(null);
    const availableSurfaceNames = surfaceDirectory ? surfaceDirectory.getSurfaceNames(selectedSurfaceAttribute) : null;
    if (availableSurfaceNames && selectedSurfaceNames) {
        const newSelectedSurfaceNames = selectedSurfaceNames.filter((name) => availableSurfaceNames.includes(name));
        if (newSelectedSurfaceNames.length === 0) {
            setSelectedSurfaceNames(availableSurfaceNames);
        } else if (!isEqual(newSelectedSurfaceNames, selectedSurfaceNames)) {
            setSelectedSurfaceNames(newSelectedSurfaceNames);
        }
    }

    const surfaceAttrOptions = surfaceDirectory
        ? surfaceDirectory.getAttributeNames(null).map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];
    const surfaceNameOptions = surfaceDirectory
        ? surfaceDirectory.getSurfaceNames(selectedSurfaceAttribute).map((surfaceName) => {
              return { label: surfaceName, value: surfaceName };
          })
        : [];

    React.useEffect(
        function sendSurfaceSetSpecToView() {
            let surfaceSetSpec: SurfaceSetSpec | null = null;
            if (computedEnsembleIdent && selectedSurfaceAttribute && selectedSurfaceNames) {
                surfaceSetSpec = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensembleName: computedEnsembleIdent.getEnsembleName(),
                    realizationNums: selectedReals,
                    attribute: selectedSurfaceAttribute,
                    names: selectedSurfaceNames,
                };
            }
            setSurfaceSetSpec(surfaceSetSpec);
        },
        [computedEnsembleIdent, selectedSurfaceAttribute, selectedSurfaceNames, selectedReals]
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

    function handleSurfaceAttributeChange(values: string[]) {
        if (values.length === 0) {
            setSelectedSurfaceAttribute(null);
            return;
        }
        setSelectedSurfaceAttribute(values[0]);
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

        const newWellboreAddress: Wellbore = { type: wellboreType, uuid: wellboreUuid, uwi: wellUwi };
        setSelectedWellboreAddress(newWellboreAddress);
        syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", newWellboreAddress);
    }

    function handleExtensionChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newExtension = parseInt(event.target.value, 10);
        if (newExtension >= 0) {
            setExtension(newExtension);
        }
    }
    function handleZScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newZScale = parseInt(event.target.value, 10);
        if (newZScale >= 0) {
            setZScale(newZScale);
        }
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
                    <Label text="Realizations">
                        <Select
                            options={availableReals?.map((real) => ({ label: `${real}`, value: `${real}` })) ?? []}
                            value={selectedReals ? selectedReals.map((real) => `${real}`) : []}
                            onChange={(values: string[]) => {
                                setSelectedReals(values.map((value) => parseInt(value, 10)));
                            }}
                            size={8}
                            multiple={true}
                        />
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
            <CollapsibleGroup title="Surface">
                <ApiStateWrapper
                    apiResult={surfaceDirectoryQuery}
                    errorComponent={"Error loading seismic directory"}
                    loadingComponent={<CircularProgress />}
                >
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <Label text="Surface attribute">
                            <Select
                                options={surfaceAttrOptions}
                                value={selectedSurfaceAttribute ? [selectedSurfaceAttribute] : []}
                                size={5}
                                onChange={handleSurfaceAttributeChange}
                            />
                        </Label>
                        <Label text="Surface name">
                            <Select
                                options={surfaceNameOptions}
                                value={selectedSurfaceNames ? selectedSurfaceNames : []}
                                onChange={setSelectedSurfaceNames}
                                size={8}
                                multiple={true}
                            />
                        </Label>
                    </div>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection Settings" expanded={false}>
                <Label text="Extension">
                    <Input type={"number"} value={extension} onChange={handleExtensionChange} />
                </Label>
                <Label text="Z-scale">
                    <Input type={"number"} value={zScale} onChange={handleZScaleChange} />
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
    // '2018-01-01T00:00:00.000Z--2019-07-01T00:00:00.000Z' to '2018-01-01--2019-07-01'
    const options = timeOrIntervalStrings.map((elm) => {
        const date = elm.replaceAll("T00:00:00.000Z", "");
        return { label: date, value: elm };
    });
    return options;
}
