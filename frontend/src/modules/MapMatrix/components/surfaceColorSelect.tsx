import React from "react";

import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

export type SurfaceColorSelectProps = {
    colorScaleGradientType: ColorScaleGradientType;
    onColorGradientTypeChange(colorGradientType: ColorScaleGradientType): void;
};
const ColorScaleGradientTypeToStringMapping = {
    [ColorScaleGradientType.Sequential]: "Sequential",
    [ColorScaleGradientType.Diverging]: "Diverging",
};
export const SurfaceColorSelect: React.FC<SurfaceColorSelectProps> = (props) => {
    function handleColorScaleGradientTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.onColorGradientTypeChange(event.target.value as ColorScaleGradientType);
    }
    return (
        <>
            <Label text="Color palette">
                <RadioGroup
                    value={props.colorScaleGradientType}
                    direction="horizontal"
                    options={Object.values(ColorScaleGradientType).map((val: ColorScaleGradientType) => {
                        return { value: val, label: ColorScaleGradientTypeToStringMapping[val] };
                    })}
                    onChange={handleColorScaleGradientTypeChange}
                />
            </Label>
        </>
    );
};
