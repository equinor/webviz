import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import { Remove } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ColorPaletteSelect } from "./colorPaletteSelect";
import { ColorRangeSelect } from "./colorRangeSelect";
import { EnsembleStageSelect } from "./ensembleStageSelect";
import { PrevNextButtons } from "./previousNextButtons";

import { isoStringToDateOrIntervalLabel } from "../../_utils/isoString";
import { EnsembleSetSurfaceMetas } from "../../hooks/useEnsembleSetSurfaceMetaQuery";
import {
    EnsembleStage,
    EnsembleStageType,
    SurfaceAttributeType,
    SurfaceAttributeTypeToApi,
    SyncedSettings,
    ViewSpecification,
} from "../../types";

export type ViewSelectProps = {
    index: number;
    surfaceMetas: EnsembleSetSurfaceMetas;
    viewSpecification: ViewSpecification;
    ensembleIdents: EnsembleIdent[];
    timeType: SurfaceTimeType;
    attributeType: SurfaceAttributeType;
    syncedSettings: SyncedSettings;
    onChange: (viewSpecification: ViewSpecification) => void;
    onRemove: (uuid: string) => void;
    ensembleSet: EnsembleSet;
};

export const ViewSelect: React.FC<ViewSelectProps> = (props) => {
    const isControlView = props.index === 0;
    let computedEnsembleIdent = props.viewSpecification.ensembleIdent;

    if (!computedEnsembleIdent || !props.ensembleIdents.some((el) => el.equals(computedEnsembleIdent))) {
        computedEnsembleIdent = props.ensembleIdents[0];
    }

    const ensembleSurfaceMetadata = computedEnsembleIdent
        ? props.surfaceMetas.data.find((ensembleSurfaceSet) =>
              ensembleSurfaceSet.ensembleIdent?.equals(computedEnsembleIdent)
          )
        : undefined;

    const ensembleSurfaceDirectory = new SurfaceDirectory({
        surfaceMetas: ensembleSurfaceMetadata?.surfaceMetas ?? [],
        timeType: props.timeType,
        includeAttributeTypes: SurfaceAttributeTypeToApi[props.attributeType],
    });

    let computedSurfaceAttribute = props.viewSpecification.surfaceAttribute;
    if (
        !computedSurfaceAttribute ||
        !ensembleSurfaceDirectory.getAttributeNames(null).includes(computedSurfaceAttribute)
    ) {
        computedSurfaceAttribute = ensembleSurfaceDirectory.getAttributeNames(null)[0];
    }
    let computedSurfaceName = props.viewSpecification.surfaceName;
    if (props.syncedSettings.name && !isControlView) {
        if (!ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName).includes(computedSurfaceAttribute)) {
            computedSurfaceAttribute = ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)[0];
        }
    }
    if (
        !computedSurfaceName ||
        !ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute).includes(computedSurfaceName)
    ) {
        computedSurfaceName = ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute)[0];
    }
    let computedTimeOrInterval = props.viewSpecification.surfaceTimeOrInterval;
    if (
        !computedTimeOrInterval ||
        !ensembleSurfaceDirectory
            .getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
            .includes(computedTimeOrInterval)
    ) {
        // Currently, gives an invalid selection if time is synced and the selected name and attribute don't have the selected time
        if (!props.syncedSettings.timeOrInterval || isControlView) {
            computedTimeOrInterval = ensembleSurfaceDirectory.getTimeOrIntervalStrings(
                computedSurfaceName,
                computedSurfaceAttribute
            )[0];
        }
    }
    let computedRealizationNum = props.viewSpecification.realizationNum;
    let availableRealizationNums: number[] = [];

    if (computedEnsembleIdent) {
        const ensemble = props.ensembleSet.findEnsemble(computedEnsembleIdent);
        availableRealizationNums = ensemble?.getRealizations().map((real) => real) ?? [];
    }

    if (!computedRealizationNum || !availableRealizationNums.includes(computedRealizationNum)) {
        computedRealizationNum = availableRealizationNums[0];
    }

    const valueRange = ensembleSurfaceDirectory.getValueRange(computedSurfaceName, computedSurfaceAttribute, null);
    let computedValueMin: number = valueRange.min;
    let computedValueMax: number = valueRange.max;
    let computedColorPaletteId: string = props.viewSpecification.colorPaletteId ?? "";
    // if (
    //     props.viewSpecification.statisticFunction === SurfaceStatisticFunction_api.STD &&
    //     props.viewSpecification.ensembleStage === EnsembleStageType.Statistics
    // ) {
    //     computedValueMin = null;
    //     computedValueMax = null;
    // }
    const computedViewSpecification: ViewSpecification = {
        ensembleIdent: computedEnsembleIdent,
        surfaceName: computedSurfaceName,
        surfaceAttribute: computedSurfaceAttribute,
        surfaceTimeOrInterval: computedTimeOrInterval,
        realizationNum: computedRealizationNum,
        ensembleStage: props.viewSpecification.ensembleStage,
        statisticFunction: props.viewSpecification.statisticFunction,
        realizationNumsStatistics: props.viewSpecification.realizationNumsStatistics,
        colorRange: props.viewSpecification.colorRange,
        colorPaletteId: props.viewSpecification.colorPaletteId,
        uuid: props.viewSpecification.uuid,
    };
    // Causes errorWarning: Cannot update a component (`settings`) ...
    if (!isEqual(computedViewSpecification, props.viewSpecification)) {
        props.onChange(computedViewSpecification);
    }

    function handleEnsembleSelectionChange(identString: string) {
        const ensembleIdent = EnsembleIdent.fromString(identString);
        props.onChange({ ...props.viewSpecification, ensembleIdent });
    }

    function handleSurfaceNameChange(surfaceName: string) {
        if (ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute).includes(surfaceName)) {
            props.onChange({ ...props.viewSpecification, surfaceName });
        } else {
            props.onChange({
                ...props.viewSpecification,
                surfaceName: ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute)[0],
            });
        }
    }
    function handleSurfaceAttributeChange(surfaceAttribute: string) {
        if (
            computedSurfaceName &&
            ensembleSurfaceDirectory.getSurfaceNames(surfaceAttribute).includes(computedSurfaceName)
        ) {
            props.onChange({ ...props.viewSpecification, surfaceAttribute });
        } else {
            props.onChange({
                ...props.viewSpecification,
                surfaceName: ensembleSurfaceDirectory.getSurfaceNames(surfaceAttribute)[0],
                surfaceAttribute,
            });
        }
        props.onChange({ ...props.viewSpecification, surfaceAttribute });
    }
    function handleSurfaceTimeOrIntervalChange(surfaceTimeOrInterval: string) {
        props.onChange({ ...props.viewSpecification, surfaceTimeOrInterval });
    }
    function handleEnsembleStageChange(ensembleStage: EnsembleStage) {
        if (ensembleStage.ensembleStage == EnsembleStageType.Statistics) {
            props.onChange({
                ...props.viewSpecification,
                ...{
                    ensembleStage: ensembleStage.ensembleStage,
                    statisticFunction: ensembleStage.statisticFunction,
                    realizationNumsStatistics: ensembleStage.realizationNums,
                },
            });
        }
        if (ensembleStage.ensembleStage == EnsembleStageType.Observation) {
            props.onChange({ ...props.viewSpecification, ...{ ensembleStage: ensembleStage.ensembleStage } });
        }
        if (ensembleStage.ensembleStage == EnsembleStageType.Realization) {
            props.onChange({
                ...props.viewSpecification,
                ...{ ensembleStage: ensembleStage.ensembleStage, realizationNum: ensembleStage.realizationNum },
            });
        }
    }
    function handleColorRangeChange(colorRange: [number, number]) {
        props.onChange({ ...props.viewSpecification, colorRange });
    }
    function handleColorPaletteIdChange(colorPaletteId: string) {
        props.onChange({ ...props.viewSpecification, colorPaletteId });
    }
    function handleRemove() {
        props.onRemove(props.viewSpecification.uuid);
    }
    const name = isControlView ? "View 1 / Control" : `View ${props.index + 1}`;
    const availableEnsembles = props.ensembleSet
        .getEnsembleArr()
        .filter((ensemble) => props.ensembleIdents.includes(ensemble.getIdent()));

    const availableEnsembleOptions = availableEnsembles.map((ensemble) => ({
        value: ensemble.getIdent().toString(),
        label: ensemble.getDisplayName(),
    }));
    const surfaceNameOptions = ensembleSurfaceDirectory
        .getSurfaceNames(computedSurfaceAttribute)
        .map((name) => ({ value: name, label: name }));
    const surfaceAttributeOptions = ensembleSurfaceDirectory.getAttributeNames(null).map((name) => ({
        value: name,
        label: name,
    }));
    const surfaceTimeOrIntervalOptions = ensembleSurfaceDirectory
        .getTimeOrIntervalStrings(null, computedSurfaceAttribute)
        .map((name) => ({ value: name, label: isoStringToDateOrIntervalLabel(name) }));
    const ensembleIsSynced = props.syncedSettings.ensemble && !isControlView;
    const attributeIsSynced = props.syncedSettings.attribute && !isControlView;
    const nameIsSynced = props.syncedSettings.name && !isControlView;
    const timeOrIntervalIsSynced = props.syncedSettings.timeOrInterval && !isControlView;
    const colorRangeIsSynced = props.syncedSettings.colorRange && !isControlView;
    const colorPaletteIdIsSynced = props.syncedSettings.colorPaletteId && !isControlView;
    const realizationNumIsSynced = props.syncedSettings.realizationNum && !isControlView;

    return (
        <>
            <tr className="bg-slate-300">
                <td className="px-6 py-0 whitespace-nowrap">{name}</td>
                <td></td>
                <td>
                    <IconButton className="float-right" onClick={handleRemove} color="danger" title="Remove surface">
                        <Remove fontSize="large" />
                    </IconButton>
                </td>
            </tr>

            <tr>
                <td className={getTitleClassNames(ensembleIsSynced)}>Ensemble</td>
                <td className="px-6 py-0 w-full whitespace-nowrap">
                    <Dropdown
                        options={availableEnsembleOptions}
                        value={computedEnsembleIdent?.toString()}
                        onChange={handleEnsembleSelectionChange}
                        disabled={ensembleIsSynced}
                    />
                </td>
                <td className="px-0 py-0 whitespace-nowrap text-right">
                    {!ensembleIsSynced && (
                        <PrevNextButtons
                            onChange={handleEnsembleSelectionChange}
                            options={availableEnsembleOptions.map((option) => option.value)}
                            value={computedEnsembleIdent?.toString()}
                        />
                    )}
                </td>
            </tr>

            <tr>
                <td className={getTitleClassNames(attributeIsSynced)}>Attribute</td>
                <td className="px-6 py-0 w-full whitespace-nowrap">
                    <Dropdown
                        options={surfaceAttributeOptions}
                        value={computedSurfaceAttribute}
                        onChange={handleSurfaceAttributeChange}
                        disabled={attributeIsSynced}
                    />
                </td>
                <td className="px-0 py-0 whitespace-nowrap text-right">
                    {!attributeIsSynced && (
                        <PrevNextButtons
                            onChange={handleSurfaceAttributeChange}
                            options={surfaceAttributeOptions.map((option) => option.value)}
                            value={computedSurfaceAttribute}
                            disabled={attributeIsSynced}
                        />
                    )}
                </td>
            </tr>

            <tr>
                <td className={getTitleClassNames(nameIsSynced)}>Name</td>
                <td className="px-6 py-0 w-full whitespace-nowrap">
                    <Dropdown
                        options={surfaceNameOptions}
                        value={computedSurfaceName}
                        onChange={handleSurfaceNameChange}
                        disabled={nameIsSynced}
                    />
                </td>
                <td className="px-0 py-0 whitespace-nowrap text-right">
                    {!nameIsSynced && (
                        <PrevNextButtons
                            onChange={handleSurfaceNameChange}
                            options={surfaceNameOptions.map((option) => option.value)}
                            value={computedSurfaceName}
                        />
                    )}
                </td>
            </tr>
            {props.timeType !== SurfaceTimeType.None && (
                <tr>
                    <td className={getTitleClassNames(timeOrIntervalIsSynced)}>Time</td>
                    <td className="px-6 py-0 w-full whitespace-nowrap">
                        <Dropdown
                            options={surfaceTimeOrIntervalOptions}
                            value={computedTimeOrInterval ?? ""}
                            onChange={handleSurfaceTimeOrIntervalChange}
                            disabled={timeOrIntervalIsSynced}
                        />
                    </td>
                    <td className="px-0 py-0 whitespace-nowrap text-right">
                        {!timeOrIntervalIsSynced && (
                            <PrevNextButtons
                                onChange={handleSurfaceTimeOrIntervalChange}
                                options={surfaceTimeOrIntervalOptions.map((option) => option.value)}
                                value={computedTimeOrInterval ?? ""}
                            />
                        )}
                    </td>
                </tr>
            )}

            <EnsembleStageSelect
                ensemble={props.ensembleSet.findEnsemble(computedEnsembleIdent)}
                stage={props.viewSpecification.ensembleStage}
                statisticFunction={props.viewSpecification.statisticFunction}
                availableRealizationNums={availableRealizationNums}
                disableRealizationPicker={realizationNumIsSynced}
                realizationNum={computedRealizationNum}
                onChange={handleEnsembleStageChange}
            />
            {!colorRangeIsSynced && (
                <ColorRangeSelect
                    valueMin={computedValueMin}
                    valueMax={computedValueMax}
                    onChange={handleColorRangeChange}
                />
            )}
            {!colorPaletteIdIsSynced && (
                <ColorPaletteSelect colorPaletteId={computedColorPaletteId} onChange={handleColorPaletteIdChange} />
            )}
        </>
    );
};
function getTitleClassNames(disabled: boolean): string {
    return resolveClassNames("px-6", "py-0", "whitespace-nowrap", disabled ? "text-gray-400" : "");
}
