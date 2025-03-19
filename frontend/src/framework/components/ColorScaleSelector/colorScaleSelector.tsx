import React from "react";

import { ColorPaletteType, WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { ColorScalePreview } from "@lib/components/ColorScalePreview";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { Vec2, point2Distance } from "@lib/utils/vec2";

import { isEqual } from "lodash";

export type ColorScaleConfig = {
    colorScale: ColorScale;
    areBoundariesUserDefined: boolean;
};

export type ColorScaleSelectorProps = {
    workbenchSettings: WorkbenchSettings;
    colorScaleConfig?: ColorScaleConfig;
    onChange?: (colorScaleConfig: ColorScaleConfig) => void;
};

export function ColorScaleSelector(props: ColorScaleSelectorProps): React.ReactNode {
    const id = React.useId();

    const [colorScaleConfig, setColorScaleConfig] = React.useState<ColorScaleConfig>({
        colorScale: props.workbenchSettings.useContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        }),
        areBoundariesUserDefined: false,
    });
    const [tempColorScaleConfig, setTempColorScaleConfig] = React.useState<ColorScaleConfig>(colorScaleConfig);
    const [prevColorScaleConfig, setPrevColorScaleConfig] = React.useState<ColorScaleConfig | undefined>(undefined);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

    if (!isEqual(props.colorScaleConfig, prevColorScaleConfig)) {
        setPrevColorScaleConfig(props.colorScaleConfig);
        if (props.colorScaleConfig) {
            setColorScaleConfig(props.colorScaleConfig);
        }
    }

    function handleClick() {
        setDialogOpen(true);
    }

    function handleAcceptChanges() {
        setColorScaleConfig(tempColorScaleConfig);
        setDialogOpen(false);
        props.onChange?.(tempColorScaleConfig);
    }

    function handleDiscardChanges() {
        setTempColorScaleConfig(colorScaleConfig);
        setDialogOpen(false);
    }

    function handleColorScaleChange(colorScaleConfig: ColorScaleConfig) {
        setTempColorScaleConfig(colorScaleConfig);
    }

    return (
        <>
            <div
                className="flex-grow cursor-pointer border border-slate-400 hover:outline hover:outline-1 hover:outline-blue-300 rounded overflow-hidden"
                onClick={handleClick}
            >
                <ColorScalePreview
                    colorPalette={colorScaleConfig.colorScale.getColorPalette()}
                    gradientType={colorScaleConfig.colorScale.getGradientType()}
                    discrete={colorScaleConfig.colorScale.getType() === ColorScaleType.Discrete}
                    steps={colorScaleConfig.colorScale.getNumSteps()}
                    min={colorScaleConfig.colorScale.getMin()}
                    max={colorScaleConfig.colorScale.getMax()}
                    divMidPoint={colorScaleConfig.colorScale.getDivMidPoint()}
                    id={id}
                />
            </div>
            <Dialog
                open={dialogOpen}
                onClose={handleDiscardChanges}
                title="Color Scale Selector"
                width={"33%"}
                modal
                actions={
                    <>
                        <Button color="primary" onClick={handleAcceptChanges}>
                            OK
                        </Button>
                        <Button color="danger" onClick={handleDiscardChanges}>
                            Discard
                        </Button>
                    </>
                }
            >
                <ColorScaleSelectorDialog
                    {...props}
                    colorScaleConfig={tempColorScaleConfig}
                    onChange={handleColorScaleChange}
                />
            </Dialog>
        </>
    );
}

function ColorScaleSelectorDialog(props: ColorScaleSelectorProps): React.ReactNode {
    const { onChange } = props;

    const id = React.useId();

    const [colorScaleConfig, setColorScaleConfig] = React.useState<ColorScaleConfig>({
        colorScale: props.workbenchSettings.useContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        }),
        areBoundariesUserDefined: false,
    });
    const [prevColorScaleConfig, setPrevColorScaleConfig] = React.useState<ColorScaleConfig | undefined>(undefined);

    const [lastSelectedSequentialColorPalette, setLastSelectedSequentialColorPalette] = React.useState<ColorPalette>(
        props.colorScaleConfig?.colorScale.getGradientType() === ColorScaleGradientType.Sequential
            ? props.colorScaleConfig?.colorScale.getColorPalette()
            : props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousSequential][0] ?? ""
    );
    const [lastSelectedDivergingColorPalette, setLastSelectedDivergingColorPalette] = React.useState<ColorPalette>(
        props.colorScaleConfig?.colorScale.getGradientType() === ColorScaleGradientType.Diverging
            ? props.colorScaleConfig?.colorScale.getColorPalette()
            : props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousDiverging][0] ?? ""
    );

    if (!isEqual(props.colorScaleConfig, prevColorScaleConfig)) {
        setPrevColorScaleConfig(props.colorScaleConfig);
        if (props.colorScaleConfig) {
            setColorScaleConfig(props.colorScaleConfig);
        }
    }

    function toggleDiscrete(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        makeAndPropagateColorScale(
            colorScaleConfig.colorScale.getColorPalette(),
            checked ? ColorScaleType.Discrete : ColorScaleType.Continuous,
            colorScaleConfig.colorScale.getGradientType(),
            colorScaleConfig.colorScale.getMin(),
            colorScaleConfig.colorScale.getMax(),
            colorScaleConfig.colorScale.getNumSteps(),
            colorScaleConfig.colorScale.getDivMidPoint(),
            colorScaleConfig.areBoundariesUserDefined
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
            colorScaleConfig.colorScale.getType(),
            newGradientType,
            colorScaleConfig.colorScale.getMin(),
            colorScaleConfig.colorScale.getMax(),
            colorScaleConfig.colorScale.getNumSteps(),
            colorScaleConfig.colorScale.getDivMidPoint(),
            colorScaleConfig.areBoundariesUserDefined
        );
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        if (colorScaleConfig.colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
            setLastSelectedSequentialColorPalette(colorPalette);
        } else {
            setLastSelectedDivergingColorPalette(colorPalette);
        }
        makeAndPropagateColorScale(
            colorPalette,
            colorScaleConfig.colorScale.getType(),
            colorScaleConfig.colorScale.getGradientType(),
            colorScaleConfig.colorScale.getMin(),
            colorScaleConfig.colorScale.getMax(),
            colorScaleConfig.colorScale.getNumSteps(),
            colorScaleConfig.colorScale.getDivMidPoint(),
            colorScaleConfig.areBoundariesUserDefined
        );
    }

    function setNumSteps(numSteps: number) {
        makeAndPropagateColorScale(
            colorScaleConfig.colorScale.getColorPalette(),
            colorScaleConfig.colorScale.getType(),
            colorScaleConfig.colorScale.getGradientType(),
            colorScaleConfig.colorScale.getMin(),
            colorScaleConfig.colorScale.getMax(),
            numSteps,
            colorScaleConfig.colorScale.getDivMidPoint(),
            colorScaleConfig.areBoundariesUserDefined
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
            const colorScaleConfig = { colorScale, areBoundariesUserDefined };
            setColorScaleConfig(colorScaleConfig);
            if (onChange) {
                onChange(colorScaleConfig);
            }
        },
        [onChange]
    );

    const handleMinMaxDivMidPointChange = React.useCallback(
        function handleMinMaxDivMidPointChange(min: number, max: number, divMidPoint?: number) {
            makeAndPropagateColorScale(
                colorScaleConfig.colorScale.getColorPalette(),
                colorScaleConfig.colorScale.getType(),
                colorScaleConfig.colorScale.getGradientType(),
                min,
                max,
                colorScaleConfig.colorScale.getNumSteps(),
                divMidPoint ?? colorScaleConfig.colorScale.getDivMidPoint(),
                colorScaleConfig.areBoundariesUserDefined
            );
        },
        [colorScaleConfig, makeAndPropagateColorScale]
    );

    const handleAreBoundariesUserDefinedChange = React.useCallback(
        function handleAreBoundariesUserDefinedChange(areBoundariesUserDefined: boolean) {
            makeAndPropagateColorScale(
                colorScaleConfig.colorScale.getColorPalette(),
                colorScaleConfig.colorScale.getType(),
                colorScaleConfig.colorScale.getGradientType(),
                colorScaleConfig.colorScale.getMin(),
                colorScaleConfig.colorScale.getMax(),
                colorScaleConfig.colorScale.getNumSteps(),
                colorScaleConfig.colorScale.getDivMidPoint(),
                areBoundariesUserDefined
            );
        },
        [colorScaleConfig, makeAndPropagateColorScale]
    );

    return (
        <div className="flex flex-col gap-4">
            <RadioGroup
                value={colorScaleConfig.colorScale.getGradientType()}
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
                        <Switch
                            checked={colorScaleConfig.colorScale.getType() === ColorScaleType.Discrete}
                            onChange={toggleDiscrete}
                        />
                    </div>
                    <Input
                        type="number"
                        value={colorScaleConfig.colorScale.getNumSteps()}
                        onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
                        disabled={colorScaleConfig.colorScale.getType() !== ColorScaleType.Discrete}
                        min={2}
                    />
                </div>
            </Label>
            <ColorScaleSetter
                id={id}
                selectedColorPalette={colorScaleConfig.colorScale.getColorPalette()}
                colorPalettes={
                    props.workbenchSettings.getColorPalettes()[
                        getPaletteTypeFromColorScale(colorScaleConfig.colorScale)
                    ]
                }
                type={colorScaleConfig.colorScale.getType()}
                gradientType={colorScaleConfig.colorScale.getGradientType()}
                min={colorScaleConfig.colorScale.getMin()}
                max={colorScaleConfig.colorScale.getMax()}
                divMidPoint={colorScaleConfig.colorScale.getDivMidPoint()}
                steps={colorScaleConfig.colorScale.getNumSteps()}
                areBoundariesUserDefined={colorScaleConfig.areBoundariesUserDefined}
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

    if (divMidPoint < min) {
        setDivMidPoint(min);
    }

    if (divMidPoint > max) {
        setDivMidPoint(max);
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
                {...props}
                min={min}
                max={max}
                divMidPoint={divMidPoint}
                onChange={props.onChangeColorPalette}
            />
            <MinMaxDivMidPointSetter
                {...props}
                min={min}
                max={max}
                divMidPoint={divMidPoint}
                onChange={props.onChangeMinMaxDivMidPoint}
                onChangePreview={handleMinMaxDivMidPointChange}
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
            let pointerDownPosition: Vec2 | null = null;
            let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
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
                    point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
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

    function handleMinChange(value: string) {
        let newMin = parseFloat(value);
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

    function handleMaxChange(value: string) {
        let newMax = parseFloat(value);
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

    function handleDivMidPointChange(value: string) {
        let newDivMidPoint = parseFloat(value);
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
            <div className="relative w-full h-3 border-l border-r border-gray-500" ref={containerDivRef}>
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
                    style={{ left: `${(Math.abs(divMidPoint - min) / Math.abs(max - min)) * 100}%` }}
                    ref={divMidPointRef}
                />
            </div>
            <div className="flex gap-2 justify-between">
                <Input
                    type="number"
                    value={min}
                    onValueChange={handleMinChange}
                    title="Min"
                    max={max - 0.000001}
                    disabled={!areBoundariesUserDefined}
                />
                {props.gradientType !== ColorScaleGradientType.Sequential && (
                    <Input
                        type="number"
                        value={divMidPoint}
                        onValueChange={handleDivMidPointChange}
                        min={min + 0.000001}
                        max={max}
                        title="Mid point"
                        disabled={!areBoundariesUserDefined}
                    />
                )}
                <Input
                    type="number"
                    value={max}
                    onValueChange={handleMaxChange}
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
                divMidPoint={props.divMidPoint}
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
    console.debug(boundingRect);

    return (
        <div className="bg-slate-100 rounded flex items-center" ref={ref}>
            <div className="flex-grow cursor-pointer" onClick={handleClick}>
                <ColorScalePreview
                    {...props}
                    colorPalette={props.selectedColorPalette}
                    discrete={props.type === ColorScaleType.Discrete}
                />
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

type ColorPaletteItemProps = {
    id: string;
    colorPalette: ColorPalette;
    onClick?: () => void;
    selected?: boolean;
    discrete: boolean;
    gradientType: ColorScaleGradientType;
    min: number;
    max: number;
    divMidPoint: number;
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
                <ColorScalePreview {...props} />
            </div>
        </div>
    );
};
