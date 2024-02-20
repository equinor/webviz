import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { Dropdown } from "@lib/components/Dropdown";

import { PrevNextButtonsProps } from "./previousNextButtons";

import { EnsembleStage, EnsembleStageType } from "../types";

export type EnsembleStageSelectProps = {
    stage: EnsembleStageType;
    availableRealizationNums: number[];
    realizationNum: number;
    statisticFunction: SurfaceStatisticFunction_api;
    disableRealizationPicker?: boolean;
    onChange(stage: EnsembleStage): void;
};
export const StatisticFunctionToStringMapping = {
    [SurfaceStatisticFunction_api.MEAN]: "Mean",
    [SurfaceStatisticFunction_api.MIN]: "Min",
    [SurfaceStatisticFunction_api.MAX]: "Max",
    [SurfaceStatisticFunction_api.STD]: "StdDev",
    [SurfaceStatisticFunction_api.P10]: "P10",
    [SurfaceStatisticFunction_api.P50]: "P50",
    [SurfaceStatisticFunction_api.P90]: "P90",
};

export const EnsembleStageSelect: React.FC<EnsembleStageSelectProps> = (props) => {
    function handleRealizationNumChange(realNum: string) {
        props.onChange({
            ensembleStage: EnsembleStageType.Realization,
            realizationNum: parseInt(realNum),
        });
    }
    function handleStageChange(stage: string) {
        if (stage == EnsembleStageType.Statistics) {
            props.onChange({
                ensembleStage: EnsembleStageType.Statistics,
                statisticFunction: SurfaceStatisticFunction_api.MEAN,
                realizationNums: [],
            });
        }
        if (stage == EnsembleStageType.Observation) {
            props.onChange({
                ensembleStage: EnsembleStageType.Observation,
            });
        }
        if (stage == EnsembleStageType.Realization) {
            props.onChange({
                ensembleStage: EnsembleStageType.Realization,
                realizationNum: props.realizationNum ? props.realizationNum : props.availableRealizationNums[0] ?? 0,
            });
        }
    }
    const realizationOptions = props.availableRealizationNums.map((num) => ({
        label: num.toString(),
        value: num.toString(),
    }));
    const stageOptions = Object.keys(EnsembleStageType).map((stage) => ({ label: stage, value: stage }));
    const statisticOptions = Object.values(SurfaceStatisticFunction_api).map((val: SurfaceStatisticFunction_api) => {
        return { value: val, label: StatisticFunctionToStringMapping[val] };
    });
    return (
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">Stage</td>
            <td className="px-6 py-0 w-full  flex">
                <div className="flex-grow">
                    <Dropdown options={stageOptions} value={props.stage} onChange={handleStageChange} />
                </div>
                {props.stage === EnsembleStageType.Realization && (
                    <div className="flex-grow">
                        <Dropdown
                            options={realizationOptions}
                            value={props.realizationNum?.toString()}
                            onChange={handleRealizationNumChange}
                            disabled={props.disableRealizationPicker}
                        />
                    </div>
                )}
                {props.stage === EnsembleStageType.Statistics && (
                    <div className="flex-grow">
                        <Dropdown
                            options={statisticOptions}
                            value={props.statisticFunction}
                            onChange={(stat) =>
                                props.onChange({
                                    ensembleStage: EnsembleStageType.Statistics,
                                    statisticFunction: stat as SurfaceStatisticFunction_api,
                                    realizationNums: [],
                                })
                            }
                        />
                    </div>
                )}
                {props.stage === EnsembleStageType.Observation && <div className="flex-grow"></div>}
            </td>

            <td className="px-0 py-0 whitespace-nowrap text-right">
                {props.stage == EnsembleStageType.Realization && (
                    <PrevNextButtonsProps
                        disabled={props.disableRealizationPicker}
                        onChange={handleRealizationNumChange}
                        options={realizationOptions.map((option) => option.value.toString())}
                        value={props.realizationNum?.toString()}
                    />
                )}
            </td>
        </tr>
    );
};
