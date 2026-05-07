import React from "react";

import { ExpandMore } from "@mui/icons-material";

import { Button, type ButtonProps } from "../Button";
import { ColorTile } from "../ColorTile";

export type ColorSelectProps = Omit<
    ButtonProps,
    "onClick" | "onChange" | "children" | "iconOnly" | "round" | "tone" | "pressed" | "variant" | "ref"
> & {
    value: string;
    onChange: (value: string) => void;
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
            <Button {...buttonProps} ref={ref} onClick={handleButtonClick} variant={variant} tone="neutral">
                <ColorTile.Tile color={selectedColor} size={props.size} />
                <ExpandMore fontSize="inherit" />
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
