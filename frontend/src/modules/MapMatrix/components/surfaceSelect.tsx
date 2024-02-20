import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { IconButton } from "@lib/components/IconButton";
import { SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import { Remove } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ColorPaletteSelect } from "./colorPaletteSelect";
import { ColorRangeSelect } from "./colorRangeSelect";
import { EnsembleIdentSelectWithButtons } from "./ensembleIdentSelectWithButtons";
import { EnsembleStageSelect } from "./ensembleStageSelect";
import { SingleSelectWithButtons } from "./singleSelectWithButtons";

import { isoStringToDateOrIntervalLabel } from "../_utils/isoString";
import { EnsembleSetSurfaceMetas } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import {
    EnsembleStage,
    EnsembleStageType,
    SurfaceAttributeType,
    SurfaceAttributeTypeToApi,
    SurfaceSpecification,
    SyncedSettings,
} from "../types";

export type SurfaceSelectProps = {
    index: number;
    surfaceMetas: EnsembleSetSurfaceMetas;
    surfaceSpecification: SurfaceSpecification;
    ensembleIdents: EnsembleIdent[];
    timeType: SurfaceTimeType;
    attributeType: SurfaceAttributeType;
    syncedSettings: SyncedSettings;
    onChange: (surfaceSpecification: SurfaceSpecification) => void;
    onRemove: (uuid: string) => void;
    ensembleSet: EnsembleSet;
};

export const SurfaceSelect: React.FC<SurfaceSelectProps> = (props) => {
    let computedEnsembleIdent = props.surfaceSpecification.ensembleIdent;

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

    let computedSurfaceName = props.surfaceSpecification.surfaceName;
    if (!computedSurfaceName || !ensembleSurfaceDirectory.getSurfaceNames(null).includes(computedSurfaceName)) {
        computedSurfaceName = ensembleSurfaceDirectory.getSurfaceNames(null)[0];
    }

    let computedSurfaceAttribute = props.surfaceSpecification.surfaceAttribute;
    if (
        !computedSurfaceAttribute ||
        !ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName).includes(computedSurfaceAttribute)
    ) {
        computedSurfaceAttribute = ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)[0];
    }
    let computedTimeOrInterval = props.surfaceSpecification.surfaceTimeOrInterval;
    if (
        !computedTimeOrInterval ||
        !ensembleSurfaceDirectory
            .getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
            .includes(computedTimeOrInterval)
    ) {
        computedTimeOrInterval = ensembleSurfaceDirectory.getTimeOrIntervalStrings(
            computedSurfaceName,
            computedSurfaceAttribute
        )[0];
    }
    let computedRealizationNum = props.surfaceSpecification.realizationNum;
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
    let computedColorPaletteId: string = props.surfaceSpecification.colorPaletteId ?? "";
    // if (
    //     props.surfaceSpecification.statisticFunction === SurfaceStatisticFunction_api.STD &&
    //     props.surfaceSpecification.ensembleStage === EnsembleStageType.Statistics
    // ) {
    //     computedValueMin = null;
    //     computedValueMax = null;
    // }
    const computedSurfaceSpecification: SurfaceSpecification = {
        ensembleIdent: computedEnsembleIdent,
        surfaceName: computedSurfaceName,
        surfaceAttribute: computedSurfaceAttribute,
        surfaceTimeOrInterval: computedTimeOrInterval,
        realizationNum: computedRealizationNum,
        ensembleStage: props.surfaceSpecification.ensembleStage,
        statisticFunction: props.surfaceSpecification.statisticFunction,
        colorRange: props.surfaceSpecification.colorRange,
        colorPaletteId: props.surfaceSpecification.colorPaletteId,
        uuid: props.surfaceSpecification.uuid,
    };

    if (!isEqual(props.surfaceSpecification, computedSurfaceSpecification)) {
        props.onChange(computedSurfaceSpecification);
    }
    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        props.onChange({ ...props.surfaceSpecification, ensembleIdent });
    }

    function handleSurfaceNameChange(surfaceName: string) {
        props.onChange({ ...props.surfaceSpecification, surfaceName });
    }
    function handleSurfaceAttributeChange(surfaceAttribute: string) {
        props.onChange({ ...props.surfaceSpecification, surfaceAttribute });
    }
    function handleSurfaceTimeOrIntervalChange(surfaceTimeOrInterval: string) {
        props.onChange({ ...props.surfaceSpecification, surfaceTimeOrInterval });
    }
    function handleEnsembleStageChange(ensembleStage: EnsembleStage) {
        if (ensembleStage.ensembleStage == EnsembleStageType.Statistics) {
            props.onChange({
                ...props.surfaceSpecification,
                ...{ ensembleStage: ensembleStage.ensembleStage, statisticFunction: ensembleStage.statisticFunction },
            });
        }
        if (ensembleStage.ensembleStage == EnsembleStageType.Observation) {
            props.onChange({ ...props.surfaceSpecification, ...{ ensembleStage: ensembleStage.ensembleStage } });
        }
        if (ensembleStage.ensembleStage == EnsembleStageType.Realization) {
            props.onChange({
                ...props.surfaceSpecification,
                ...{ ensembleStage: ensembleStage.ensembleStage, realizationNum: ensembleStage.realizationNum },
            });
        }
    }
    function handleColorRangeChange(colorRange: [number, number]) {
        props.onChange({ ...props.surfaceSpecification, colorRange });
    }
    function handleColorPaletteIdChange(colorPaletteId: string) {
        props.onChange({ ...props.surfaceSpecification, colorPaletteId });
    }
    function handleRemove() {
        props.onRemove(props.surfaceSpecification.uuid);
    }
    const name = props.index === 0 ? "Surface 1 / Main" : `Surface ${props.index + 1}`;

    return (
        <>
            <tr className="bg-slate-100">
                <td className="px-6 py-0 whitespace-nowrap">{name}</td>
                <td></td>
                <td>
                    <IconButton className="float-right" onClick={handleRemove} color="danger" title="Remove surface">
                        <Remove fontSize="large" />
                    </IconButton>
                </td>
            </tr>
            {(!props.syncedSettings.ensemble || props.index == 0) && (
                <EnsembleIdentSelectWithButtons
                    name="Ensemble"
                    ensembleIdents={props.ensembleIdents}
                    value={computedEnsembleIdent}
                    ensembleSet={props.ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                />
            )}
            {(!props.syncedSettings.name || props.index == 0) && (
                <SingleSelectWithButtons
                    name="Name"
                    options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                    value={computedSurfaceName}
                    onChange={handleSurfaceNameChange}
                />
            )}
            {(!props.syncedSettings.attribute || props.index == 0) && (
                <SingleSelectWithButtons
                    name="Attribute"
                    options={ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)}
                    value={computedSurfaceAttribute}
                    onChange={handleSurfaceAttributeChange}
                />
            )}
            {(!props.syncedSettings.timeOrInterval || props.index == 0) && props.timeType !== SurfaceTimeType.None && (
                <SingleSelectWithButtons
                    name="Time/Interval"
                    options={ensembleSurfaceDirectory.getTimeOrIntervalStrings(
                        computedSurfaceName,
                        computedSurfaceAttribute
                    )}
                    value={computedTimeOrInterval}
                    labelFunction={isoStringToDateOrIntervalLabel}
                    onChange={handleSurfaceTimeOrIntervalChange}
                />
            )}
            <EnsembleStageSelect
                stage={props.surfaceSpecification.ensembleStage}
                statisticFunction={props.surfaceSpecification.statisticFunction}
                availableRealizationNums={availableRealizationNums}
                disableRealizationPicker={props.syncedSettings.realizationNum && props.index != 0}
                realizationNum={computedRealizationNum}
                onChange={handleEnsembleStageChange}
            />
            {(!props.syncedSettings.colorRange || props.index == 0) && (
                <ColorRangeSelect
                    valueMin={computedValueMin}
                    valueMax={computedValueMax}
                    onChange={handleColorRangeChange}
                />
            )}
            {(!props.syncedSettings.colorPaletteId || props.index == 0) && (
                <ColorPaletteSelect colorPaletteId={computedColorPaletteId} onChange={handleColorPaletteIdChange} />
            )}
        </>
    );
};
