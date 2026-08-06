import React from "react";

import { isEqual } from "lodash-es";

import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorPaletteType } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { ColorScalePreview } from "@lib/components/ColorScalePreview";
import { Dialog } from "@lib/components/Dialog";
import { FieldCompositions } from "@lib/components/Field/compositions";
import { NumberInput } from "@lib/components/NumberInput";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { Switch } from "@lib/components/Switch";
import { Typography } from "@lib/components/Typography";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";
import { point2Distance } from "@lib/utils/vec2";

export type ColorScaleSpecification = {
    colorScale: ColorScale;
    areBoundariesUserDefined: boolean;
};

export type ColorScaleSelectorProps = {
    workbenchSettings: WorkbenchSettings;
    colorScaleSpecification?: ColorScaleSpecification;
    onChange?: (colorScaleSpecification: ColorScaleSpecification) => void;
    disabled?: boolean;
};

export function ColorScaleSelector(props: ColorScaleSelectorProps): React.ReactNode {
    const id = React.useId();

    const [colorScaleSpecification, setColorScaleSpecification] = React.useState<ColorScaleSpecification>({
        colorScale: props.workbenchSettings.makeContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        }),
        areBoundariesUserDefined: false,
    });
    const [tempColorScaleSpecification, setTempColorScaleSpecification] =
        React.useState<ColorScaleSpecification>(colorScaleSpecification);
    const [prevColorScaleSpecification, setPrevColorScaleSpecification] = React.useState<
        ColorScaleSpecification | undefined
    >(undefined);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

    if (!isEqual(props.colorScaleSpecification, prevColorScaleSpecification)) {
        setPrevColorScaleSpecification(props.colorScaleSpecification);
        if (props.colorScaleSpecification) {
            setColorScaleSpecification(props.colorScaleSpecification);
            setTempColorScaleSpecification(props.colorScaleSpecification);
        }
    }

    function handleClick() {
        setDialogOpen(true);
    }

    function handleAcceptChanges() {
        setColorScaleSpecification(tempColorScaleSpecification);
        setDialogOpen(false);
        props.onChange?.(tempColorScaleSpecification);
    }

    function handleDiscardChanges() {
        setTempColorScaleSpecification(colorScaleSpecification);
        setDialogOpen(false);
    }

    function handleColorScaleChange(colorScaleSpecification: ColorScaleSpecification) {
        setTempColorScaleSpecification(colorScaleSpecification);
    }

    return (
        <>
            <div
                className={resolveClassNames("selectable grow cursor-pointer overflow-hidden rounded", {
                    "cursor-not-allowed opacity-50": props.disabled,
                })}
                onClick={handleClick}
            >
                <ColorScalePreview
                    colorPalette={colorScaleSpecification.colorScale.getColorPalette()}
                    gradientType={colorScaleSpecification.colorScale.getGradientType()}
                    discrete={colorScaleSpecification.colorScale.getType() === ColorScaleType.Discrete}
                    steps={colorScaleSpecification.colorScale.getNumSteps()}
                    min={colorScaleSpecification.colorScale.getMin()}
                    max={colorScaleSpecification.colorScale.getMax()}
                    divMidPoint={colorScaleSpecification.colorScale.getDivMidPoint()}
                    id={id}
                />
            </div>
            <Dialog.Popup open={dialogOpen} onOpenChange={setDialogOpen} width={"33%"} modal>
                <Dialog.Header>
                    <Dialog.Title>Color Scale Selector</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <ColorScaleSelectorDialog
                        {...props}
                        colorScaleSpecification={tempColorScaleSpecification}
                        onChange={handleColorScaleChange}
                    />
                </Dialog.Body>
                <Dialog.Actions>
                    <Button tone="neutral" variant="ghost" onClick={handleDiscardChanges}>
                        Cancel
                    </Button>
                    <Button onClick={handleAcceptChanges}>Apply</Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}

function ColorScaleSelectorDialog(props: ColorScaleSelectorProps): React.ReactNode {
    const { onChange } = props;

    const id = React.useId();

    const [colorScaleSpecification, setColorScaleSpecification] = React.useState<ColorScaleSpecification>({
        colorScale: props.workbenchSettings.makeContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        }),
        areBoundariesUserDefined: false,
    });
    const [prevColorScaleSpecification, setPrevColorScaleSpecification] = React.useState<
        ColorScaleSpecification | undefined
    >(undefined);

    const [lastSelectedSequentialColorPalette, setLastSelectedSequentialColorPalette] = React.useState<ColorPalette>(
        props.colorScaleSpecification?.colorScale.getGradientType() === ColorScaleGradientType.Sequential
            ? props.colorScaleSpecification?.colorScale.getColorPalette()
            : (props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousSequential][0] ?? ""),
    );
    const [lastSelectedDivergingColorPalette, setLastSelectedDivergingColorPalette] = React.useState<ColorPalette>(
        props.colorScaleSpecification?.colorScale.getGradientType() === ColorScaleGradientType.Diverging
            ? props.colorScaleSpecification?.colorScale.getColorPalette()
            : (props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousDiverging][0] ?? ""),
    );

    if (!isEqual(props.colorScaleSpecification, prevColorScaleSpecification)) {
        setPrevColorScaleSpecification(props.colorScaleSpecification);
        if (props.colorScaleSpecification) {
            setColorScaleSpecification(props.colorScaleSpecification);
        }
    }

    function toggleDiscrete(checked: boolean) {
        makeAndPropagateColorScale(
            colorScaleSpecification.colorScale.getColorPalette(),
            checked ? ColorScaleType.Discrete : ColorScaleType.Continuous,
            colorScaleSpecification.colorScale.getGradientType(),
            colorScaleSpecification.colorScale.getMin(),
            colorScaleSpecification.colorScale.getMax(),
            colorScaleSpecification.colorScale.getNumSteps(),
            colorScaleSpecification.colorScale.getDivMidPoint(),
            colorScaleSpecification.areBoundariesUserDefined,
        );
    }

    function handleGradientTypeChange(newGradientType: ColorScaleGradientType) {
        const lastSelectedColorPalette =
            newGradientType === ColorScaleGradientType.Sequential
                ? lastSelectedSequentialColorPalette
                : lastSelectedDivergingColorPalette;
        makeAndPropagateColorScale(
            lastSelectedColorPalette,
            colorScaleSpecification.colorScale.getType(),
            newGradientType,
            colorScaleSpecification.colorScale.getMin(),
            colorScaleSpecification.colorScale.getMax(),
            colorScaleSpecification.colorScale.getNumSteps(),
            colorScaleSpecification.colorScale.getDivMidPoint(),
            colorScaleSpecification.areBoundariesUserDefined,
        );
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        if (colorScaleSpecification.colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
            setLastSelectedSequentialColorPalette(colorPalette);
        } else {
            setLastSelectedDivergingColorPalette(colorPalette);
        }
        makeAndPropagateColorScale(
            colorPalette,
            colorScaleSpecification.colorScale.getType(),
            colorScaleSpecification.colorScale.getGradientType(),
            colorScaleSpecification.colorScale.getMin(),
            colorScaleSpecification.colorScale.getMax(),
            colorScaleSpecification.colorScale.getNumSteps(),
            colorScaleSpecification.colorScale.getDivMidPoint(),
            colorScaleSpecification.areBoundariesUserDefined,
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
            areBoundariesUserDefined: boolean,
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
            const colorScaleSpecification = { colorScale, areBoundariesUserDefined };
            setColorScaleSpecification(colorScaleSpecification);
            if (onChange) {
                onChange(colorScaleSpecification);
            }
        },
        [onChange],
    );

    const handleNumStepsChange = React.useCallback(
        function handleNumStepsChange(value: number | null) {
            const numSteps = value ?? 0;

            makeAndPropagateColorScale(
                colorScaleSpecification.colorScale.getColorPalette(),
                colorScaleSpecification.colorScale.getType(),
                colorScaleSpecification.colorScale.getGradientType(),
                colorScaleSpecification.colorScale.getMin(),
                colorScaleSpecification.colorScale.getMax(),
                numSteps,
                colorScaleSpecification.colorScale.getDivMidPoint(),
                colorScaleSpecification.areBoundariesUserDefined,
            );
        },
        [colorScaleSpecification, makeAndPropagateColorScale],
    );

    const handleMinMaxDivMidPointChange = React.useCallback(
        function handleMinMaxDivMidPointChange(min: number, max: number, divMidPoint?: number) {
            makeAndPropagateColorScale(
                colorScaleSpecification.colorScale.getColorPalette(),
                colorScaleSpecification.colorScale.getType(),
                colorScaleSpecification.colorScale.getGradientType(),
                min,
                max,
                colorScaleSpecification.colorScale.getNumSteps(),
                divMidPoint ?? colorScaleSpecification.colorScale.getDivMidPoint(),
                colorScaleSpecification.areBoundariesUserDefined,
            );
        },
        [colorScaleSpecification, makeAndPropagateColorScale],
    );

    const handleAreBoundariesUserDefinedChange = React.useCallback(
        function handleAreBoundariesUserDefinedChange(areBoundariesUserDefined: boolean) {
            makeAndPropagateColorScale(
                colorScaleSpecification.colorScale.getColorPalette(),
                colorScaleSpecification.colorScale.getType(),
                colorScaleSpecification.colorScale.getGradientType(),
                colorScaleSpecification.colorScale.getMin(),
                colorScaleSpecification.colorScale.getMax(),
                colorScaleSpecification.colorScale.getNumSteps(),
                colorScaleSpecification.colorScale.getDivMidPoint(),
                areBoundariesUserDefined,
            );
        },
        [colorScaleSpecification, makeAndPropagateColorScale],
    );

    return (
        <div className="gap-sm grid grid-cols-[auto_minmax(0,1fr)] flex-col items-center">
            <FieldCompositions.Default label="Gradient type" gridLayout>
                <RadioCompositions.GroupWithLabels
                    value={colorScaleSpecification.colorScale.getGradientType()}
                    onValueChange={handleGradientTypeChange}
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
                    layout="horizontal"
                    size="small"
                />
            </FieldCompositions.Default>
            <FieldCompositions.Default label="Discrete?" gridLayout>
                <div className="gap-x-2xs flex items-center">
                    <Switch
                        checked={colorScaleSpecification.colorScale.getType() === ColorScaleType.Discrete}
                        onCheckedChange={toggleDiscrete}
                    />
                    <NumberInput
                        value={colorScaleSpecification.colorScale.getNumSteps()}
                        disabled={colorScaleSpecification.colorScale.getType() !== ColorScaleType.Discrete}
                        min={2}
                        scrubAdornment="steps"
                        scrubAreaPosition="end"
                        onValueChange={handleNumStepsChange}
                        size="small"
                    />
                </div>
            </FieldCompositions.Default>
            <FieldCompositions.Default label="Color Palette" gridLayout>
                <ColorPaletteSelector
                    selectedColorPaletteId={colorScaleSpecification.colorScale.getColorPalette().getId()}
                    colorPalettes={
                        props.workbenchSettings.getColorPalettes()[
                            getPaletteTypeFromColorScale(colorScaleSpecification.colorScale)
                        ]
                    }
                    onValueChange={handleColorPaletteChange}
                    type={convertColorScaleToColorPaletteSelectorType(colorScaleSpecification.colorScale)}
                    steps={colorScaleSpecification.colorScale.getNumSteps()}
                />
            </FieldCompositions.Default>
            <FieldCompositions.Default label="Customize range" gridLayout>
                <Switch
                    checked={colorScaleSpecification.areBoundariesUserDefined}
                    onCheckedChange={handleAreBoundariesUserDefinedChange}
                />
            </FieldCompositions.Default>
            <div className="col-start-2">
                <ColorScaleSetter
                    id={id}
                    selectedColorPalette={colorScaleSpecification.colorScale.getColorPalette()}
                    colorPalettes={
                        props.workbenchSettings.getColorPalettes()[
                            getPaletteTypeFromColorScale(colorScaleSpecification.colorScale)
                        ]
                    }
                    type={colorScaleSpecification.colorScale.getType()}
                    gradientType={colorScaleSpecification.colorScale.getGradientType()}
                    min={colorScaleSpecification.colorScale.getMin()}
                    max={colorScaleSpecification.colorScale.getMax()}
                    divMidPoint={colorScaleSpecification.colorScale.getDivMidPoint()}
                    steps={colorScaleSpecification.colorScale.getNumSteps()}
                    areBoundariesUserDefined={colorScaleSpecification.areBoundariesUserDefined}
                    onChangeColorPalette={handleColorPaletteChange}
                    onChangeMinMaxDivMidPoint={handleMinMaxDivMidPointChange}
                    onChangeAreBoundariesUserDefined={handleAreBoundariesUserDefinedChange}
                />
            </div>
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
        divMidPoint?: number,
    ) {
        setMin(min);
        setMax(max);
        if (divMidPoint !== undefined) {
            setDivMidPoint(divMidPoint);
        }
    }, []);

    return (
        <div
            className={resolveClassNames({
                "cursor-not-allowed opacity-50": !props.areBoundariesUserDefined,
            })}
        >
            <div className={resolveClassNames("gap-y-sm flex flex-col")}>
                <ColorScalePreview
                    {...props}
                    colorPalette={props.selectedColorPalette}
                    discrete={props.type === ColorScaleType.Discrete}
                    min={min}
                    max={max}
                    divMidPoint={divMidPoint}
                />
            </div>
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
        props.areBoundariesUserDefined,
    );
    const [prevAreBoundariesUserDefined, setPrevAreBoundariesUserDefined] = React.useState<boolean>(
        props.areBoundariesUserDefined,
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
            let newDivMidPoint = 0;

            function handlePointerDown(e: PointerEvent) {
                if (!currentDivMidPointRef) {
                    return;
                }
                currentDivMidPointRef.setPointerCapture(e.pointerId);
                pointerDownPosition = { x: e.clientX, y: e.clientY };
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

                const newRelativeDivMidPoint = Math.min(
                    Math.max((e.clientX - containerRect.left) / containerRect.width, 0),
                    1,
                );

                const step = computeNiceStep(min, max);
                newDivMidPoint = Math.min(
                    Math.max(snapToStep(min + newRelativeDivMidPoint * (max - min), min, step), min),
                    max,
                );

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
        [onChange, onChangePreview, min, max],
    );

    function handleMinChange(value: number | null) {
        let newMin = value ?? 0;
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

    function handleMaxChange(value: number | null) {
        let newMax = value ?? 0;
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

    function handleDivMidPointChange(value: number | null) {
        let newDivMidPoint = value ?? min;
        if (newDivMidPoint <= min) {
            newDivMidPoint = min;
        }
        if (newDivMidPoint >= max) {
            newDivMidPoint = max;
        }
        setDivMidPoint(newDivMidPoint);
        props.onChange(min, max, newDivMidPoint);
    }

    return (
        <>
            {isDragging &&
                createPortal(<div className="transparent z-overlay absolute inset-0 h-full w-full cursor-ew-resize" />)}
            <div className="relative h-3 w-full" ref={containerDivRef}>
                <div
                    title="Drag to adjust mid point"
                    className={resolveClassNames(
                        "absolute -top-6 flex h-7 -translate-x-1/2 transform cursor-ew-resize flex-col",
                        {
                            "z-overlay": isDragging,
                            hidden:
                                props.gradientType === ColorScaleGradientType.Sequential || !areBoundariesUserDefined,
                        },
                    )}
                    style={{ left: `${(Math.abs(divMidPoint - min) / Math.abs(max - min)) * 100}%` }}
                    ref={divMidPointRef}
                >
                    <div className="bg-neutral-strong h-1 w-full" />
                    <div className="border-neutral-strong w-1 grow border-r border-l" />
                    <div className="bg-neutral-strong h-1 w-full" />
                </div>
            </div>
            <div className="gap-x-2xs flex justify-between">
                <NumberInput
                    value={min}
                    onValueChange={handleMinChange}
                    title="Min"
                    max={max - 0.000001}
                    disabled={!areBoundariesUserDefined}
                    layoutClassName="grow"
                />
                {props.gradientType !== ColorScaleGradientType.Sequential && (
                    <NumberInput
                        value={divMidPoint}
                        onValueChange={handleDivMidPointChange}
                        min={min + 0.000001}
                        max={max}
                        title="Mid point"
                        disabled={!areBoundariesUserDefined}
                        layoutClassName="grow"
                    />
                )}
                <NumberInput
                    value={max}
                    onValueChange={handleMaxChange}
                    title="Max"
                    min={min}
                    disabled={!areBoundariesUserDefined}
                    layoutClassName="grow"
                />
            </div>
            <div className="gap-x-2xs flex justify-evenly">
                <Typography size="sm" tone="neutral" variant="subtle" layoutClassName="grow text-center">
                    Min
                </Typography>
                {props.gradientType !== ColorScaleGradientType.Sequential && (
                    <Typography size="sm" tone="neutral" variant="subtle" layoutClassName="grow text-center">
                        Mid point
                    </Typography>
                )}
                <Typography size="sm" tone="neutral" variant="subtle" layoutClassName="grow text-center">
                    Max
                </Typography>
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

function convertColorScaleToColorPaletteSelectorType(colorScale: ColorScale): ColorPaletteSelectorType {
    if (colorScale.getType() === ColorScaleType.Discrete) {
        return ColorPaletteSelectorType.Discrete;
    }
    return ColorPaletteSelectorType.Continuous;
}

function computeNiceStep(min: number, max: number): number {
    const range = Math.abs(max - min);
    if (range === 0) return 1;
    const rawStep = range / 100;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    if (normalized < 1.5) return magnitude;
    if (normalized < 3.5) return 2 * magnitude;
    if (normalized < 7.5) return 5 * magnitude;
    return 10 * magnitude;
}

function snapToStep(value: number, min: number, step: number): number {
    const snapped = Math.round((value - min) / step) * step + min;
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    return parseFloat(snapped.toFixed(decimals));
}
