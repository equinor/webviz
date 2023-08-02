import React from "react";

import { CheckIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { ColorPalette } from "@lib/utils/ColorPalette";

export type CategoricalColorPaletteEditorProps = {
    colorPalette: ColorPalette;
    onChange?: (colorPalette: ColorPalette) => void;
    onClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export const CategoricalColorPaletteEditor: React.FC<CategoricalColorPaletteEditorProps> = (props) => {
    const [colorPalette, setColorPalette] = React.useState<ColorPalette>(props.colorPalette);

    function handleSaveClick() {
        if (props.onChange) {
            props.onChange(colorPalette);
        }
    }

    return (
        <Dialog
            title="Edit color palette"
            open
            onClose={props.onClose}
            width={"25%"}
            actions={
                <Button startIcon={<CheckIcon className="w-4 h-4" />} onClick={handleSaveClick}>
                    Save
                </Button>
            }
        ></Dialog>
    );
};
