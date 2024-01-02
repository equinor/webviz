import React from "react";

import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, TimeType, useSurfaceDirectoryQuery } from "@modules/_shared/Surface";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import { isEqual } from "lodash";

import { IntersectionSettingsSelect } from "./components/intersectionSettings";
import { RealizationsSelect } from "./components/realizationsSelect";
import { TogglableMultiSelect } from "./components/togglableMultiSelect";
import { State } from "./state";
import { RealizationsSurfaceSetSpec, StatisticalSurfaceSetSpec } from "./types";

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);

    const statusWriter = useSettingsStatusWriter(moduleContext);

    const wellboreType = "smda";

    const setStatisticalSurfaceSetSpec = moduleContext.useSetStoreValue("statisticalSurfaceSetSpec");
    const setRealizationsSurfaceSetSpec = moduleContext.useSetStoreValue("realizationsSurfaceSetSpec");

    const setWellboreAddress = moduleContext.useSetStoreValue("wellboreAddress");

    const [intersectionSettings, setIntersectionSettings] = moduleContext.useStoreState("intersectionSettings");

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
    if (!selectedReals && availableReals) {
        setSelectedReals(availableReals.map((real) => real));
    }
    // Queries
    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
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
    const [statisticalSurfaceNames, setStatisticalSurfaceNames] = React.useState<string[] | null>(null);
    const [showRealizationSurfaces, setShowRealizationSurfaces] = React.useState<boolean>(true);
    const [realizationsSurfaceNames, setRealizationsSurfaceNames] = React.useState<string[] | null>(null);
    const availableSurfaceNames = surfaceDirectory ? surfaceDirectory.getSurfaceNames(selectedSurfaceAttribute) : null;
    if (!realizationsSurfaceNames && availableSurfaceNames) {
        setRealizationsSurfaceNames([availableSurfaceNames[0]]);
    }
    const surfaceAttrOptions = surfaceDirectory
        ? surfaceDirectory.getAttributeNames(null).map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];

    React.useEffect(
        function propagateStatisticalSurfaceSetSpecToView() {
            let surfaceSetSpec: StatisticalSurfaceSetSpec | null = null;
            if (
                showRealizationSurfaces &&
                computedEnsembleIdent &&
                selectedSurfaceAttribute &&
                statisticalSurfaceNames
            ) {
                surfaceSetSpec = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensembleName: computedEnsembleIdent.getEnsembleName(),
                    realizationNums: selectedReals,
                    attribute: selectedSurfaceAttribute,
                    names: statisticalSurfaceNames,
                    statistics: [
                        SurfaceStatisticFunction_api.MEAN,
                        SurfaceStatisticFunction_api.MIN,
                        SurfaceStatisticFunction_api.MAX,
                    ],
                };
            }
            setStatisticalSurfaceSetSpec(surfaceSetSpec);
        },
        [
            computedEnsembleIdent,
            selectedSurfaceAttribute,
            statisticalSurfaceNames,
            selectedReals,
            showRealizationSurfaces,
        ]
    );
    React.useEffect(
        function propagateRealizationsSurfaceSetSpecToView() {
            let surfaceSetSpec: RealizationsSurfaceSetSpec | null = null;
            if (computedEnsembleIdent && selectedSurfaceAttribute && realizationsSurfaceNames) {
                surfaceSetSpec = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensembleName: computedEnsembleIdent.getEnsembleName(),
                    realizationNums: selectedReals,
                    attribute: selectedSurfaceAttribute,
                    names: realizationsSurfaceNames,
                };
            }
            setRealizationsSurfaceSetSpec(surfaceSetSpec);
        },
        [computedEnsembleIdent, selectedSurfaceAttribute, realizationsSurfaceNames, selectedReals]
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

                    <RealizationsSelect
                        availableRealizations={availableReals?.map((real) => real) ?? []}
                        selectedRealizations={selectedReals ?? []}
                        onChange={setSelectedReals}
                    />
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
            <CollapsibleGroup title="Surfaces" expanded>
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
                        <TogglableMultiSelect
                            values={availableSurfaceNames ?? []}
                            label="Show statistical surfaces"
                            onChange={setStatisticalSurfaceNames}
                        />

                        <div>
                            <Label wrapperClassName="flex gap-2" text="Show realization surfaces">
                                <Checkbox
                                    onChange={(e: any) => setShowRealizationSurfaces(e.target.checked)}
                                    checked={showRealizationSurfaces}
                                />
                            </Label>
                            {showRealizationSurfaces && (
                                <Select
                                    options={availableSurfaceNames?.map((name) => ({ label: name, value: name })) ?? []}
                                    onChange={(e) => setRealizationsSurfaceNames(e)}
                                    value={realizationsSurfaceNames ?? []}
                                    size={5}
                                    multiple={true}
                                />
                            )}
                        </div>
                    </div>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection Settings" expanded={false}>
                <IntersectionSettingsSelect
                    intersectionSettings={intersectionSettings}
                    onChange={setIntersectionSettings}
                />
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
