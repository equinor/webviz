import React from "react";

import { ColorPaletteType, defaultContinuousSequentialColorPalettes } from "@framework/WorkbenchSettings";
import {
    ColorPaletteSelector,
    ColorPaletteSelectorType,
} from "@framework/internal/components/Settings/private-components/colorPaletteSettings";
import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

type SurfaceColorSelectorProps = {
    initialColorPaletteId: string;
    initialValueRange: { min: number; max: number };
    onChange: (colorScale: ColorScale | null) => void;
};
export const SurfaceColorSelector: React.FC<SurfaceColorSelectorProps> = (props) => {
    const [resetOnMinMaxChange, setResetOnMinMaxChange] = React.useState(false);
    const [useMin, setUseMin] = React.useState(false);
    const [useMax, setUseMax] = React.useState(false);
    const [valueMin, setValueMin] = React.useState(props.initialValueRange.min);
    const [valueMax, setValueMax] = React.useState(props.initialValueRange.max);
    const [useColorPalette, setUseColorPalette] = React.useState(false);
    const [selectedColorPaletteId, setSelectedColorPaletteId] = React.useState(props.initialColorPaletteId);

    React.useEffect(() => {
        if (resetOnMinMaxChange) {
            setValueMin(props.initialValueRange.min);
            setValueMax(props.initialValueRange.max);
        }
    }, [resetOnMinMaxChange, props.initialValueRange.min, props.initialValueRange.max]);

    React.useEffect(() => {
        const colorPalette = defaultContinuousSequentialColorPalettes.find(
            (palette) => palette.getId() === (useColorPalette ? selectedColorPaletteId : props.initialColorPaletteId)
        );
        const colorScale = colorPalette
            ? new ColorScale({
                  type: ColorScaleType.Continuous,
                  colorPalette: colorPalette,
                  gradientType: ColorScaleGradientType.Sequential,
                  steps: 10,
              })
            : null;
        colorScale?.setRange(
            useMin ? valueMin : props.initialValueRange.min,
            useMax ? valueMax : props.initialValueRange.max
        );
        props.onChange(colorScale);
    }, [valueMin, valueMax, selectedColorPaletteId, useColorPalette, useMin, useMax]);

    return (
        <>
            <div className="items-center  flex flex-row  space-x-2">
                <Checkbox
                    onChange={(e: any) => setResetOnMinMaxChange(e.target.checked)}
                    checked={resetOnMinMaxChange}
                />
                <div>Set defaults when changing surface</div>
            </div>
            <div className="items-center flex flex-row  mt-2 space-x-2">
                <div className="w-20">Min color</div>
                <Input
                    disabled={!useMin}
                    className="text-xs"
                    type="number"
                    value={roundToSignificantFigures(valueMin, 4)}
                    onChange={(e) => {
                        setValueMin(parseFloat(e.target.value));
                    }}
                />
                <Checkbox onChange={(e: any) => setUseMin(e.target.checked)} checked={useMin} />
                <div>Filter below</div>
            </div>

            <div className="items-center flex flex-row  mt-2 space-x-2">
                <div className="w-20">Max color</div>
                <Input
                    disabled={!useMax}
                    className="text-xs"
                    type="number"
                    value={roundToSignificantFigures(valueMax, 4)}
                    onChange={(e) => {
                        setValueMax(parseFloat(e.target.value));
                    }}
                />
                <Checkbox onChange={(e: any) => setUseMax(e.target.checked)} checked={useMax} />
                <div>Filter above</div>
            </div>
            <div className="items-center flex flex-row mt-4 space-x-2">
                <Checkbox onChange={(e: any) => setUseColorPalette(e.target.checked)} checked={useColorPalette} />
                <div>Override global color scale</div>
            </div>
            {useColorPalette && (
                <ColorPaletteSelector
                    selectedColorPaletteId={selectedColorPaletteId}
                    colorPalettes={defaultContinuousSequentialColorPalettes}
                    type={ColorPaletteSelectorType.Continuous}
                    onChange={(palette) => setSelectedColorPaletteId(palette.getId())}
                />
            )}
        </>
    );
};

function roundToSignificantFigures(num: number, n: number): number {
    if (num === 0) return 0;

    const d = Math.ceil(Math.log10(num < 0 ? -num : num));
    const power = n - d;
    const magnitude = Math.pow(10, power);
    const shifted = Math.round(num * magnitude);
    return shifted / magnitude;
}
