import React from "react";

import { ColorPaletteType, WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, Point2D, pointDistance } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { isEqual } from "lodash";

export type ColorScaleSelectorProps = {
    workbenchSettings: WorkbenchSettings;
    colorScale?: ColorScale;
    areBoundariesUserDefined?: boolean;
    onChange?: (colorScale: ColorScale, areBoundariesUserDefined: boolean) => void;
};

export function ColorScaleSelector(props: ColorScaleSelectorProps): React.ReactNode {
    const { onChange } = props;

    const id = React.useId();

    const [colorScale, setColorScale] = React.useState<ColorScale>(
        props.workbenchSettings.useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential })
    );
    const [prevColorScale, setPrevColorScale] = React.useState<ColorScale | undefined>(undefined);

    const [areBoundariesUserDefined, setAreBoundariesUserDefined] = React.useState<boolean>(false);
    const [prevAreBoundariesUserDefined, setPrevAreBoundariesUserDefined] = React.useState<boolean>(false);

    const [lastSelectedSequentialColorPalette, setLastSelectedSequentialColorPalette] = React.useState<ColorPalette>(
        props.colorScale?.getGradientType() === ColorScaleGradientType.Sequential
            ? props.colorScale?.getColorPalette()
            : props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousSequential][0] ?? ""
    );
    const [lastSelectedDivergingColorPalette, setLastSelectedDivergingColorPalette] = React.useState<ColorPalette>(
        props.colorScale?.getGradientType() === ColorScaleGradientType.Diverging
            ? props.colorScale?.getColorPalette()
            : props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousDiverging][0] ?? ""
    );

    if (!isEqual(props.colorScale, prevColorScale)) {
        setPrevColorScale(props.colorScale);
        if (props.colorScale) {
            setColorScale(props.colorScale);
        }
    }

    if (!isEqual(props.areBoundariesUserDefined, prevAreBoundariesUserDefined)) {
        setPrevAreBoundariesUserDefined(props.areBoundariesUserDefined ?? false);
        setAreBoundariesUserDefined(props.areBoundariesUserDefined ?? false);
    }

    function toggleDiscrete(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            checked ? ColorScaleType.Discrete : ColorScaleType.Continuous,
            colorScale.getGradientType(),
            colorScale.getMin(),
            colorScale.getMax(),
            colorScale.getNumSteps(),
            colorScale.getDivMidPoint(),
            areBoundariesUserDefined
        );
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newGradientType = e.target.value as ColorScaleGradientType;
        const lastSelectedColorPalette =
            newGradientType === ColorScaleGradientType.Sequential
                ? lastSelectedSequentialColorPalette
                : lastSelectedDivergingColorPalette;
        makeAndPropagateColorScale(
            lastSelectedColorPalette,
            colorScale.getType(),
            newGradientType,
            colorScale.getMin(),
            colorScale.getMax(),
            colorScale.getNumSteps(),
            colorScale.getDivMidPoint(),
            areBoundariesUserDefined
        );
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        if (colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
            setLastSelectedSequentialColorPalette(colorPalette);
        } else {
            setLastSelectedDivergingColorPalette(colorPalette);
        }
        makeAndPropagateColorScale(
            colorPalette,
            colorScale.getType(),
            colorScale.getGradientType(),
            colorScale.getMin(),
            colorScale.getMax(),
            colorScale.getNumSteps(),
            colorScale.getDivMidPoint(),
            areBoundariesUserDefined
        );
    }

    function setNumSteps(numSteps: number) {
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            colorScale.getType(),
            colorScale.getGradientType(),
            colorScale.getMin(),
            colorScale.getMax(),
            numSteps,
            colorScale.getDivMidPoint(),
            areBoundariesUserDefined
        );
    }

    const makeAndPropagateColorScale = React.useCallback(
        function makeAndPropagateColorScale(
            colorPalette: ColorPalette,
            type: ColorScaleType,
            gradientType: ColorScaleGradientType,
            min: number,
            max: number,
            numSteps: number,
            divMid: number,
            areBoundariesUserDefined: boolean
        ) {
            const colorScale = new ColorScale({
                colorPalette,
                type,
                gradientType,
                steps: numSteps,
            });
            if (gradientType === ColorScaleGradientType.Diverging) {
                colorScale.setRangeAndMidPoint(min, max, divMid);
            } else {
                colorScale.setRange(min, max);
            }
            setColorScale(colorScale);
            if (onChange) {
                onChange(colorScale, areBoundariesUserDefined);
            }
        },
        [onChange]
    );

    const handleMinMaxDivMidPointChange = React.useCallback(
        function handleMinMaxDivMidPointChange(min: number, max: number, divMidPoint?: number) {
            setAreBoundariesUserDefined(areBoundariesUserDefined);
            makeAndPropagateColorScale(
                colorScale.getColorPalette(),
                colorScale.getType(),
                colorScale.getGradientType(),
                min,
                max,
                colorScale.getNumSteps(),
                divMidPoint ?? colorScale.getDivMidPoint(),
                areBoundariesUserDefined
            );
        },
        [colorScale, makeAndPropagateColorScale, areBoundariesUserDefined]
    );

    const handleAreBoundariesUserDefinedChange = React.useCallback(
        function handleAreBoundariesUserDefinedChange(areBoundariesUserDefined: boolean) {
            setAreBoundariesUserDefined(areBoundariesUserDefined);
            if (onChange) {
                onChange(colorScale, areBoundariesUserDefined);
            }
        },
        [colorScale, onChange]
    );

    return (
        <div className="flex flex-col gap-4">
            <RadioGroup
                value={colorScale.getGradientType()}
                onChange={handleGradientTypeChange}
                options={[
                    {
                        value: ColorScaleGradientType.Sequential,
                        label: "Sequential",
                    },
                    {
                        value: ColorScaleGradientType.Diverging,
                        label: "Diverging",
                    },
                ]}
                direction="horizontal"
            />
            <Label text="Steps" position="left">
                <div className="flex gap-2 items-center">
                    <div className="h-6">
                        <Switch checked={colorScale.getType() === ColorScaleType.Discrete} onChange={toggleDiscrete} />
                    </div>
                    <Input
                        type="number"
                        value={colorScale.getNumSteps()}
                        onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
                        disabled={colorScale.getType() !== ColorScaleType.Discrete}
                        min={2}
                    />
                </div>
            </Label>
            <ColorScaleSetter
                id={id}
                selectedColorPalette={colorScale.getColorPalette()}
                colorPalettes={props.workbenchSettings.getColorPalettes()[getPaletteTypeFromColorScale(colorScale)]}
                type={colorScale.getType()}
                gradientType={colorScale.getGradientType()}
                min={colorScale.getMin()}
                max={colorScale.getMax()}
                divMidPoint={colorScale.getDivMidPoint()}
                steps={colorScale.getNumSteps()}
                areBoundariesUserDefined={areBoundariesUserDefined}
                onChangeColorPalette={handleColorPaletteChange}
                onChangeMinMaxDivMidPoint={handleMinMaxDivMidPointChange}
                onChangeAreBoundariesUserDefined={handleAreBoundariesUserDefinedChange}
            />
        </div>
    );
}

type ColorScaleSetterProps = {
    id: string;
    type: ColorScaleType;
    min: number;
    max: number;
    steps: number;
    divMidPoint: number;
    gradientType: ColorScaleGradientType;
    colorPalettes: ColorPalette[];
    selectedColorPalette: ColorPalette;
    areBoundariesUserDefined: boolean;
    onChangeMinMaxDivMidPoint: (min: number, max: number, divMidPoint?: number) => void;
    onChangeColorPalette: (colorPalette: ColorPalette) => void;
    onChangeAreBoundariesUserDefined: (areBoundariesUserDefined: boolean) => void;
};

function ColorScaleSetter(props: ColorScaleSetterProps): React.ReactNode {
    const [min, setMin] = React.useState<number>(props.min);
    const [max, setMax] = React.useState<number>(props.max);
    const [divMidPoint, setDivMidPoint] = React.useState<number>(props.divMidPoint);

    const [prevMin, setPrevMin] = React.useState<number>(props.min);
    const [prevMax, setPrevMax] = React.useState<number>(props.max);
    const [prevDivMidPoint, setPrevDivMidPoint] = React.useState<number>(props.divMidPoint);

    if (prevMin !== props.min) {
        setMin(props.min);
        setPrevMin(props.min);
    }

    if (prevMax !== props.max) {
        setMax(props.max);
        setPrevMax(props.max);
    }

    if (prevDivMidPoint !== props.divMidPoint) {
        setDivMidPoint(props.divMidPoint);
        setPrevDivMidPoint(props.divMidPoint);
    }

    const handleMinMaxDivMidPointChange = React.useCallback(function handleMinMaxDivMidPointChange(
        min: number,
        max: number,
        divMidPoint?: number
    ) {
        setMin(min);
        setMax(max);
        if (divMidPoint !== undefined) {
            setDivMidPoint(divMidPoint);
        }
    },
    []);

    return (
        <div>
            <ColorScalePaletteSelector
                id={props.id}
                colorPalettes={props.colorPalettes}
                selectedColorPalette={props.selectedColorPalette}
                type={props.type}
                gradientType={props.gradientType}
                min={min}
                max={max}
                divMidPoint={divMidPoint}
                steps={props.steps}
                onChange={props.onChangeColorPalette}
            />
            <MinMaxDivMidPointSetter
                min={min}
                max={max}
                divMidPoint={divMidPoint}
                gradientType={props.gradientType}
                areBoundariesUserDefined={props.areBoundariesUserDefined}
                onChange={props.onChangeMinMaxDivMidPoint}
                onChangePreview={handleMinMaxDivMidPointChange}
                onChangeAreBoundariesUserDefined={props.onChangeAreBoundariesUserDefined}
            />
        </div>
    );
}

type MinMaxDivMidPointSetterProps = {
    min: number;
    max: number;
    divMidPoint: number;
    gradientType: ColorScaleGradientType;
    areBoundariesUserDefined: boolean;
    onChange: (min: number, max: number, divMidPoint?: number) => void;
    onChangePreview: (min: number, max: number, divMidPoint?: number) => void;
    onChangeAreBoundariesUserDefined: (areBoundariesUserDefined: boolean) => void;
};

function MinMaxDivMidPointSetter(props: MinMaxDivMidPointSetterProps): React.ReactNode {
    const { onChange, onChangePreview } = props;

    const [min, setMin] = React.useState<number>(props.min);
    const [prevMin, setPrevMin] = React.useState<number>(props.min);
    const [max, setMax] = React.useState<number>(props.max);
    const [prevMax, setPrevMax] = React.useState<number>(props.max);
    const [divMidPoint, setDivMidPoint] = React.useState<number>(props.divMidPoint);
    const [prevDivMidPoint, setPrevDivMidPoint] = React.useState<number>(props.divMidPoint);
    const [areBoundariesUserDefined, setAreBoundariesUserDefined] = React.useState<boolean>(
        props.areBoundariesUserDefined
    );
    const [prevAreBoundariesUserDefined, setPrevAreBoundariesUserDefined] = React.useState<boolean>(
        props.areBoundariesUserDefined
    );

    const [isDragging, setIsDragging] = React.useState<boolean>(false);

    const divMidPointRef = React.useRef<HTMLDivElement>(null);
    const containerDivRef = React.useRef<HTMLDivElement>(null);

    if (prevMin !== props.min) {
        setMin(props.min);
        setPrevMin(props.min);
    }

    if (prevMax !== props.max) {
        setMax(props.max);
        setPrevMax(props.max);
    }

    if (prevDivMidPoint !== props.divMidPoint) {
        setDivMidPoint(props.divMidPoint);
        setPrevDivMidPoint(props.divMidPoint);
    }

    if (prevAreBoundariesUserDefined !== props.areBoundariesUserDefined) {
        setAreBoundariesUserDefined(props.areBoundariesUserDefined);
        setPrevAreBoundariesUserDefined(props.areBoundariesUserDefined);
    }

    React.useEffect(
        function handleMount() {
            const currentDivMidPointRef = divMidPointRef.current;
            const currentContainerDivRef = containerDivRef.current;

            if (!currentDivMidPointRef || !currentContainerDivRef) {
                return;
            }

            let dragging = false;
            let pointerDownPosition: Point2D | null = null;
            let pointerDownPositionRelativeToElement: Point2D = { x: 0, y: 0 };
            let newDivMidPoint = 0;

            function handlePointerDown(e: PointerEvent) {
                if (!currentDivMidPointRef) {
                    return;
                }
                pointerDownPosition = { x: e.clientX, y: e.clientY };
                pointerDownPositionRelativeToElement = {
                    x: e.clientX - currentDivMidPointRef.getBoundingClientRect().left,
                    y: e.clientY - currentDivMidPointRef.getBoundingClientRect().top,
                };
                setIsDragging(true);

                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !currentContainerDivRef) {
                    return;
                }

                if (
                    !dragging &&
                    pointDistance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    dragging = true;
                }

                if (!dragging) {
                    return;
                }

                const containerRect = currentContainerDivRef.getBoundingClientRect();
                const dx = e.clientX - pointerDownPositionRelativeToElement.x;

                const newRelativeDivMidPoint = Math.min(
                    Math.max((dx + convertRemToPixels(0.75) - containerRect.left) / containerRect.width, 0),
                    1
                );

                newDivMidPoint = min + newRelativeDivMidPoint * (max - min);

                setDivMidPoint(newDivMidPoint);
                onChangePreview(min, max, newDivMidPoint);
            }

            function handlePointerUp() {
                if (!dragging) {
                    return;
                }

                dragging = false;
                setIsDragging(false);
                onChange(min, max, newDivMidPoint);
                pointerDownPosition = null;
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
            }

            currentDivMidPointRef.addEventListener("pointerdown", handlePointerDown);

            return () => {
                currentDivMidPointRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
            };
        },
        [onChange, onChangePreview, min, max]
    );

    function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
        let newMin = parseFloat(e.target.value);
        let newDivMidPoint = divMidPoint;
        if (newMin >= max) {
            newMin = max - 0.000001;
        }
        if (newMin > divMidPoint) {
            newDivMidPoint = newMin;
        }
        setMin(newMin);
        props.onChange(newMin, max, newDivMidPoint);
    }

    function handleMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
        let newMax = parseFloat(e.target.value);
        let newDivMidPoint = divMidPoint;
        if (newMax <= min) {
            newMax = min + 0.000001;
        }
        if (newMax < divMidPoint) {
            newDivMidPoint = newMax;
        }
        setMax(newMax);
        props.onChange(min, newMax, newDivMidPoint);
    }

    function handleDivMidPointChange(e: React.ChangeEvent<HTMLInputElement>) {
        let newDivMidPoint = parseFloat(e.target.value);
        if (newDivMidPoint <= min) {
            newDivMidPoint = min;
        }
        if (newDivMidPoint >= max) {
            newDivMidPoint = max;
        }
        setDivMidPoint(newDivMidPoint);
        props.onChange(min, max, newDivMidPoint);
    }

    function handleAreBoundariesUserDefinedToggle(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        props.onChangeAreBoundariesUserDefined(checked);
    }

    return (
        <>
            {isDragging &&
                createPortal(<div className="absolute z-40 transparent w-full h-full inset-0 cursor-ew-resize"></div>)}
            <div className="relative w-full h-5 border-l border-r border-gray-500" ref={containerDivRef}>
                <div
                    title="Drag to adjust mid point"
                    className={resolveClassNames(
                        "absolute -top-1.5 -ml-1.5 w-3 h-3 rotate-45 bg-gray-500 hover:bg-blue-500 cursor-ew-resize",
                        {
                            "z-50": isDragging,
                            hidden:
                                props.gradientType === ColorScaleGradientType.Sequential || !areBoundariesUserDefined,
                        }
                    )}
                    style={{ left: `${(divMidPoint / (max - min)) * 100}%` }}
                    ref={divMidPointRef}
                />
            </div>
            <div className="flex gap-2">
                <Input
                    type="number"
                    value={min}
                    onChange={handleMinChange}
                    title="Min"
                    max={max - 0.000001}
                    disabled={!areBoundariesUserDefined}
                />
                {props.gradientType !== ColorScaleGradientType.Sequential && (
                    <Input
                        type="number"
                        value={divMidPoint}
                        onChange={handleDivMidPointChange}
                        min={min + 0.000001}
                        max={max}
                        title="Mid point"
                        disabled={!areBoundariesUserDefined}
                    />
                )}
                <Input
                    type="number"
                    value={max}
                    onChange={handleMaxChange}
                    title="Max"
                    min={min}
                    disabled={!areBoundariesUserDefined}
                />
            </div>
            <div className="mt-2">
                <Label text="Use custom boundaries" position="left">
                    <Switch checked={areBoundariesUserDefined} onChange={handleAreBoundariesUserDefinedToggle} />
                </Label>
            </div>
        </>
    );
}

function getPaletteTypeFromColorScale(colorScale: ColorScale): ColorPaletteType {
    if (colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
        return ColorPaletteType.ContinuousSequential;
    }
    return ColorPaletteType.ContinuousDiverging;
}

type ColorScalePaletteSelectorProps = {
    id: string;
    colorPalettes: ColorPalette[];
    selectedColorPalette: ColorPalette;
    type: ColorScaleType;
    gradientType: ColorScaleGradientType;
    min: number;
    max: number;
    divMidPoint: number;
    steps: number;
    onChange?: (colorPalette: ColorPalette) => void;
};

const ColorScalePaletteSelector: React.FC<ColorScalePaletteSelectorProps> = (props) => {
    const [open, setOpen] = React.useState<boolean>(false);
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(props.selectedColorPalette);
    const [prevSelectedColorPalette, setPrevSelectedColorPalette] = React.useState<ColorPalette>(
        props.selectedColorPalette
    );

    if (prevSelectedColorPalette.getId() !== props.selectedColorPalette.getId()) {
        setPrevSelectedColorPalette(props.selectedColorPalette);
        setSelectedColorPalette(props.selectedColorPalette);
    }

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

    function handleClick() {
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
                discrete={props.type === ColorScaleType.Discrete}
                gradientType={props.gradientType}
                min={props.min}
                max={props.max}
                divMid={props.divMidPoint}
                steps={props.steps}
                onClick={() => {
                    handleColorPaletteSelected(colorPalette);
                }}
                selected={selectedColorPalette.getId() === colorPalette.getId()}
                id={props.id}
            />
        ));
    }

    const marginTop = Math.max(-boundingRect.top, convertRemToPixels((-(props.colorPalettes.length - 1) * 3) / 2));

    return (
        <div className="bg-slate-100 rounded flex items-center" ref={ref}>
            <div className="flex-grow cursor-pointer" onClick={handleClick}>
                {makeColorScalePalettePreview(
                    selectedColorPalette,
                    props.gradientType,
                    props.type === ColorScaleType.Discrete,
                    props.steps,
                    props.min,
                    props.max,
                    props.divMidPoint,
                    props.id
                )}
            </div>
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

function makeGradientId(id: string, colorPalette: ColorPalette): string {
    return `${id}-color-scale-gradient-${colorPalette.getId()}`;
}

type GradientDefProps = {
    id: string;
    colorScale: ColorScale;
};

function GradientDef(props: GradientDefProps): React.ReactNode {
    const colorStops = props.colorScale.getColorStops();
    const gradientId = makeGradientId(props.id, props.colorScale.getColorPalette());

    return (
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            {colorStops.map((colorStop, index) => (
                <stop key={index} offset={`${(colorStop.offset * 100).toFixed(2)}%`} stopColor={colorStop.color} />
            ))}
        </linearGradient>
    );
}

function makeColorScalePalettePreview(
    colorPalette: ColorPalette,
    gradientType: ColorScaleGradientType,
    discrete: boolean,
    steps: number,
    min: number,
    max: number,
    divMidPoint: number,
    id: string
): React.ReactNode {
    const colorScale = new ColorScale({
        colorPalette,
        type: discrete ? ColorScaleType.Discrete : ColorScaleType.Continuous,
        gradientType: gradientType,
        steps,
    });

    if (gradientType === ColorScaleGradientType.Diverging) {
        colorScale.setRangeAndMidPoint(min, max, divMidPoint);
    }

    const colorScaleGradientId = makeGradientId(id, colorPalette);

    return (
        <svg className="w-full h-5" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <GradientDef id={id} colorScale={colorScale} />
            </defs>
            <rect height="1.25rem" width="100%" fill={`url(#${colorScaleGradientId})`} stroke="#555" />
        </svg>
    );
}

type ColorPaletteItemProps = {
    id: string;
    colorPalette: ColorPalette;
    onClick?: () => void;
    selected?: boolean;
    discrete: boolean;
    gradientType: ColorScaleGradientType;
    min: number;
    max: number;
    divMid: number;
    steps: number;
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
            <div className="flex-grow">
                {makeColorScalePalettePreview(
                    props.colorPalette,
                    props.gradientType,
                    props.discrete,
                    props.steps,
                    props.min,
                    props.max,
                    props.divMid,
                    props.id
                )}
            </div>
        </div>
    );
};
