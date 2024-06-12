import React from "react";

import { Grid3dInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Switch } from "@lib/components/Switch";
import { ColorScale } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { isoIntervalStringToDateLabel, isoStringToDateLabel } from "@modules/_shared/utils/isoDatetimeStringFormatting";
import { useQuery } from "@tanstack/react-query";

import { cloneDeep, isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type GridLayerSettingsComponentProps = {
    layer: GridLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function GridLayerSettingsComponent(props: GridLayerSettingsComponentProps): React.ReactNode {
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<GridLayerSettings>(cloneDeep(settings));
    const [prevSettings, setPrevSettings] = React.useState<GridLayerSettings>(cloneDeep(settings));

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(cloneDeep(settings));
        setNewSettings(cloneDeep(settings));
    }

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const gridModelInfosQuery = useGridModelInfosQuery(newSettings.ensembleIdent, newSettings.realizationNum);

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        newSettings
    );
    if (!isEqual(fixupEnsembleIdent, newSettings.ensembleIdent)) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent: fixupEnsembleIdent }));
    }

    if (fixupEnsembleIdent) {
        const fixupRealizationNum = fixupSetting("realizationNum", ensembleFilterFunc(fixupEnsembleIdent), newSettings);
        if (!isEqual(fixupRealizationNum, newSettings.realizationNum)) {
            setNewSettings((prev) => ({ ...prev, realizationNum: fixupRealizationNum }));
        }
    }

    const gridModelInfo =
        gridModelInfosQuery.data?.find((info) => info.grid_name === newSettings.gridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr
            .filter((el) => el.property_name === newSettings.parameterName)
            .map((el) => el.iso_date_or_interval)
            .sort() ?? [];

    if (gridModelInfosQuery.data) {
        const fixupGridModelName = fixupSetting(
            "gridModelName",
            gridModelInfosQuery.data.map((el) => el.grid_name),
            newSettings
        );
        if (!isEqual(fixupGridModelName, newSettings.gridModelName)) {
            setNewSettings((prev) => ({ ...prev, gridModelName: fixupGridModelName }));
        }

        if (gridModelInfo) {
            const fixupParameterName = fixupSetting(
                "parameterName",
                gridModelInfo.property_info_arr.map((el) => el.property_name),
                newSettings
            );
            if (!isEqual(fixupParameterName, newSettings.parameterName)) {
                setNewSettings((prev) => ({ ...prev, parameterName: fixupParameterName }));
            }

            const fixupParameterDateOrInterval = fixupSetting(
                "parameterDateOrInterval",
                datesOrIntervalsForSelectedParameter,
                newSettings
            );
            if (!isEqual(fixupParameterDateOrInterval, newSettings.parameterDateOrInterval)) {
                setNewSettings((prev) => ({ ...prev, parameterDateOrInterval: fixupParameterDateOrInterval }));
            }
        }
    }

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(cloneDeep(newSettings));
        },
        [newSettings, props.layer]
    );

    React.useEffect(
        function maybeRefetchData() {
            props.layer.setIsSuspended(gridModelInfosQuery.isFetching);
            if (!gridModelInfosQuery.isFetching) {
                props.layer.maybeRefetchData();
            }
        },
        [gridModelInfosQuery.isFetching, props.layer, newSettings]
    );

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent }));
    }

    function handleRealizationChange(realizationNum: string) {
        setNewSettings((prev) => ({ ...prev, realizationNum: parseInt(realizationNum) }));
    }

    function handleGridModelSelectionChange(selected: string) {
        setNewSettings((prev) => ({ ...prev, gridModelName: selected }));
    }

    function handleGridParameterSelectionChange(selected: string) {
        setNewSettings((prev) => ({ ...prev, parameterName: selected }));
    }

    function handleGridParameterDateOrIntervalSelectionChange(selected: string) {
        setNewSettings((prev) => ({ ...prev, parameterDateOrInterval: selected }));
    }

    function handleShowMeshChange(e: React.ChangeEvent<HTMLInputElement>) {
        const showMesh = e.target.checked;
        setNewSettings((prev) => ({ ...prev, showMesh }));
    }

    function handleColorScaleChange(newColorScale: ColorScale, areBoundariesUserDefined: boolean) {
        props.layer.setColorScale(newColorScale);
        props.layer.setUseCustomColorScaleBoundaries(areBoundariesUserDefined);
    }

    const availableRealizations: number[] = [];
    if (fixupEnsembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(fixupEnsembleIdent));
    }

    const gridModelParameterDateOrIntervalOptions = makeGridParameterDateOrIntervalOptions(
        datesOrIntervalsForSelectedParameter
    );

    let gridModelInfosQueryErrorMessage = "";
    if (gridModelInfosQuery.isError) {
        gridModelInfosQueryErrorMessage = gridModelInfosQuery.error.message;
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell align-middle w-24">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Realization</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeRealizationOptions(availableRealizations)}
                        value={newSettings.realizationNum?.toString() ?? undefined}
                        onChange={handleRealizationChange}
                        showArrows
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Model</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={makeGridModelOptions(gridModelInfosQuery.data ?? [])}
                            value={newSettings.gridModelName ?? undefined}
                            onChange={handleGridModelSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Parameter</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={makeGridParameterNameOptions(gridModelInfo)}
                            value={newSettings.parameterName ?? undefined}
                            onChange={handleGridParameterSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div
                    className={resolveClassNames("table-cell align-middle", {
                        "text-gray-300": gridModelParameterDateOrIntervalOptions.length === 0,
                    })}
                >
                    Date or interval
                </div>
                <div className="table-cell align-top">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={gridModelParameterDateOrIntervalOptions}
                            value={newSettings.parameterDateOrInterval ?? undefined}
                            onChange={handleGridParameterDateOrIntervalSelectionChange}
                            showArrows
                            disabled={gridModelParameterDateOrIntervalOptions.length === 0}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Show mesh</div>
                <div className="table-cell align-top">
                    <Switch checked={newSettings.showMesh} onChange={handleShowMeshChange} />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell max-w-0 align-top">Color scale</div>
                <div className="table-cell">
                    <ColorScaleSelector
                        colorScale={props.layer.getColorScale()}
                        areBoundariesUserDefined={props.layer.getUseCustomColorScaleBoundaries()}
                        workbenchSettings={props.workbenchSettings}
                        onChange={handleColorScaleChange}
                    />
                </div>
            </div>
        </div>
    );
}

function makeRealizationOptions(realizations: readonly number[]): DropdownOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeGridModelOptions(gridModelsInfo: Grid3dInfo_api[]): DropdownOption[] {
    return gridModelsInfo.map((gridModel) => ({ label: gridModel.grid_name, value: gridModel.grid_name }));
}

function makeGridParameterNameOptions(gridModelInfo: Grid3dInfo_api | null): DropdownOption[] {
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

function makeGridParameterDateOrIntervalOptions(datesOrIntervals: (string | null)[]): DropdownOption[] {
    const reduced = datesOrIntervals.reduce((acc, info) => {
        if (info === null) {
            return acc;
        } else if (!acc.map((el) => el.value).includes(info)) {
            acc.push({
                value: info,
                label: info.includes("/") ? isoIntervalStringToDateLabel(info) : isoStringToDateLabel(info),
            });
        }
        return acc;
    }, [] as { label: string; value: string }[]);

    return reduced;
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

function useGridModelInfosQuery(ensembleIdent: EnsembleIdent | null, realizationNum: number | null) {
    return useQuery({
        queryKey: ["getGridModelInfos", ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), realizationNum],
        queryFn: () =>
            apiService.grid3D.getGridModelsInfo(
                ensembleIdent?.getCaseUuid() ?? "",
                ensembleIdent?.getEnsembleName() ?? "",
                realizationNum ?? 0
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(ensembleIdent && realizationNum !== null),
    });
}
