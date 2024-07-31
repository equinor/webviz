import React from "react";

import { Grid3dInfo_api, WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { TableSelect, TableSelectOption } from "@lib/components/TableSelect";
import { ColorScale } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { isoIntervalStringToDateLabel, isoStringToDateLabel } from "@modules/_shared/utils/isoDatetimeStringFormatting";
import { Delete, Edit } from "@mui/icons-material";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import {
    addCustomIntersectionPolylineEditModeActiveAtom,
    colorScaleAtom,
    editCustomIntersectionPolylineEditModeActiveAtom,
    intersectionExtensionLengthAtom,
    intersectionTypeAtom,
    showGridlinesAtom,
    showIntersectionAtom,
    useCustomBoundsAtom,
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGridCellIndexRangesAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedHighlightedWellboreUuidAtom,
    userSelectedRealizationAtom,
    userSelectedWellboreUuidsAtom,
} from "./atoms/baseAtoms";
import {
    availableRealizationsAtom,
    gridModelDimensionsAtom,
    selectedEnsembleIdentAtom,
    selectedGridCellIndexRangesAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedHighlightedWellboreUuidAtom,
    selectedRealizationAtom,
    selectedWellboreUuidsAtom,
} from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom, gridModelInfosQueryAtom } from "./atoms/queryAtoms";
import { GridCellIndexFilter } from "./components/gridCellIndexFilter";
import { WellboreSelector } from "./components/wellboreSelector";

import { Interfaces } from "../interfaces";
import { GridCellIndexRanges } from "../typesAndEnums";

export function Settings(props: ModuleSettingsProps<Interfaces>): JSX.Element {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [showGridLines, setShowGridLines] = useAtom(showGridlinesAtom);
    const [showIntersection, setShowIntersection] = useAtom(showIntersectionAtom);
    const [intersectionExtensionLength, setIntersectionExtensionLength] = useAtom(intersectionExtensionLengthAtom);
    const setPolylineEditModeActive = useSetAtom(editCustomIntersectionPolylineEditModeActiveAtom);

    const [prevSyncedIntersection, setPrevSyncedIntersection] = React.useState<Intersection | null>(null);
    const [prevSyncedEnsembles, setPrevSyncedEnsembles] = React.useState<EnsembleIdent[] | null>(null);
    const [pickSingleGridCellIndexI, setPickSingleGridCellIndexI] = React.useState<boolean>(false);
    const [pickSingleGridCellIndexJ, setPickSingleGridCellIndexJ] = React.useState<boolean>(false);
    const [pickSingleGridCellIndexK, setPickSingleGridCellIndexK] = React.useState<boolean>(false);
    const [customPolylineFilterText, setCustomPolylineFilterText] = React.useState<string>("");

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");

    const polylineAddModeActive = useAtomValue(addCustomIntersectionPolylineEditModeActiveAtom);

    const [intersectionType, setIntersectionType] = useAtom(intersectionTypeAtom);

    const gridModelDimensions = useAtomValue(gridModelDimensionsAtom);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const selectedRealization = useAtomValue(selectedRealizationAtom);
    const setSelectedRealization = useSetAtom(userSelectedRealizationAtom);

    const gridModelInfos = useAtomValue(gridModelInfosQueryAtom);
    const wellHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);

    const selectedWellboreUuids = useAtomValue(selectedWellboreUuidsAtom);
    const setSelectedWellboreUuids = useSetAtom(userSelectedWellboreUuidsAtom);

    const selectedGridModelName = useAtomValue(selectedGridModelNameAtom);
    const setSelectedGridModelName = useSetAtom(userSelectedGridModelNameAtom);

    const selectedGridModelParameterName = useAtomValue(selectedGridModelParameterNameAtom);
    const setSelectedGridModelParameterName = useSetAtom(userSelectedGridModelParameterNameAtom);

    const selectedGridModelParameterDateOrInterval = useAtomValue(selectedGridModelParameterDateOrIntervalAtom);
    const setSelectedGridModelParameterDateOrInterval = useSetAtom(userSelectedGridModelParameterDateOrIntervalAtom);

    const selectedWellboreHeader = useAtomValue(selectedHighlightedWellboreUuidAtom);
    const setSelectedWellboreHeader = useSetAtom(userSelectedHighlightedWellboreUuidAtom);

    const availableUserCreatedIntersectionPolylines = useIntersectionPolylines(props.workbenchSession).getPolylines();
    const selectedCustomIntersectionPolylineId = useAtomValue(userSelectedCustomIntersectionPolylineIdAtom);
    const setSelectedCustomIntersectionPolylineId = useSetAtom(userSelectedCustomIntersectionPolylineIdAtom);

    const selectedGridCellIndexRanges = useAtomValue(selectedGridCellIndexRangesAtom);
    const setSelectedGridCellIndexRanges = useSetAtom(userSelectedGridCellIndexRangesAtom);

    const [colorScale, setColorScale] = useAtom(colorScaleAtom);
    const [useCustomBounds, setUseCustomBounds] = useAtom(useCustomBoundsAtom);

    if (!isEqual(syncedIntersection, prevSyncedIntersection)) {
        setPrevSyncedIntersection(syncedIntersection);
        if (syncedIntersection) {
            setIntersectionType(syncedIntersection.type);

            if (syncedIntersection.type === IntersectionType.WELLBORE) {
                setSelectedWellboreHeader(syncedIntersection.uuid);
            } else if (syncedIntersection.type === IntersectionType.CUSTOM_POLYLINE) {
                setSelectedCustomIntersectionPolylineId(syncedIntersection.uuid);
            }
        }
    }

    if (!isEqual(syncedEnsembles, prevSyncedEnsembles)) {
        setPrevSyncedEnsembles(syncedEnsembles);
        if (syncedEnsembles) {
            setSelectedEnsembleIdent(syncedEnsembles[0]);
        }
    }

    const gridModelErrorMessage = usePropagateApiErrorToStatusWriter(gridModelInfos, statusWriter) ?? "";
    const wellHeadersErrorMessage = usePropagateApiErrorToStatusWriter(wellHeaders, statusWriter) ?? "";

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
        syncHelper.publishValue(
            SyncSettingKey.ENSEMBLE,
            "global.syncValue.ensembles",
            ensembleIdent ? [ensembleIdent] : []
        );
    }

    function handleRealizationSelectionChange(realization: string) {
        setSelectedRealization(parseInt(realization));
    }

    function handleGridModelSelectionChange(gridModelName: string[]) {
        setSelectedGridModelName(gridModelName.at(0) ?? null);
    }

    function handleGridParameterSelectionChange(gridParameterName: string[]) {
        setSelectedGridModelParameterName(gridParameterName.at(0) ?? null);
    }

    function handleGridParameterDateOrIntervalSelectionChange(dateOrInterval: string[]) {
        setSelectedGridModelParameterDateOrInterval(dateOrInterval.at(0) ?? null);
    }

    function handleWellHeaderSelectionChange(wellHeader: string[]) {
        const uuid = wellHeader.at(0);
        setSelectedWellboreHeader(uuid ?? null);
        const intersection: Intersection = {
            type: IntersectionType.WELLBORE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleShowGridLinesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowGridLines(event.target.checked);
    }
    function handleShowIntersectionChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowIntersection(event.target.checked);
    }
    function handleIntersectionExtensionLengthChange(event: React.ChangeEvent<HTMLInputElement>) {
        setIntersectionExtensionLength(parseFloat(event.target.value));
    }

    function handleIntersectionTypeChange(_: React.ChangeEvent<HTMLInputElement>, type: IntersectionType) {
        setIntersectionType(type);
    }

    function handleEditPolyline() {
        setPolylineEditModeActive(true);
    }

    function handleCustomPolylineSelectionChange(customPolylineId: string[]) {
        setSelectedCustomIntersectionPolylineId(customPolylineId.at(0) ?? null);
        const uuid = customPolylineId.at(0) ?? null;
        setSelectedCustomIntersectionPolylineId(uuid);
        const intersection: Intersection = {
            type: IntersectionType.CUSTOM_POLYLINE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleRemoveCustomPolyline() {
        if (selectedCustomIntersectionPolylineId) {
            props.workbenchSession
                .getUserCreatedItems()
                .getIntersectionPolylines()
                .remove(selectedCustomIntersectionPolylineId);
        }
    }

    function handleGridCellIndexRangesChange(direction: "i" | "j" | "k", value: [number, number]) {
        const newGridCellIndexRanges: GridCellIndexRanges = {
            ...selectedGridCellIndexRanges,
            [direction]: value,
        };
        setSelectedGridCellIndexRanges(newGridCellIndexRanges);
    }

    function handleCustomPolylineFilterTextChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCustomPolylineFilterText(e.target.value);
    }

    function handleColorScaleChange(colorScale: ColorScale, areBoundariesUserDefined: boolean) {
        setColorScale(colorScale);
        setUseCustomBounds(areBoundariesUserDefined);
    }

    const realizationOptions = makeRealizationOptions(availableRealizations);
    const gridModelInfo = gridModelInfos.data?.find((info) => info.grid_name === selectedGridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr
            .filter((el) => el.property_name === selectedGridModelParameterName)
            .map((el) => el.iso_date_or_interval) ?? [];

    return (
        <div className="flex flex-col gap-1">
            <CollapsibleGroup title="Ensemble & realization" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Ensemble">
                        <EnsembleDropdown
                            ensembleSet={ensembleSet}
                            value={selectedEnsembleIdent}
                            onChange={handleEnsembleSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </Label>
                    <Label text="Realization">
                        <Dropdown
                            options={realizationOptions}
                            value={selectedRealization?.toString()}
                            onChange={handleRealizationSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Well data" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Drilled Well trajectories">
                        <PendingWrapper isPending={wellHeaders.isFetching} errorMessage={wellHeadersErrorMessage}>
                            <WellboreSelector
                                wellboreHeaders={wellHeaders.data ?? []}
                                selectedWellboreUuids={selectedWellboreUuids}
                                onSelectedWellboreUuidsChange={setSelectedWellboreUuids}
                            />
                        </PendingWrapper>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Grid model" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Grid model">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridModelOptions(gridModelInfos.data ?? [])}
                                value={selectedGridModelName ? [selectedGridModelName] : []}
                                onChange={handleGridModelSelectionChange}
                                size={5}
                                debounceTimeMs={600}
                            />
                        </PendingWrapper>
                    </Label>
                    <Label text="Grid parameter">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridParameterNameOptions(gridModelInfo)}
                                value={selectedGridModelParameterName ? [selectedGridModelParameterName] : []}
                                onChange={handleGridParameterSelectionChange}
                                size={5}
                                debounceTimeMs={600}
                            />
                        </PendingWrapper>
                    </Label>
                    <Label text="Grid date or interval">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridParameterDateOrIntervalOptions(datesOrIntervalsForSelectedParameter)}
                                value={
                                    selectedGridModelParameterDateOrInterval
                                        ? [selectedGridModelParameterDateOrInterval]
                                        : []
                                }
                                onChange={handleGridParameterDateOrIntervalSelectionChange}
                                size={5}
                                debounceTimeMs={600}
                                filter
                            />
                        </PendingWrapper>
                    </Label>
                    <Label text="Color scale">
                        <ColorScaleSelector
                            workbenchSettings={props.workbenchSettings}
                            colorScale={colorScale ?? undefined}
                            onChange={handleColorScaleChange}
                            areBoundariesUserDefined={useCustomBounds}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Grid cell filter" expanded>
                <div className="flex flex-col gap-4">
                    <GridCellIndexFilter
                        labelTitle="I filter"
                        max={gridModelDimensions?.i_count ?? 0}
                        range={selectedGridCellIndexRanges.i}
                        pickSingle={pickSingleGridCellIndexI}
                        onPickSingleChange={setPickSingleGridCellIndexI}
                        onChange={(range) => handleGridCellIndexRangesChange("i", range)}
                    />
                    <GridCellIndexFilter
                        labelTitle="J filter"
                        max={gridModelDimensions?.j_count ?? 0}
                        range={selectedGridCellIndexRanges.j}
                        pickSingle={pickSingleGridCellIndexJ}
                        onPickSingleChange={setPickSingleGridCellIndexJ}
                        onChange={(range) => handleGridCellIndexRangesChange("j", range)}
                    />
                    <GridCellIndexFilter
                        labelTitle="K filter"
                        max={gridModelDimensions?.k_count ?? 0}
                        range={selectedGridCellIndexRanges.k}
                        pickSingle={pickSingleGridCellIndexK}
                        onPickSingleChange={setPickSingleGridCellIndexK}
                        onChange={(range) => handleGridCellIndexRangesChange("k", range)}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection" expanded>
                <Label text="Show intersection" position="left">
                    <Switch checked={showIntersection} onChange={handleShowIntersectionChange} />
                </Label>
                <div className="flex flex-col gap-4 text-sm mb-4">
                    <RadioGroup
                        options={[
                            {
                                label: "Use wellbore",
                                value: IntersectionType.WELLBORE,
                            },
                            {
                                label: "Use custom polyline",
                                value: IntersectionType.CUSTOM_POLYLINE,
                            },
                        ]}
                        value={intersectionType}
                        onChange={handleIntersectionTypeChange}
                        direction="horizontal"
                    />
                    <div className={resolveClassNames({ hidden: intersectionType !== IntersectionType.WELLBORE })}>
                        <PendingWrapper isPending={wellHeaders.isFetching} errorMessage={wellHeadersErrorMessage}>
                            <Select
                                options={makeWellHeaderOptions(wellHeaders.data ?? [])}
                                value={selectedWellboreHeader ? [selectedWellboreHeader] : []}
                                onChange={handleWellHeaderSelectionChange}
                                size={5}
                                filter
                                debounceTimeMs={600}
                                disabled={intersectionType !== IntersectionType.WELLBORE}
                            />
                        </PendingWrapper>
                    </div>
                    <div
                        className={resolveClassNames({ hidden: intersectionType !== IntersectionType.CUSTOM_POLYLINE })}
                    >
                        <Input
                            type="text"
                            value={customPolylineFilterText}
                            onChange={handleCustomPolylineFilterTextChange}
                            placeholder="Filter options..."
                        />
                        <TableSelect
                            options={makeCustomIntersectionPolylineOptions(
                                availableUserCreatedIntersectionPolylines,
                                selectedCustomIntersectionPolylineId,
                                customPolylineFilterText,
                                <div className="flex items-center">
                                    <div
                                        onClick={handleEditPolyline}
                                        className="p-1 hover:underline cursor-pointer hover:text-blue-200"
                                        title="Edit polyline"
                                    >
                                        <Edit fontSize="small" />
                                    </div>
                                    <div
                                        onClick={handleRemoveCustomPolyline}
                                        className="p-1 hover:underline cursor-pointer hover:text-red-400"
                                        title="Remove polyline"
                                    >
                                        <Delete fontSize="small" />
                                    </div>
                                </div>
                            )}
                            value={selectedCustomIntersectionPolylineId ? [selectedCustomIntersectionPolylineId] : []}
                            headerLabels={["Polyline name", "Actions"]}
                            onChange={handleCustomPolylineSelectionChange}
                            size={5}
                            columnSizesInPercent={[80, 20]}
                            debounceTimeMs={600}
                            disabled={intersectionType !== IntersectionType.CUSTOM_POLYLINE || polylineAddModeActive}
                        />
                    </div>
                    <Label text="Intersection extension length">
                        <Input
                            type="number"
                            value={intersectionExtensionLength}
                            min={0}
                            onChange={handleIntersectionExtensionLengthChange}
                            debounceTimeMs={600}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Visualization options" expanded>
                <Label text="Show grid lines" position="left">
                    <Switch checked={showGridLines} onChange={handleShowGridLinesChange} />
                </Label>
            </CollapsibleGroup>
        </div>
    );
}

function makeRealizationOptions(realizations: readonly number[]): SelectOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeGridModelOptions(gridModelsInfo: Grid3dInfo_api[]): SelectOption[] {
    return gridModelsInfo.map((gridModel) => ({ label: gridModel.grid_name, value: gridModel.grid_name }));
}

function makeGridParameterNameOptions(gridModelInfo: Grid3dInfo_api | null): SelectOption[] {
    if (!gridModelInfo) {
        return [];
    }
    const reduced = gridModelInfo.property_info_arr.reduce((acc, info) => {
        if (!acc.includes(info.property_name)) {
            acc.push(info.property_name);
        }
        return acc;
    }, [] as string[]);

    return reduced.map((info) => ({
        label: info,
        value: info,
    }));
}

function makeGridParameterDateOrIntervalOptions(datesOrIntervals: (string | null)[]): SelectOption[] {
    const reduced = datesOrIntervals.sort().reduce((acc, info) => {
        if (info === null) {
            return acc;
        } else if (!acc.map((el) => el.value).includes(info)) {
            acc.push({
                label: info.includes("/") ? isoIntervalStringToDateLabel(info) : isoStringToDateLabel(info),
                value: info,
            });
        }
        return acc;
    }, [] as SelectOption[]);

    return reduced;
}

function makeWellHeaderOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        value: wellHeader.wellboreUuid,
        label: wellHeader.uniqueWellboreIdentifier,
    }));
}

function makeCustomIntersectionPolylineOptions(
    polylines: IntersectionPolyline[],
    selectedId: string | null,
    filter: string,
    actions: React.ReactNode
): TableSelectOption[] {
    return polylines
        .filter((polyline) => polyline.name.includes(filter))
        .map((polyline) => ({
            id: polyline.id,
            values: [
                { label: polyline.name },
                { label: "", adornment: selectedId === polyline.id ? actions : undefined },
            ],
        }));
}
