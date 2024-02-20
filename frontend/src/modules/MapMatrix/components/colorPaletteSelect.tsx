import React from "react";

import {
    defaultContinuousDivergingColorPalettes,
    defaultContinuousSequentialColorPalettes,
} from "@framework/WorkbenchSettings";
import {
    ColorPaletteSelector,
    ColorPaletteSelectorType,
} from "@framework/internal/components/LeftSettingsPanel/private-components/colorPaletteSettings";
import { ColorPalette } from "@lib/utils/ColorPalette";

type ColorPaletteSelectProps = {
    colorPaletteId: string;

    onChange: (colorPaletteId: string) => void;
};
export const ColorPaletteSelect: React.FC<ColorPaletteSelectProps> = (props) => {
    // const [selectedColorPaletteId, setSelectedColorPaletteId] = React.useState(props.initialColorPaletteId);

    const handleSelectionChange = (colorPalette: ColorPalette) => {
        console.log(colorPalette.getId());
        props.onChange?.(colorPalette.getId());
    };
    return (
        <>
            <tr>
                <td className="px-6 py-0 whitespace-nowrap">Color palette</td>

                <td className="px-6 py-0 whitespace-nowrap">
                    <ColorPaletteSelector
                        selectedColorPaletteId={props.colorPaletteId}
                        colorPalettes={[
                            ...defaultContinuousSequentialColorPalettes,
                            ...defaultContinuousDivergingColorPalettes,
                        ]}
                        type={ColorPaletteSelectorType.Continuous}
                        onChange={handleSelectionChange}
                    />
                </td>
            </tr>
        </>
    );
};
