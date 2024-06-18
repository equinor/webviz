import React from "react";

import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { Overlay } from "@lib/components/Overlay";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { ExpandMore } from "@mui/icons-material";

export enum ColorPaletteSelectorType {
    Categorical = "categorical",
    Continuous = "continuous",
    Discrete = "discrete",
}

function makeColorPalettePreview(
    colorPalette: ColorPalette,
    type: ColorPaletteSelectorType,
    steps?: number
): React.ReactNode {
    switch (type) {
        case ColorPaletteSelectorType.Continuous:
            return <ColorGradient colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Categorical:
            return <ColorTileGroup colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Discrete:
            return <ColorGradient colorPalette={colorPalette} steps={steps} />;
    }
}

type ColorPaletteItemProps = {
    colorPalette: ColorPalette;
    onClick?: () => void;
    selected?: boolean;
    type: ColorPaletteSelectorType;
    steps?: number;
};

const ColorPaletteItem: React.FC<ColorPaletteItemProps> = (props) => {
    function handleItemClick() {
        if (!props.onClick) {
            return;
        }

        props.onClick();
    }

    return (
        <div
            className={resolveClassNames("p-2 flex items-center gap-2 hover:bg-blue-100 cursor-pointer h-12", {
                "bg-blue-50": props.selected,
            })}
            onClick={handleItemClick}
        >
            <span
                className="text-sm leading-none min-w-0 w-20 whitespace-nowrap text-ellipsis overflow-hidden"
                title={props.colorPalette.getName()}
            >
                {props.colorPalette.getName()}
            </span>
            <div className="flex-grow">{makeColorPalettePreview(props.colorPalette, props.type, props.steps)}</div>
        </div>
    );
};

export type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPaletteId: string;
    onChange?: (colorPalette: ColorPalette) => void;
    type: ColorPaletteSelectorType;
    steps?: number;
};

export const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    const [open, setOpen] = React.useState<boolean>(false);
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(
        props.colorPalettes.find((el) => el.getId() === props.selectedColorPaletteId) || props.colorPalettes[0]
    );

    const ref = React.useRef<HTMLDivElement>(null);
    const dropdownContentRef = React.useRef<HTMLDivElement>(null);

    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(function addPointerEvents() {
        function handlePointerDown(event: PointerEvent) {
            if (dropdownContentRef.current?.contains(event.target as Node)) {
                return;
            }

            setOpen(false);
        }

        window.addEventListener("pointerdown", handlePointerDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
        };
    }, []);

    function handleChevronClick() {
        setOpen(!open);
    }

    function handleColorPaletteSelected(colorPalette: ColorPalette) {
        setSelectedColorPalette(colorPalette);
        setOpen(false);

        if (!props.onChange) {
            return;
        }

        props.onChange(colorPalette);
    }

    function renderColorPalettes() {
        return props.colorPalettes.map((colorPalette) => (
            <ColorPaletteItem
                key={colorPalette.getId()}
                colorPalette={colorPalette}
                type={props.type}
                onClick={() => {
                    handleColorPaletteSelected(colorPalette);
                }}
                selected={selectedColorPalette.getId() === colorPalette.getId()}
                steps={props.steps}
            />
        ));
    }

    const height = convertRemToPixels(props.colorPalettes.length * 3);
    let marginTop = Math.max(-boundingRect.top, convertRemToPixels((-(props.colorPalettes.length - 1) * 3) / 2));
    if (boundingRect.top - marginTop + height > window.innerHeight) {
        marginTop = -(boundingRect.top + height - window.innerHeight + 8);
    }

    return (
        <div className="bg-slate-100 rounded p-2 flex items-center gap-4" ref={ref}>
            <div className="flex-grow">{makeColorPalettePreview(selectedColorPalette, props.type, props.steps)}</div>
            <IconButton onClick={handleChevronClick}>
                <ExpandMore fontSize="small" className="flex-grow-0" />
            </IconButton>
            {open &&
                createPortal(
                    <>
                        <Overlay visible={true} />
                        <div
                            ref={dropdownContentRef}
                            className="absolute z-[60] shadow bg-white rounded overflow-hidden"
                            style={{
                                left: boundingRect.left,
                                top: boundingRect.top,
                                width: boundingRect.width,
                                marginTop: marginTop,
                                height: `${props.colorPalettes.length * 3}rem`,
                            }}
                        >
                            {renderColorPalettes()}
                        </div>
                    </>
                )}
        </div>
    );
};
