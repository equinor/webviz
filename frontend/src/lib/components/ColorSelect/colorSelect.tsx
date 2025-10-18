import React from "react";

import { ExpandMore } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown } from "@lib/components/Dropdown";

import { DenseIconButton } from "../DenseIconButton";

export type ColorSelectProps = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    colors?: string[];
    dense?: boolean;
    disabled?: boolean;
};

export function ColorSelect(props: ColorSelectProps): JSX.Element {
    const [selectedColor, setSelectedColor] = React.useState(props.value);
    const [prevSelectedColor, setPrevSelectedColor] = React.useState(props.value);

    const inputRef = React.useRef<HTMLInputElement>(null);

    if (props.value !== prevSelectedColor) {
        setSelectedColor(props.value);
        setPrevSelectedColor(props.value);
    }

    function handleButtonClick() {
        inputRef.current?.click();
    }

    function handleInputColorChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newColor = e.target.value;
        setSelectedColor(newColor);
        props.onChange(newColor);
    }

    function handleDropdownColorChange(color: string) {
        setSelectedColor(color);
        props.onChange(color);
    }

    function makeSelectComponent() {
        if (props.colors === undefined) {
            return (
                <>
                    {props.dense ? (
                        <DenseIconButton disabled={props.disabled} onClick={handleButtonClick}>
                            <ColorTile color={selectedColor} />
                        </DenseIconButton>
                    ) : (
                        <Button
                            disabled={props.disabled}
                            endIcon={<ExpandMore fontSize="inherit" />}
                            onClick={handleButtonClick}
                        >
                            <ColorTile color={selectedColor} />
                        </Button>
                    )}
                    <input
                        id={props.id}
                        disabled={props.disabled}
                        ref={inputRef}
                        type="color"
                        value={selectedColor}
                        onChange={handleInputColorChange}
                        className="absolute w-px h-px inset-0 invisible"
                    />
                </>
            );
        }

        const options = props.colors.map((color) => ({
            value: color,
            label: color,
            adornment: <ColorTile color={color} />,
        }));

        return (
            <Dropdown
                disabled={props.disabled}
                options={options}
                value={selectedColor}
                onChange={handleDropdownColorChange}
            />
        );
    }

    return <div className="relative">{makeSelectComponent()}</div>;
}
