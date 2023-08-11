import React from "react";

import { ModuleFCProps } from "@framework/Module";
import {
    ColorScaleContinuousInterpolationType,
    ColorScaleContinuousInterpolationTypeOptions,
    ColorScaleDiscreteInterpolationType,
    ColorScaleGradientType,
    ColorScaleType,
} from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { State } from "./state";

import { ColorScaleDiscreteInterpolationTypeOptions } from "../../framework/WorkbenchSettings";

export const settings = (props: ModuleFCProps<State>) => {
    const [type, setType] = props.moduleContext.useStoreState("type");
    const [steps, setSteps] = props.moduleContext.useStoreState("steps");
    const [gradientType, setGradientType] = props.moduleContext.useStoreState("gradientType");
    const [continuousInterpolation, setContinuousInterpolation] =
        props.moduleContext.useStoreState("continuousInterpolation");
    const [discreteInterpolation, setDiscreteInterpolation] =
        props.moduleContext.useStoreState("discreteInterpolation");

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(parseInt(e.target.value) as unknown as ColorScaleType);
    }

    function handleStepsChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSteps(parseInt(e.target.value));
    }

    function handleContinuousInterpolationChange(value: string) {
        setContinuousInterpolation(value as unknown as ColorScaleContinuousInterpolationType);
    }

    function handleDiscreteInterpolationChange(value: string) {
        setDiscreteInterpolation(value as unknown as ColorScaleDiscreteInterpolationType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(parseInt(e.target.value) as unknown as ColorScaleGradientType);
    }

    const colors = (
        gradientType === ColorScaleGradientType.Sequential
            ? props.workbenchSettings.useDiscreteSequentialColorScale({
                  interpolation: discreteInterpolation,
                  steps,
              })
            : props.workbenchSettings.useDiscreteDivergingColorScale({
                  interpolation: discreteInterpolation,
                  steps,
              })
    ).sampleColors(steps);

    const colorScale =
        gradientType === ColorScaleGradientType.Sequential
            ? props.workbenchSettings.useContinuousSequentialColorScale({
                  interpolation: continuousInterpolation,
              })
            : props.workbenchSettings.useContinuousDivergingColorScale({
                  interpolation: continuousInterpolation,
              });

    function makeScale(): React.ReactNode {
        const nodes: React.ReactNode[] = [];
        const colors = colorScale.sampleColors(100);
        for (let i = 0; i < 100; i++) {
            nodes.push(
                <div
                    key={i}
                    className="w-1 h-full"
                    style={{
                        backgroundColor: colors[i],
                    }}
                />
            );
        }

        return <div className="flex h-4 w-24">{nodes}</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <Label text="Type">
                <RadioGroup
                    value={type}
                    onChange={handleTypeChange}
                    options={[
                        {
                            value: ColorScaleType.Discrete,
                            labelElement: (
                                <div className="flex gap-4 items-center">
                                    <div className="flex gap-1 w-24 h-4">
                                        {colors.map((color) => (
                                            <div
                                                key={color}
                                                className="flex-grow h-full"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div>Discrete</div>
                                </div>
                            ),
                        },
                        {
                            value: ColorScaleType.Continuous,
                            labelElement: (
                                <div className="flex gap-4 items-center h-4 w-24">
                                    {makeScale()}
                                    <div>Continuous</div>
                                </div>
                            ),
                        },
                    ]}
                />
            </Label>
            <Label text="Gradient type">
                <RadioGroup
                    value={gradientType}
                    onChange={handleGradientTypeChange}
                    options={[
                        {
                            value: ColorScaleGradientType.Sequential,
                            labelElement: "Sequential",
                        },
                        {
                            value: ColorScaleGradientType.Diverging,
                            labelElement: "Diverging",
                        },
                    ]}
                    direction="horizontal"
                />
            </Label>
            {type === ColorScaleType.Discrete && (
                <>
                    <Label text="Steps">
                        <Input type="number" value={steps} onChange={handleStepsChange} />
                    </Label>
                    <Label text="Interpolation">
                        <Dropdown
                            value={`${discreteInterpolation}`}
                            onChange={handleDiscreteInterpolationChange}
                            options={Object.entries(ColorScaleDiscreteInterpolationTypeOptions).map((el) => ({
                                value: el[0],
                                label: el[1],
                            }))}
                        />
                    </Label>
                </>
            )}
            {type === ColorScaleType.Continuous && (
                <>
                    <Label text="Interpolation">
                        <Dropdown
                            value={`${continuousInterpolation}`}
                            onChange={handleContinuousInterpolationChange}
                            options={Object.entries(ColorScaleContinuousInterpolationTypeOptions).map((el) => ({
                                value: el[0],
                                label: el[1],
                            }))}
                        />
                    </Label>
                </>
            )}
        </div>
    );
};
