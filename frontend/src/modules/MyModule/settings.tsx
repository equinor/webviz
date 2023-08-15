import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const [type, setType] = props.moduleContext.useStoreState("type");
    const [gradientType, setGradientType] = props.moduleContext.useStoreState("gradientType");

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(parseInt(e.target.value) as unknown as ColorScaleType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(parseInt(e.target.value) as unknown as ColorScaleGradientType);
    }

    const colorScale =
        type === ColorScaleType.Continuous
            ? props.workbenchSettings.useContinuousColorScale({
                  gradientType,
              })
            : props.workbenchSettings.useDiscreteColorScale({
                  gradientType,
              });

    const colors = colorScale.sampleColors(10);

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
        </div>
    );
};
