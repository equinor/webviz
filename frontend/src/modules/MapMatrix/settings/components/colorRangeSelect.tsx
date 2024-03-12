import React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";

type ColorRangeSelectProps = {
    valueMin: number;
    valueMax: number;
    onChange: (valueRange: [number, number]) => void;
};

//TODO: Handle inputting negative numbers (Start with a minus sign)
export const ColorRangeSelect: React.FC<ColorRangeSelectProps> = (props) => {
    const [useMin, setUseMin] = React.useState(false);
    const [useMax, setUseMax] = React.useState(false);

    const [colorMin, setColorMin] = React.useState(props.valueMin);
    const [colorMax, setColorMax] = React.useState(props.valueMax);
    const [dataMin, setDataMin] = React.useState(props.valueMin);
    const [dataMax, setDataMax] = React.useState(props.valueMax);

    if (dataMin !== props.valueMin) {
        setDataMin(props.valueMin);
    }
    if (dataMax !== props.valueMax) {
        setDataMax(props.valueMax);
    }
    const displayedMin = useMin ? colorMin : props.valueMin;
    const displayedMax = useMax ? colorMax : props.valueMax;

    React.useEffect(() => {
        const min = useMin ? colorMin : props.valueMin;
        const max = useMax ? colorMax : props.valueMax;
        props.onChange([min, max]);
    }, [colorMin, useMin, colorMax, useMax, dataMin, dataMax]);
    return (
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">Color range</td>
            <td className="px-6 py-0 whitespace-nowrap">
                <div className="items-center mt-2 flex flex-row">
                    <Checkbox onChange={(e: any) => setUseMin(e.target.checked)} checked={useMin} />

                    <div className="ml-2 mr-1 py-0 whitespace-nowrap">Min</div>
                    <div>
                        <Input
                            disabled={!useMin}
                            className="text-xs"
                            type="number"
                            value={roundToSignificantFigures(displayedMin, 4)}
                            onChange={(e) => {
                                setColorMin(parseFloat(e.target.value));
                            }}
                        />
                    </div>
                    <div className="ml-2 mr-1 py-0 whitespace-nowrap">
                        <Checkbox onChange={(e: any) => setUseMax(e.target.checked)} checked={useMax} />
                    </div>
                    <div className="ml-2 mr-1 py-0 whitespace-nowrap">Max</div>
                    <div>
                        <Input
                            disabled={!useMax}
                            className="text-xs"
                            type="number"
                            value={roundToSignificantFigures(displayedMax, 4)}
                            onChange={(e) => {
                                setColorMax(parseFloat(e.target.value));
                            }}
                        />
                    </div>
                </div>
            </td>
        </tr>
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
