import React from "react";

import { ExpandMore } from "@mui/icons-material";

import { Button, type ButtonProps } from "../Button";
import { ColorTile } from "../ColorTile";

export type ColorSelectProps = Omit<
    ButtonProps,
    "onClick" | "onChange" | "children" | "iconOnly" | "round" | "tone" | "pressed" | "variant" | "ref"
> & {
    /** The current hex color value. */
    value: string;
    /** Called when the user picks a new color. */
    onChange: (value: string) => void;
    /** Visual style of the button trigger. @default "outlined" */
    variant?: Exclude<ButtonProps["variant"], "contained">;
};

export const ColorSelect = React.forwardRef<HTMLButtonElement, ColorSelectProps>(function ColorSelect(props, ref) {
    const { value, onChange, variant = "outlined", ...buttonProps } = props;
    const [selectedColor, setSelectedColor] = React.useState(value);
    const [prevSelectedColor, setPrevSelectedColor] = React.useState(value);

    const inputRef = React.useRef<HTMLInputElement>(null);

    if (value !== prevSelectedColor) {
        setSelectedColor(value);
        setPrevSelectedColor(value);
    }

    const handleButtonClick = React.useCallback(function handleButtonClick() {
        inputRef.current?.click();
    }, []);

    const handleInputColorChange = React.useCallback(
        function handleInputColorChange(e: React.ChangeEvent<HTMLInputElement>) {
            const newColor = e.target.value;
            setSelectedColor(newColor);
            onChange(newColor);
        },
        [onChange],
    );

    return (
        <>
            <Button {...buttonProps} ref={ref} onClick={handleButtonClick} variant={variant} tone="neutral" iconOnly>
                <ColorTile.Tile color={selectedColor} size={props.size} />
                {props.size !== "small" && <ExpandMore fontSize="inherit" />}
            </Button>
            <input
                id={props.id}
                disabled={props.disabled}
                ref={inputRef}
                type="color"
                value={selectedColor}
                onChange={handleInputColorChange}
                className="invisible absolute inset-0 h-px w-px"
            />
        </>
    );
});
