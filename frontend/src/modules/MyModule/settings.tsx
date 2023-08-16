import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const [type, setType] = props.moduleContext.useStoreState("type");
    const [gradientType, setGradientType] = props.moduleContext.useStoreState("gradientType");

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(e.target.value as ColorScaleType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(e.target.value as ColorScaleGradientType);
    }

    const colorScale =
        type === ColorScaleType.Continuous
            ? props.workbenchSettings.useContinuousColorScale({
                  gradientType,
              })
            : props.workbenchSettings.useDiscreteColorScale({
                  gradientType,
              });

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
                                    <div className="flex-grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} steps={10} />
                                    </div>
                                    <div>Discrete</div>
                                </div>
                            ),
                        },
                        {
                            value: ColorScaleType.Continuous,
                            labelElement: (
                                <div className="flex gap-4 items-center h-4">
                                    <div className="flex-grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} />
                                    </div>
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
