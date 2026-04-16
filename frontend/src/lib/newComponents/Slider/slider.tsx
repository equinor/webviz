import React from "react";

import type { BaseUIEvent } from "@base-ui/react";
import { Tooltip } from "@base-ui/react";
import type { SliderRootProps as SliderRootBaseProps, SliderRootState } from "@base-ui/react/slider";
import { Slider as SliderBase } from "@base-ui/react/slider";
import { Lock, LockOpen } from "@mui/icons-material";
import { clamp, clone, omit } from "lodash";
import { Key } from "ts-key-enum";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Button } from "../Button";

export type SliderChangeEventDetails =
    | SliderBase.Root.ChangeEventDetails
    | { reason: "clamp-value" }
    | { reason: "lock-min" }
    | { reason: "lock-max" };
// If we want to follow base-ui even more directly, use these
// | BaseUIChangeEventDetails<"clamp-min", SliderRootChangeEventCustomProperties>
// | BaseUIChangeEventDetails<"clamp-max", SliderRootChangeEventCustomProperties>;

export type SliderProps = Omit<SliderRootBaseProps, "className" | "orientation"> & {
    /**
     * Shows a button and gutter tracks for locking value to min and/or max values
     *
     *
     * - `"both"` or `true` - show locks for both min and max
     * - `"min"` - show lock for min value only
     * - `"max"` - show lock for max value only
     * - `"none"` - don't show any locks
     *
     * @default "none"
     */
    enableRangeLocks?: "both" | "min" | "max" | "none" | true;

    /**
     * Displays a label over the thumbs showing their current value
     * - `"auto"` - show the label on hover or when the thumb is focused
     * - `"always"` - always show the label
     * - `"off"` - disable the labels entirely
     *
     * @default "auto"`
     */
    valueLabelDisplay?: "auto" | "always" | "off";

    /**
     * Aria label for the thumbs. Can be a single string, which will be used for both thumbs, or an array of strings to provide separate labels for each thumb (in the case of a range slider).
     */
    thumbAriaLabel?: string | string[];

    /**
     * Formats the value displayed by the thumbs value tooltip.
     * @param value The current value of the thumb.
     * @param thumbIndex The index of the thumb (0 for the first thumb, 1 for the second thumb in a range slider).
     * @returns The content to display in the value label tooltip. Can be a string or any React node.
     */
    valueLabelFormat?: (value: number, thumbIndex: number) => React.ReactNode;

    /**
     * See `Slider.Root.onValueChange`
     *
     * Event is extended to include lock-toggles as an event-reason
     */
    onValueChange?: (value: number | readonly number[], eventDetails: SliderChangeEventDetails) => void;
    /**
     * See `Slider.Root.onValueCommit`
     *
     * Event is extended to include lock-toggles as an event-reason
     */
    onValueCommitted?: (value: number | readonly number[], eventDetails: SliderChangeEventDetails) => void;
};
const DEFAULT_PROPS = {
    min: 0,
    max: 100,
    enableRangeLocks: "none" as NonNullable<SliderProps["enableRangeLocks"]>,
    valueLabelDisplay: "auto" as NonNullable<SliderProps["valueLabelDisplay"]>,
} satisfies Partial<SliderProps>;

type DefaultedSliderProps = typeof DEFAULT_PROPS & SliderProps;

function isDualSliderValue(value: number | readonly number[]): value is readonly number[] {
    return Array.isArray(value);
}

function SliderComponent(props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const defaultedProps: DefaultedSliderProps = { ...DEFAULT_PROPS, ...props };
    const { onValueChange, onValueCommitted } = props;

    const baseProps = omit(defaultedProps, [
        "enableRangeLocks",
        "valueLabelDisplay",
        "thumbAriaLabel",
        "valueLabelFormat",
        "onValueChange",
        "onValueCommitted",
    ]);

    if (defaultedProps.min > defaultedProps.max) throw new Error("Slider min cannot be greater than max");

    const inputRefs = [React.useRef<HTMLInputElement | null>(null), React.useRef<HTMLInputElement | null>(null)];
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const [prevMin, setPrevMin] = React.useState(defaultedProps.min);
    const [prevMax, setPrevMax] = React.useState(defaultedProps.max);
    const [minLocked, setMinLocked] = React.useState(false);
    const [maxLocked, setMaxLocked] = React.useState(false);

    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const [internalValue, setInternalValue] = React.useState(defaultedProps.value ?? defaultedProps.defaultValue ?? 0);

    const wrapperSize = useElementSize(wrapperRef);

    const isDualSlider = Array.isArray(internalValue);
    const getThumbAriaLabel = defaultedProps.thumbAriaLabel ? getThumbAriaLabelFunc : undefined;

    if (props.value !== undefined && props.value !== internalValue) {
        setInternalValue(props.value);
    }

    function getThumbAriaLabelFunc(index: number) {
        if (!defaultedProps.thumbAriaLabel) return "";
        if (!Array.isArray(defaultedProps.thumbAriaLabel)) return defaultedProps.thumbAriaLabel;
        return defaultedProps.thumbAriaLabel[index];
    }

    const updateValue = React.useCallback(
        function updateValue(
            newValue: number | readonly number[],
            eventDetails: SliderChangeEventDetails,
            commit?: boolean,
        ) {
            setInternalValue(newValue);
            onValueChange?.(newValue, eventDetails);

            if (commit) onValueCommitted?.(newValue, eventDetails);
        },
        [onValueChange, onValueCommitted],
    );

    function onValueChangeInternal(
        newValue: number | readonly number[],
        eventDetails: SliderBase.Root.ChangeEventDetails,
    ) {
        const activeValue = isDualSliderValue(newValue) ? newValue[eventDetails.activeThumbIndex] : newValue;

        if (isDualSliderValue(newValue)) {
            if (eventDetails.activeThumbIndex === 0 && activeValue > defaultedProps.min) {
                toggleMinLock(false);
            } else if (eventDetails.activeThumbIndex === 1 && activeValue < defaultedProps.max) {
                toggleMaxLock(false);
            }
        } else {
            if (activeValue > defaultedProps.min) {
                toggleMinLock(false);
            }
            if (activeValue < defaultedProps.max) {
                toggleMaxLock(false);
            }
        }

        updateValue(newValue, eventDetails);
    }

    function toggleMinLock(isLocked: boolean) {
        if (!showMinLock) return;

        if (!isLocked) {
            setMinLocked(false);
        } else if (isDualSliderValue(internalValue)) {
            setMinLocked(true);

            updateValue([defaultedProps.min, internalValue[1]], { reason: "lock-min" }, true);
        } else {
            setMinLocked(true);
            setMaxLocked(false);

            updateValue(defaultedProps.min, { reason: "lock-min" }, true);
        }
    }

    function toggleMaxLock(isLocked: boolean) {
        if (!showMaxLock) return;

        if (!isLocked) {
            setMaxLocked(false);
        } else if (isDualSliderValue(internalValue)) {
            setMaxLocked(true);

            updateValue([internalValue[0], defaultedProps.max], { reason: "lock-max" }, true);
        } else {
            setMaxLocked(true);
            setMinLocked(false);

            updateValue(defaultedProps.max, { reason: "lock-max" }, true);
        }
    }

    const showMinLock = [true, "both", "min"].includes(defaultedProps.enableRangeLocks);
    const showMaxLock = [true, "both", "max"].includes(defaultedProps.enableRangeLocks);

    const showThumbValueLabels =
        defaultedProps.valueLabelDisplay === "always" ||
        (defaultedProps.valueLabelDisplay === "auto" && (isHovered || isFocused));

    let needToClampValue = false;
    const clampedValue = isDualSlider ? clone(internalValue as number[]) : ([internalValue, internalValue] as number[]);

    if (prevMin !== defaultedProps.min) {
        setPrevMin(defaultedProps.min);

        if (clampedValue[0] < defaultedProps.min || minLocked) {
            clampedValue[0] = defaultedProps.min;
            needToClampValue = true;
        }
        if (clampedValue[1] < defaultedProps.min) {
            clampedValue[1] = defaultedProps.min;
            needToClampValue = true;
        }
    }

    if (prevMax !== defaultedProps.max) {
        setPrevMax(defaultedProps.max);

        if (clampedValue[1] > defaultedProps.max || maxLocked) {
            clampedValue[1] = defaultedProps.max;
            needToClampValue = true;
        }
        if (clampedValue[0] > defaultedProps.max) {
            clampedValue[0] = defaultedProps.max;
            needToClampValue = true;
        }
    }

    const [valueToClamp, setValueToClamp] = React.useState<null | number | number[]>(null);

    if (needToClampValue) {
        setValueToClamp(isDualSlider ? clampedValue : clampedValue[0]);
    }

    React.useEffect(() => {
        if (valueToClamp !== null) {
            updateValue(valueToClamp, { reason: "clamp-value" }, true);
            setValueToClamp(null);
        }
    }, [updateValue, valueToClamp]);

    return (
        <SliderBase.Root
            {...baseProps}
            className="gap-horizontal-2xs flex items-center"
            ref={wrapperRef}
            value={internalValue}
            onValueChange={onValueChangeInternal}
            style={{
                // @ts-expect-error -- css typing doesn't accept variables
                "--lock-gutter-size": `${clamp(wrapperSize.width * 0.1, 20, 40)}px`,

                // Couldn't find any EDS variable for these sizes; these pixels sizes are used in the design doc
                "--thumb-size": "8px",
                "--mark-size": "6px",

                // Needed to avoid some jumpiness in some cases
                "--mark-thumb-diff": "calc(var(--thumb-size) - var(--mark-size))",
            }}
            render={(rootProps, state) => (
                <div {...rootProps}>
                    {showMinLock && <LimitLockSwitch isLocked={minLocked} onSetLocked={toggleMinLock} />}

                    <SliderBase.Control
                        ref={ref}
                        className={resolveClassNames(
                            "group py-horizontal-xs flex w-full touch-none items-center select-none",
                            {
                                "pl-(--lock-gutter-size)": showMinLock,
                                "pr-(--lock-gutter-size)": showMaxLock,
                            },
                        )}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    >
                        {showMinLock && (
                            <SliderLockGutter
                                locked={minLocked}
                                placement="start"
                                inverse={!isDualSlider}
                                sliderState={state}
                                onSetLocked={toggleMinLock}
                            />
                        )}

                        <SliderBase.Track className="group-hover:bg-neutral-hover data-dragging:bg-neutral-hover bg-canvas shadow-elevation-floating h-1 w-full rounded-lg">
                            {/* Only show start dot for dual sliders */}
                            <Dot placement="start" />

                            <SliderBase.Indicator className="bg-accent-strong rounded-lg" />

                            <Thumb
                                index={0}
                                showValue={showThumbValueLabels}
                                sliderValue={internalValue}
                                inputRefs={inputRefs}
                                min={defaultedProps.min}
                                max={defaultedProps.max}
                                lockedToMin={minLocked}
                                lockedToMax={!isDualSlider && maxLocked}
                                valueLabelFormat={defaultedProps.valueLabelFormat}
                                getAriaLabel={getThumbAriaLabel}
                                onSetMinLocked={toggleMinLock}
                                onSetMaxLocked={toggleMaxLock}
                            />

                            <Thumb
                                index={1}
                                showValue={showThumbValueLabels}
                                sliderValue={internalValue}
                                inputRefs={inputRefs}
                                min={defaultedProps.min}
                                max={defaultedProps.max}
                                lockedToMin={false}
                                lockedToMax={maxLocked}
                                valueLabelFormat={defaultedProps.valueLabelFormat}
                                getAriaLabel={getThumbAriaLabel}
                                onSetMinLocked={toggleMinLock}
                                onSetMaxLocked={toggleMaxLock}
                            />

                            <Dot placement="end" />
                        </SliderBase.Track>

                        {showMaxLock && (
                            <SliderLockGutter
                                inverse={false}
                                locked={maxLocked}
                                placement="end"
                                sliderState={state}
                                onSetLocked={toggleMaxLock}
                            />
                        )}
                    </SliderBase.Control>
                    {showMaxLock && <LimitLockSwitch isLocked={maxLocked} onSetLocked={toggleMaxLock} />}
                </div>
            )}
        />
    );
}

function Thumb(props: {
    index: number;
    showValue: boolean;
    sliderValue: number | readonly number[];
    inputRefs: React.Ref<HTMLInputElement>[];
    min: number;
    max: number;
    lockedToMin: boolean;
    lockedToMax: boolean;

    valueLabelFormat: undefined | ((value: number, thumbIndex: number) => React.ReactNode);
    getAriaLabel?: (index: number) => string;

    onSetMinLocked: (newValue: boolean) => void;
    onSetMaxLocked: (newValue: boolean) => void;
}) {
    if (props.lockedToMin && props.lockedToMax) {
        throw new Error("Thumb cannot be locked to both min and max");
    }

    const thumbHidden = !isDualSliderValue(props.sliderValue) && props.index === 1;
    const thumbValue = isDualSliderValue(props.sliderValue) ? props.sliderValue[props.index] : props.sliderValue;

    let positionStyle: React.CSSProperties | undefined = undefined;

    if (props.lockedToMin) {
        positionStyle = { insetInlineStart: "calc(-1 * var(--lock-gutter-size) + var(--thumb-size)/2)" };
    } else if (props.lockedToMax) {
        positionStyle = { insetInlineStart: "calc(100% + var(--lock-gutter-size) - var(--thumb-size)/2)" };
    }

    function onThumbInputKeyDown(event: BaseUIEvent<React.KeyboardEvent<HTMLDivElement>>) {
        if ([Key.ArrowDown, Key.ArrowLeft].includes(event.key as Key)) {
            if (thumbValue === props.min) {
                props.onSetMinLocked(true);
            }

            if (props.lockedToMax) {
                props.onSetMaxLocked(false);
                event.preventDefault();
                event.stopPropagation();
            }
        }

        if ([Key.ArrowUp, Key.ArrowRight].includes(event.key as Key)) {
            if (props.lockedToMin) {
                props.onSetMinLocked(false);
                event.preventDefault();
                event.stopPropagation();
            }
            if (thumbValue === props.max) {
                props.onSetMaxLocked(true);
            }
        }
    }

    return (
        <Tooltip.Root open={props.showValue && !thumbHidden}>
            <Tooltip.Trigger
                render={
                    <SliderBase.Thumb
                        // Hiding via style to keep refs stable
                        hidden={thumbHidden}
                        disabled={thumbHidden}
                        className="border-accent-strong bg-surface hover:outline-focus focus-within:outline-focus z-2 box-content size-(--thumb-size) rounded-full border-2 outline-2 outline-offset-2 outline-transparent"
                        index={props.index}
                        inputRef={props.inputRefs[1]}
                        getAriaLabel={props.getAriaLabel}
                        style={positionStyle}
                        onKeyDownCapture={onThumbInputKeyDown}
                    />
                }
            />
            <Tooltip.Portal>
                <Tooltip.Positioner sideOffset={5}>
                    <Tooltip.Popup className="bg-accent-strong text-info-strong-on-emphasis px-horizontal-2xs py-vertical-4xs text-body-sm pointer-events-none rounded">
                        {props.valueLabelFormat ? props.valueLabelFormat(thumbValue, props.index) : thumbValue}
                    </Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

function LimitLockSwitch(props: { isLocked: boolean; onSetLocked: (newValue: boolean) => void }) {
    const ButtonIcon = props.isLocked ? Lock : LockOpen;

    return (
        <Button
            variant="text"
            tone="accent"
            size="small"
            pressed={props.isLocked}
            onClick={() => props.onSetLocked(!props.isLocked)}
        >
            <ButtonIcon className="text-accent-subtle text" fontSize="inherit" />
        </Button>
    );
}
function SliderLockGutter(props: {
    placement: "start" | "end";
    inverse: boolean;
    locked: boolean;
    sliderState: SliderRootState;
    onSetLocked: (locked: boolean) => void;
}) {
    const isColored = props.inverse !== props.locked;

    return (
        <div
            className={resolveClassNames("relative flex w-(--lock-gutter-size) items-center", {
                "-ml-(--lock-gutter-size)": props.placement === "start",
                "-mr-(--lock-gutter-size)": props.placement === "end",
                "flex-row-reverse": props.placement === "end",
            })}
        >
            <div
                className={resolveClassNames("absolute -inset-y-(--eds-spacing-horizontal-xs) w-(--thumb-size)", {
                    "left-0": props.placement === "start",
                    "right-0": props.placement === "end",
                })}
                onPointerOver={() => props.sliderState.dragging && props.onSetLocked(true)}
                // Using pointer-down to avoid the slider jumping to end pos, *then* locking
                onPointerDownCapture={() => props.onSetLocked(true)}
            />
            <div className="border-neutral bg-surface m-(--mark-thumb-diff) box-content size-(--mark-size) shrink-0 rounded-full border" />

            <div
                // When allowing min/max locks, we're mimicking the slider's gutter, but using a border instead to show a dashed line. These colors are not normally exposed for borders, so we have to manually refer to them here
                className={resolveClassNames("h-0 w-full border-2 border-dotted", {
                    "border-(--eds-color-bg-neutral-fill-muted-hover)": !isColored && props.sliderState.dragging,
                    "border-(--eds-color-bg-neutral-canvas) group-hover:border-(--eds-color-bg-neutral-fill-muted-hover)":
                        !isColored,
                    "border-(--eds-color-bg-accent-fill-emphasis-default)": isColored,
                })}
            />
        </div>
    );
}

function Dot(props: { placement: "start" | "end" }) {
    const className =
        "border border-neutral box-content size-(--mark-size) rounded-full absolute bg-surface -top-0.5 z-1";

    const style: React.HTMLAttributes<HTMLDivElement>["style"] = {};

    if (props.placement === "start") style.left = "-4px";
    if (props.placement === "end") style.right = "-4px";

    return <div className={className} style={style} />;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(SliderComponent);
