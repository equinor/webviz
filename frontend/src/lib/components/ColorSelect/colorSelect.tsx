import React from "react";

import { Button } from "@lib/components/Button";
import { ColorTile } from "@lib/components/ColorTile";
import { Dropdown } from "@lib/components/Dropdown";
import { ExpandMore } from "@mui/icons-material";

export type ColorSelectProps = {
    value: string;
    onChange: (value: string) => void;
    colors?: string[];
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
                    <Button endIcon={<ExpandMore fontSize="inherit" />} onClick={handleButtonClick}>
                        <ColorTile color={selectedColor} />
                    </Button>
                    <input
                        ref={inputRef}
                        type="color"
                        value={selectedColor}
                        onChange={handleInputColorChange}
                        className="absolute w-[1px] h-[1px] inset-0 z-1 invisible"
                    />
                </>
            );
        }

        const options = props.colors.map((color) => ({
            value: color,
            label: color,
            adornment: <ColorTile color={color} />,
        }));

        return <Dropdown options={options} value={selectedColor} onChange={handleDropdownColorChange} />;
    }

    return <div className="relative">{makeSelectComponent()}</div>;
}
