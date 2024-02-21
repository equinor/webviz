import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import { Remove } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ColorPaletteSelect } from "./colorPaletteSelect";
import { ColorRangeSelect } from "./colorRangeSelect";
import { EnsembleStageSelect } from "./ensembleStageSelect";
import { PrevNextButtons } from "./previousNextButtons";

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

    let computedSurfaceAttribute = props.surfaceSpecification.surfaceAttribute;
    if (
        !computedSurfaceAttribute ||
        !ensembleSurfaceDirectory.getAttributeNames(null).includes(computedSurfaceAttribute)
    ) {
        computedSurfaceAttribute = ensembleSurfaceDirectory.getAttributeNames(null)[0];
    }
    let computedSurfaceName = props.surfaceSpecification.surfaceName;
    if (props.syncedSettings.name && props.index !== 0) {
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
    let computedTimeOrInterval = props.surfaceSpecification.surfaceTimeOrInterval;
    if (
        !computedTimeOrInterval ||
        !ensembleSurfaceDirectory
            .getTimeOrIntervalStrings(null, computedSurfaceAttribute)
            .includes(computedTimeOrInterval)
    ) {
        computedTimeOrInterval = ensembleSurfaceDirectory.getTimeOrIntervalStrings(null, computedSurfaceAttribute)[0];
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
    if (!isEqual(computedSurfaceSpecification, props.surfaceSpecification)) {
        props.onChange(computedSurfaceSpecification);
    }
    function handleEnsembleSelectionChange(identString: string) {
        const ensembleIdent = EnsembleIdent.fromString(identString);
        props.onChange({ ...props.surfaceSpecification, ensembleIdent });
    }

    function handleSurfaceNameChange(surfaceName: string) {
        if (ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute).includes(surfaceName)) {
            props.onChange({ ...props.surfaceSpecification, surfaceName });
        } else {
            props.onChange({
                ...props.surfaceSpecification,
                surfaceName: ensembleSurfaceDirectory.getSurfaceNames(computedSurfaceAttribute)[0],
            });
        }
    }
    function handleSurfaceAttributeChange(surfaceAttribute: string) {
        if (
            computedSurfaceName &&
            ensembleSurfaceDirectory.getSurfaceNames(surfaceAttribute).includes(computedSurfaceName)
        ) {
            props.onChange({ ...props.surfaceSpecification, surfaceAttribute });
        } else {
            props.onChange({
                ...props.surfaceSpecification,
                surfaceName: ensembleSurfaceDirectory.getSurfaceNames(surfaceAttribute)[0],
                surfaceAttribute,
            });
        }
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
    const name = props.index === 0 ? "Surface 1 / Control" : `Surface ${props.index + 1}`;
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
        .map((name) => ({ value: name, label: name }));
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
            {(!props.syncedSettings.ensemble || props.index == 0) && (
                <tr>
                    <td className="px-6 py-0 whitespace-nowrap">Ensemble</td>
                    <td className="px-6 py-0 w-full whitespace-nowrap">
                        <Dropdown
                            options={availableEnsembleOptions}
                            value={computedEnsembleIdent?.toString()}
                            onChange={handleEnsembleSelectionChange}
                        />
                    </td>
                    <td className="px-0 py-0 whitespace-nowrap text-right">
                        <PrevNextButtons
                            onChange={handleEnsembleSelectionChange}
                            options={availableEnsembleOptions.map((option) => option.value)}
                            value={computedEnsembleIdent?.toString()}
                        />
                    </td>
                </tr>
            )}
            {(!props.syncedSettings.attribute || props.index == 0) && (
                <tr>
                    <td className="px-6 py-0 whitespace-nowrap">Attribute</td>
                    <td className="px-6 py-0 w-full whitespace-nowrap">
                        <Dropdown
                            options={surfaceAttributeOptions}
                            value={computedSurfaceAttribute}
                            onChange={handleSurfaceAttributeChange}
                        />
                    </td>
                    <td className="px-0 py-0 whitespace-nowrap text-right">
                        <PrevNextButtons
                            onChange={handleSurfaceAttributeChange}
                            options={surfaceAttributeOptions.map((option) => option.value)}
                            value={computedSurfaceAttribute}
                        />
                    </td>
                </tr>
            )}
            {(!props.syncedSettings.name || props.index == 0) && (
                <tr>
                    <td className="px-6 py-0 whitespace-nowrap">Name</td>
                    <td className="px-6 py-0 w-full whitespace-nowrap">
                        <Dropdown
                            options={surfaceNameOptions}
                            value={computedSurfaceName}
                            onChange={handleSurfaceNameChange}
                        />
                    </td>
                    <td className="px-0 py-0 whitespace-nowrap text-right">
                        <PrevNextButtons
                            onChange={handleSurfaceNameChange}
                            options={surfaceNameOptions.map((option) => option.value)}
                            value={computedSurfaceName}
                        />
                    </td>
                </tr>
            )}

            {(!props.syncedSettings.timeOrInterval || props.index == 0) && props.timeType !== SurfaceTimeType.None && (
                <tr>
                    <td className="px-6 py-0 whitespace-nowrap">Time</td>
                    <td className="px-6 py-0 w-full whitespace-nowrap">
                        <Dropdown
                            options={surfaceTimeOrIntervalOptions}
                            value={computedTimeOrInterval}
                            onChange={handleSurfaceTimeOrIntervalChange}
                        />
                    </td>
                    <td className="px-0 py-0 whitespace-nowrap text-right">
                        <PrevNextButtons
                            onChange={handleSurfaceTimeOrIntervalChange}
                            options={surfaceTimeOrIntervalOptions.map((option) => option.value)}
                            value={computedTimeOrInterval}
                        />
                    </td>
                </tr>
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
