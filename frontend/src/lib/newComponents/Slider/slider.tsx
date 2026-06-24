import React from "react";

import type { BaseUIEvent } from "@base-ui/react";
import { Tooltip } from "@base-ui/react";
import type { SliderRootProps as SliderRootBaseProps, SliderRootState } from "@base-ui/react/slider";
import { Slider as SliderBase } from "@base-ui/react/slider";
import { Lock, LockOpen } from "@mui/icons-material";
import { chain, clamp, clone, defaults, isEqual, minBy } from "lodash";
import { Key } from "ts-key-enum";

import { useElementSize } from "@lib/hooks/useElementSize";
import { useOptInControlledValue } from "@lib/hooks/useOptInControlledValue";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import {
    getNextTextSize,
    getTextSizeForSelectableSize,
    SELECTABLE_SIZES_CLASSNAMES,
    type SelectableSize,
} from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";
import { Typography } from "../Typography";

type SnapTarget = "nearest" | "next" | "prev";

const TRACK_CLASS_NAME = "not-data-disabled:group-hover:bg-neutral-hover data-dragging:bg-neutral-hover bg-canvas";
const INDICATOR_CLASS_NAME = "bg-accent-strong data-disabled:bg-disabled";
const TRACK_HEIGHT_CLASS_NAMES = {
    // Same size for small and default, as h-0.5 seems way to small
    small: "h-1",
    default: "h-1",
    large: "h-1.5",
} as const;

export type SliderChangeEventDetails =
    | SliderBase.Root.ChangeEventDetails
    | { reason: "clamp-value" }
    | { reason: "marker-clicked" }
    | { reason: "range-locked" };
// If we want to follow base-ui even more directly, use these
// | BaseUIChangeEventDetails<"clamp-min", SliderRootChangeEventCustomProperties>
// | BaseUIChangeEventDetails<"clamp-max", SliderRootChangeEventCustomProperties>;

export type SliderProps<TValue extends number | readonly number[] = number | readonly number[]> = ComponentWrapperProps<
    // ! Orientation would require a lot of extra checks, and we currently
    // ! are not using vertical sliders anywhere, so we disable it for now
    Omit<SliderRootBaseProps<TValue>, "orientation">
> & {
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
    showRangeLocks?: "both" | "min" | "max" | "none" | true;
    /**
     * Controls whether the min value is locked
     */
    minLocked?: boolean;

    /**
     * Controls whether the max value is locked
     */
    maxLocked?: boolean;

    /**
     * Default min lock state when not controlled
     * @default false
     */
    defaultMinLocked?: boolean;

    /**
     * Default max lock state when not controlled
     * @default false
     */
    defaultMaxLocked?: boolean;

    /**
     * Callback when min lock state changes
     */
    onMinLockedChange?: (locked: boolean) => void;

    /**
     * Callback when max lock state changes
     */
    onMaxLockedChange?: (locked: boolean) => void;

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
     * Inverts the track/indicator colors
     */
    inverted?: boolean;

    /** Component size. The size will affect the slider controller area; this means the slider height will generally match other library components, but if also showing markers, the total height will be bigger than other components */
    size?: SelectableSize;

    /** Hides the slider indicator */
    noIndicator?: boolean;

    /** Additional slider values to show a mark at. The slider will *always* show markers at the ends */
    markers?: number[];

    /** Snaps the allowed slider values to the values defined in markers (including min/max) */
    snapToMarkers?: boolean;

    /**
     * Display the value of each marker below them.
     * A function can be provided for further customization. Returning an empty node (null, false, etc) or an empty string will fully remove the label */
    markerLabels?: boolean | ((markerValue: number, index: number) => React.ReactNode);

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
    onValueChange?: (
        value: TValue extends number ? number : readonly number[],
        eventDetails: SliderChangeEventDetails,
    ) => void;

    /**
     * See `Slider.Root.onValueCommit`
     *
     * Event is extended to include lock-toggles as an event-reason
     */
    onValueCommitted?: (
        value: TValue extends number ? number : readonly number[],
        eventDetails: SliderChangeEventDetails,
    ) => void;
};
const DEFAULT_PROPS = {
    min: 0,
    max: 100,
    defaultValue: 0,
    showRangeLocks: "none" as NonNullable<SliderProps["showRangeLocks"]>,
    valueLabelDisplay: "auto" as NonNullable<SliderProps["valueLabelDisplay"]>,
    markers: [] as number[],
    snapToMarkers: false as boolean,
    thumbCollisionBehavior: "push" as NonNullable<SliderProps["thumbCollisionBehavior"]>,
} satisfies Partial<SliderProps>;

type InternalOnChangeCallback = (value: number | number[], eventDetails: SliderChangeEventDetails) => void;

function SliderComponent(
    // ! Note: To simplify internal logic, we always type the slider props as number | number[] using some direct
    // ! casting. Externally, slider users will see the change event's with the same type as the provided values
    props: SliderProps<number | number[]>,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);

    const onValueChange = props.onValueChange as InternalOnChangeCallback;
    const onValueCommitted = props.onValueCommitted as InternalOnChangeCallback;

    const baseProps = resolveWrapperProps(
        defaultedProps,
        "showRangeLocks",
        "valueLabelDisplay",
        "thumbAriaLabel",
        "valueLabelFormat",
        "inverted",
        "noIndicator",
        "size",
        "markers",
        "markerLabels",
        "snapToMarkers",
        "minLocked",
        "maxLocked",
        "defaultMinLocked",
        "defaultMaxLocked",
        "onMinLockedChange",
        "onMaxLockedChange",
        "onValueChange",
        "onValueCommitted",
    );

    const componentSize = useComponentSize(props);

    if (defaultedProps.min > defaultedProps.max) throw new Error("Slider min cannot be greater than max");

    const inputRefs = [React.useRef<HTMLInputElement | null>(null), React.useRef<HTMLInputElement | null>(null)];

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const minGutterDotRef = React.useRef<HTMLDivElement | null>(null);
    const maxGutterDotRef = React.useRef<HTMLDivElement | null>(null);

    const [internalValue, setInternalValue] = React.useState(defaultedProps.value ?? defaultedProps.defaultValue);
    const [prevMin, setPrevMin] = React.useState(defaultedProps.min);
    const [prevMax, setPrevMax] = React.useState(defaultedProps.max);

    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    const showMinLock = [true, "both", "min"].includes(defaultedProps.showRangeLocks);
    const showMaxLock = [true, "both", "max"].includes(defaultedProps.showRangeLocks);

    const allMarkers = React.useMemo(() => {
        return chain([defaultedProps.min, ...defaultedProps.markers, defaultedProps.max])
            .sortBy()
            .sortedUniq()
            .value();
    }, [defaultedProps.markers, defaultedProps.max, defaultedProps.min]);

    const isDualSlider = Array.isArray(internalValue);

    const { minLocked, maxLocked, setMinLocked, setMaxLocked } = useLockState({
        isDualSlider,
        showMinLock,
        showMaxLock,
        minLocked: props.minLocked,
        maxLocked: props.maxLocked,
        defaultMinLocked: props.defaultMinLocked,
        defaultMaxLocked: props.defaultMaxLocked,
        onMinLockedChange: props.onMinLockedChange,
        onMaxLockedChange: props.onMaxLockedChange,
    });

    const wrapperSize = useElementSize(wrapperRef);

    if (props.value !== undefined && props.value !== internalValue) {
        setInternalValue(props.value);
    }

    const getThumbAriaLabelFunc = React.useCallback(
        function getThumbAriaLabelFunc(index: number) {
            if (!defaultedProps.thumbAriaLabel) return "";
            if (!Array.isArray(defaultedProps.thumbAriaLabel)) return defaultedProps.thumbAriaLabel;
            return defaultedProps.thumbAriaLabel[index];
        },
        [defaultedProps.thumbAriaLabel],
    );

    // To preserve built-in base-ui defaults, we only pass a function to the thumbs if any thumb-labels were configured
    const getThumbAriaLabel = defaultedProps.thumbAriaLabel ? getThumbAriaLabelFunc : undefined;

    const updateValue = React.useCallback(
        function updateValue(newValue: number | number[], eventDetails: SliderChangeEventDetails, commit?: boolean) {
            setInternalValue(newValue);

            onValueChange?.(newValue, eventDetails);
            if (commit) onValueCommitted?.(newValue, eventDetails);
        },
        [onValueChange, onValueCommitted],
    );

    useLockedValueUpdate({
        value: internalValue,
        min: defaultedProps.min,
        max: defaultedProps.max,
        minLocked,
        maxLocked,
        onValueChange: updateValue,
    });

    useUnlockOnValueChange({
        value: internalValue,
        min: defaultedProps.min,
        max: defaultedProps.max,
        minLocked,
        maxLocked,
        setMinLocked,
        setMaxLocked,
    });

    function onValueChangeInternal(newValue: number | number[], eventDetails: SliderBase.Root.ChangeEventDetails) {
        const activeValue = isDualSliderValue(newValue) ? newValue[eventDetails.activeThumbIndex] : newValue;
        const prevActiveValue = isDualSliderValue(internalValue)
            ? internalValue[eventDetails.activeThumbIndex]
            : internalValue;

        if (isDualSliderValue(newValue)) {
            if (eventDetails.activeThumbIndex === 0 && activeValue > defaultedProps.min) {
                setMinLocked(false);
            } else if (eventDetails.activeThumbIndex === 1 && activeValue < defaultedProps.max) {
                setMaxLocked(false);
            }
        } else {
            if (activeValue > defaultedProps.min) {
                setMinLocked(false);
            }
            if (activeValue < defaultedProps.max) {
                setMaxLocked(false);
            }
        }

        if (defaultedProps.snapToMarkers && !allMarkers.includes(activeValue)) {
            let snapTarget: SnapTarget = "nearest";

            // For keyboard movement, we should always go a new marker marker
            if (eventDetails.reason === "keyboard") {
                snapTarget = prevActiveValue - activeValue < 0 ? "next" : "prev";
            }

            const snappedValue = getSnappedValue(allMarkers, newValue, snapTarget);

            // Only apply the snapped value if necessary
            if (!isEqual(snappedValue, internalValue)) {
                updateValue(snappedValue, eventDetails);
            }
        } else {
            updateValue(newValue, eventDetails);
        }
    }

    const showThumbValueLabels =
        defaultedProps.valueLabelDisplay === "always" ||
        (defaultedProps.valueLabelDisplay === "auto" && (isHovered || isFocused));

    const [valueToClamp, setValueToClamp] = React.useState<null | number | number[]>(null);
    let clampedValue = isDualSlider ? clone(internalValue as number[]) : ([internalValue, internalValue] as number[]);

    if (prevMin !== defaultedProps.min || prevMax !== defaultedProps.max) {
        setPrevMin(defaultedProps.min);
        setPrevMax(defaultedProps.max);

        clampedValue = clampedValue.map((v) => clamp(v, defaultedProps.min, defaultedProps.max));

        if (minLocked) {
            clampedValue[0] = defaultedProps.min;
            if (!isDualSlider) clampedValue[1] = defaultedProps.min;
        }

        if (maxLocked) {
            if (!isDualSlider) clampedValue[0] = defaultedProps.max;
            clampedValue[1] = defaultedProps.max;
        }

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
            className={resolveClassNames("px-2xs grid items-center", props.layoutClassName)}
            ref={wrapperRef}
            value={internalValue}
            onValueChange={onValueChangeInternal}
            style={
                {
                    gridTemplateColumns: `
                        ${showMinLock ? "auto var(--lock-gutter-size) " : ""}
                        1fr
                        ${showMaxLock ? " var(--lock-gutter-size) auto" : ""}
                    `,
                    "--lock-gutter-size": `${clamp(wrapperSize.width * 0.1, 20, 40)}px`,

                    // Couldn't find any EDS variable for these sizes; these pixels sizes are used in the design doc
                    "--thumb-size": `${{ small: 6, default: 8, large: 10 }[componentSize]}px`,
                    "--mark-size": `${{ small: 4, default: 6, large: 8 }[componentSize]}px`,

                    // Needed to avoid some jumpiness in some cases
                    "--mark-thumb-diff": "calc(var(--thumb-size) - var(--mark-size))",
                    ...baseProps.style,
                } as React.CSSProperties
            }
            render={(rootProps, state) => (
                <div {...rootProps}>
                    {showMinLock && (
                        <LimitLockSwitch
                            layoutClassName="mr-2xs"
                            size={componentSize}
                            disabled={state.disabled}
                            isLocked={minLocked}
                            onSetLocked={setMinLocked}
                        />
                    )}

                    <SliderBase.Control
                        ref={ref}
                        className={resolveClassNames(
                            "group py-xs flex w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed",
                            SELECTABLE_SIZES_CLASSNAMES[componentSize],
                            {
                                "pl-(--lock-gutter-size)": showMinLock,
                                "pr-(--lock-gutter-size)": showMaxLock,
                            },
                        )}
                        style={{ gridColumnEnd: `span ${1 + Number(showMinLock) + Number(showMaxLock)}` }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        // If the slider is being dragged, we want to check if we should lock to min or max based on the pointer position
                        onPointerDown={(evt) => {
                            if (props.disabled) return;

                            evt.currentTarget.setPointerCapture(evt.pointerId);
                            setIsDragging(true);
                        }}
                        onPointerUpCapture={(evt) => {
                            evt.currentTarget.releasePointerCapture(evt.pointerId);
                            setIsDragging(false);
                        }}
                        onPointerMove={(evt) => {
                            if (!isDragging) return;

                            if (showMinLock && minGutterDotRef.current && !minLocked) {
                                const rect = minGutterDotRef.current.getBoundingClientRect();
                                setMinLocked(evt.pageX <= rect.x + rect.width / 2);
                            }
                            if (showMaxLock && maxGutterDotRef.current && !maxLocked) {
                                const rect = maxGutterDotRef.current.getBoundingClientRect();
                                setMaxLocked(evt.pageX >= rect.x + rect.width / 2);
                            }
                        }}
                    >
                        {showMinLock && (
                            <SliderLockGutter
                                ref={minGutterDotRef}
                                locked={minLocked}
                                size={componentSize}
                                placement="start"
                                inverse={isDualSlider !== !props.inverted}
                                sliderState={state}
                                onSetLocked={setMinLocked}
                            />
                        )}

                        <SliderBase.Track
                            className={resolveClassNames("w-full rounded-lg", TRACK_HEIGHT_CLASS_NAMES[componentSize], {
                                [INDICATOR_CLASS_NAME]: props.inverted,
                                [TRACK_CLASS_NAME]: !props.inverted,
                            })}
                        >
                            {!props.noIndicator && (
                                <SliderBase.Indicator
                                    className={resolveClassNames("rounded-lg", {
                                        [TRACK_CLASS_NAME]: props.inverted,
                                        [INDICATOR_CLASS_NAME]: !props.inverted,
                                    })}
                                />
                            )}

                            <Thumb
                                index={0}
                                size={componentSize}
                                showValue={showThumbValueLabels}
                                sliderValue={internalValue}
                                inputRefs={inputRefs}
                                disabled={state.disabled}
                                min={defaultedProps.min}
                                max={defaultedProps.max}
                                lockedToMin={minLocked}
                                lockedToMax={!isDualSlider && maxLocked}
                                valueLabelFormat={defaultedProps.valueLabelFormat}
                                getAriaLabel={getThumbAriaLabel}
                                onSetMinLocked={setMinLocked}
                                onSetMaxLocked={setMaxLocked}
                            />

                            <Thumb
                                index={1}
                                size={componentSize}
                                showValue={showThumbValueLabels}
                                sliderValue={internalValue}
                                inputRefs={inputRefs}
                                disabled={state.disabled}
                                min={defaultedProps.min}
                                max={defaultedProps.max}
                                // ! This can never be locked to min, since it's either hidden or the rightmost thumb
                                lockedToMin={false}
                                lockedToMax={maxLocked}
                                valueLabelFormat={defaultedProps.valueLabelFormat}
                                getAriaLabel={getThumbAriaLabel}
                                onSetMinLocked={setMinLocked}
                                onSetMaxLocked={setMaxLocked}
                            />

                            {allMarkers.map((v, i) => (
                                <Dot
                                    leftPosPercent={getMarkerPercentage(v, defaultedProps.min, defaultedProps.max)}
                                    key={i}
                                />
                            ))}
                        </SliderBase.Track>

                        {showMaxLock && (
                            <SliderLockGutter
                                ref={maxGutterDotRef}
                                inverse={!!props.inverted}
                                size={componentSize}
                                locked={maxLocked}
                                placement="end"
                                sliderState={state}
                                onSetLocked={setMaxLocked}
                            />
                        )}
                    </SliderBase.Control>

                    {showMaxLock && (
                        <LimitLockSwitch
                            layoutClassName="ml-2xs"
                            size={componentSize}
                            disabled={state.disabled}
                            isLocked={maxLocked}
                            onSetLocked={setMaxLocked}
                        />
                    )}

                    {/* Row 2, for marker labels */}
                    {defaultedProps.markerLabels && (
                        <div
                            className={resolveClassNames("grid", {
                                "-mt-2xs": componentSize === "small",
                                "-mt-xs": componentSize === "default",
                                "-mt-sm": componentSize === "large",
                            })}
                            style={{ gridColumnStart: showMinLock ? 3 : 1 }}
                        >
                            {allMarkers.map((v, i) => (
                                <DotLabel
                                    key={i}
                                    leftPosPercent={getMarkerPercentage(v, defaultedProps.min, defaultedProps.max)}
                                    value={v}
                                    index={i}
                                    size={componentSize}
                                    disabled={props.disabled}
                                    markerLabels={defaultedProps.markerLabels}
                                    onClick={(v) => {
                                        if (!isDualSliderValue(internalValue)) {
                                            updateValue(v, { reason: "marker-clicked" }, true);
                                            inputRefs[0].current?.focus();
                                        } else {
                                            const nearestThumbIndex = minBy([0, 1], (idx) =>
                                                Math.abs(internalValue[idx] - v),
                                            )!;

                                            const newValue = [...internalValue];
                                            newValue[nearestThumbIndex] = v;

                                            updateValue(newValue, { reason: "marker-clicked" }, true);
                                            inputRefs[nearestThumbIndex].current?.focus();
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        />
    );
}

function Thumb(props: {
    size: SelectableSize;
    index: number;
    showValue: boolean;
    sliderValue: number | readonly number[];
    inputRefs: React.Ref<HTMLInputElement>[];
    min: number;
    max: number;
    lockedToMin: boolean;
    lockedToMax: boolean;
    disabled: boolean;

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
                        // Note that z-index is forced to 2. Internal slider logic will attempt to set it to 1, so we force it to avoid layering issues with Dots
                        className="border-accent-strong data-disabled:border-disabled bg-surface not-data-disabled:hover:outline-focus focus-within:outline-focus z-2! box-content size-(--thumb-size) rounded-full border-2 outline-2 outline-offset-2 outline-transparent"
                        index={props.index}
                        inputRef={props.inputRefs[props.index]}
                        getAriaLabel={props.getAriaLabel}
                        style={positionStyle}
                        onKeyDownCapture={onThumbInputKeyDown}
                    />
                }
            />
            <Tooltip.Portal>
                <Tooltip.Positioner sideOffset={5}>
                    <Tooltip.Popup
                        data-slider-disabled={props.disabled ? "" : undefined}
                        className="bg-accent-strong data-slider-disabled:bg-disabled px-2xs py-4xs text-info-strong-on-emphasis! pointer-events-none rounded"
                        render={
                            <Typography
                                as="div"
                                variant="subtle"
                                size={getNextTextSize(getTextSizeForSelectableSize(props.size), -1)}
                            >
                                {props.valueLabelFormat ? props.valueLabelFormat(thumbValue, props.index) : thumbValue}
                            </Typography>
                        }
                    ></Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

function LimitLockSwitch(props: {
    layoutClassName?: string;
    size: SelectableSize;
    disabled: boolean;
    isLocked: boolean;
    onSetLocked: (newValue: boolean) => void;
}) {
    const ButtonIcon = props.isLocked ? Lock : LockOpen;

    return (
        <Button
            layoutClassName={props.layoutClassName}
            variant="ghost"
            tone="accent"
            size={props.size}
            compact
            pressed={props.isLocked}
            disabled={props.disabled}
            onClick={() => props.onSetLocked(!props.isLocked)}
        >
            <ButtonIcon className="text-accent-subtle text" fontSize="inherit" />
        </Button>
    );
}

type SliderLockGutterProps = {
    placement: "start" | "end";
    inverse: boolean;
    locked: boolean;
    size: SelectableSize;
    sliderState: SliderRootState;
    onSetLocked: (locked: boolean) => void;
};

const SliderLockGutter = React.forwardRef<HTMLDivElement, SliderLockGutterProps>(function SliderLockGutter(props, ref) {
    const isFilled = props.inverse !== props.locked;
    const isDragging = props.sliderState.dragging;
    const isDisabled = props.sliderState.disabled;

    function getGutterColorVariable(disabled: boolean, isFilled: boolean, dragging: boolean) {
        // The gutter tracks are mimicking the look of the slider track, except using a gradient to have it appear as a dashed line.
        // Tailwind gradient classes are not included, so we have to manually refer to eds variables here
        if (disabled && isFilled) {
            return "var(--eds-color-bg-fill-emphasis-disabled)";
        } else if (disabled) {
            return "var(--eds-color-bg-neutral-canvas)";
        } else if (isFilled) {
            return "var(--eds-color-bg-accent-fill-emphasis-default)";
        } else if (dragging) {
            return "var(--eds-color-bg-neutral-fill-muted-hover)";
        } else {
            return "var(--eds-color-bg-neutral-canvas)";
        }
    }

    return (
        <div
            className={resolveClassNames("flex w-(--lock-gutter-size) items-center", {
                "-ml-(--lock-gutter-size)": props.placement === "start",
                "-mr-(--lock-gutter-size)": props.placement === "end",
                "flex-row-reverse": props.placement === "end",
            })}
        >
            <div
                ref={ref}
                className="border-neutral bg-surface mx-(--mark-thumb-diff) box-content size-(--mark-size) shrink-0 rounded-full border"
                onPointerDownCapture={() => !props.sliderState.disabled && props.onSetLocked(true)}
            />

            <div
                className={resolveClassNames("w-full", TRACK_HEIGHT_CLASS_NAMES[props.size])}
                style={{
                    // @ts-expect-error -- css typing doesn't accept variables
                    "--gutter-color": getGutterColorVariable(isDisabled, isFilled, isDragging),
                    backgroundImage: `repeating-linear-gradient(
                            to right,
                            var(--gutter-color) 0px,
                            var(--gutter-color) 4px,
                            transparent 4px, transparent 8px
                        )`,
                }}
            />
        </div>
    );
});

function Dot(props: { leftPosPercent: number }) {
    const className =
        "border border-neutral box-content size-(--mark-size) rounded-full absolute bg-surface z-1 top-0 -translate-y-1/4 -translate-x-1/2";

    return <div className={className} style={{ left: `${props.leftPosPercent}%` }} />;
}

function DotLabel(props: {
    leftPosPercent: number;
    value: number;
    index: number;
    markerLabels?: SliderProps["markerLabels"];
    disabled?: boolean;
    size: SelectableSize;
    onClick: (value: number) => void;
}): React.ReactNode {
    if (!props.markerLabels) return null;

    let formattedValue;
    const textSize = getTextSizeForSelectableSize(props.size);

    if (typeof props.markerLabels === "function") {
        formattedValue = props.markerLabels(props.value, props.index);
    } else {
        formattedValue = String(props.value);
    }

    if (!formattedValue && formattedValue !== 0) {
        return null;
    }

    function handleOnClick() {
        if (props.disabled) return;
        props.onClick(props.value);
    }

    return (
        <Typography
            as="span"
            role="button"
            tabIndex={props.disabled ? -1 : 0}
            aria-disabled={props.disabled ? true : undefined}
            aria-label={`Set slider to ${props.value}`}
            data-disabled={props.disabled ? "" : undefined}
            family="body"
            variant="subtle"
            size={getNextTextSize(textSize, -1)}
            tone="neutral"
            // To make the marker labels "float", while still applying their height to the parent, we cram them all in the same grid cell, and then align them to their markers using a margin
            layoutClassName="cursor-pointer font-bolder px-2xs py-4xs block -translate-x-1/2 rounded-sm not-data-disabled:hover:bg-input focus:outline-focus justify-self-start"
            layoutStyle={{ marginLeft: `${props.leftPosPercent}%`, gridColumn: 1, gridRow: 1 }}
            onClick={handleOnClick}
            onKeyDown={(evt) => ["Enter", " "].includes(evt.key) && handleOnClick()}
            // ! Slider will move the thumb during pointer-down event, so we stop it here to avoid jumpiness
            onPointerDown={(evt) => !props.disabled && evt.stopPropagation()}
        >
            {formattedValue}
        </Typography>
    );
}

function isDualSliderValue(value: number | readonly number[]): value is readonly number[] {
    return Array.isArray(value);
}

function useLockState(props: {
    isDualSlider: boolean;
    showMinLock: boolean;
    showMaxLock: boolean;
    minLocked?: boolean;
    maxLocked?: boolean;
    defaultMinLocked?: boolean;
    defaultMaxLocked?: boolean;
    onMinLockedChange?: (locked: boolean) => void;
    onMaxLockedChange?: (locked: boolean) => void;
}) {
    const [internalMinLocked, internalSetMinLocked] = useOptInControlledValue(
        props.defaultMinLocked ?? false,
        props.minLocked,
        props.onMinLockedChange,
    );
    const [internalMaxLocked, internalSetMaxLocked] = useOptInControlledValue(
        props.defaultMaxLocked ?? false,
        props.maxLocked,
        props.onMaxLockedChange,
    );

    const setMinLocked = React.useCallback(
        function setMinLockedFunc(locked: boolean) {
            if (!props.showMinLock && locked) return;

            internalSetMinLocked(locked);
            if (locked && !props.isDualSlider) {
                internalSetMaxLocked(false);
            }
        },
        [internalSetMaxLocked, internalSetMinLocked, props.isDualSlider, props.showMinLock],
    );

    const setMaxLocked = React.useCallback(
        function setMaxLockedFunc(locked: boolean) {
            if (!props.showMaxLock && locked) return;

            internalSetMaxLocked(locked);
            if (locked && !props.isDualSlider) {
                internalSetMinLocked(false);
            }
        },
        [internalSetMaxLocked, internalSetMinLocked, props.isDualSlider, props.showMaxLock],
    );

    return {
        minLocked: internalMinLocked,
        maxLocked: internalMaxLocked,
        setMinLocked,
        setMaxLocked,
    };
}

function useLockedValueUpdate(props: {
    value: number | number[];
    min: number;
    max: number;
    minLocked: boolean;
    maxLocked: boolean;
    onValueChange?: (value: number | number[], eventDetails: SliderChangeEventDetails, commit: boolean) => void;
}) {
    const prevMinLocked = React.useRef(false);
    const prevMaxLocked = React.useRef(false);

    const { onValueChange } = props;

    React.useEffect(
        function clampToToggledLocksEffec() {
            const value = props.value as number | number[];
            const isDualValue = isDualSliderValue(value);
            let newValue: number | number[] | null = null;

            // Min lock was just enabled
            if (props.minLocked && !prevMinLocked.current) {
                if (isDualValue) {
                    newValue = [props.min, value[1]];
                } else {
                    newValue = props.min;
                }
            }

            // Max lock was just enabled
            if (props.maxLocked && !prevMaxLocked.current) {
                if (isDualValue && newValue !== null) {
                    newValue = [(newValue as number[])[0], props.max];
                } else if (isDualValue) {
                    newValue = [value[0], props.max];
                } else {
                    newValue = props.max;
                }
            }

            prevMinLocked.current = props.minLocked;
            prevMaxLocked.current = props.maxLocked;

            if (newValue !== null) {
                onValueChange?.(newValue, { reason: "range-locked" }, true);
            }
        },
        [props.minLocked, props.maxLocked, props.min, props.max, props.value, onValueChange],
    );
}

function useUnlockOnValueChange(props: {
    value: number | readonly number[];
    min: number;
    max: number;
    minLocked: boolean;
    maxLocked: boolean;

    setMinLocked: (locked: boolean) => void;
    setMaxLocked: (locked: boolean) => void;
}) {
    const { setMinLocked, setMaxLocked } = props;
    const prevValue = React.useRef(props.value);

    React.useEffect(
        function unlockSliderLocksEffect() {
            // Only check if value actually changed
            if (isEqual(prevValue.current, props.value)) return;

            const lowerValue = isDualSliderValue(props.value) ? props.value[0] : props.value;
            const upperValue = isDualSliderValue(props.value) ? props.value[1] : props.value;

            if (props.minLocked && lowerValue > props.min) {
                setMinLocked(false);
            }

            if (props.maxLocked && upperValue < props.max) {
                setMaxLocked(false);
            }

            prevValue.current = props.value;
        },
        [props.max, props.maxLocked, props.min, props.minLocked, props.value, setMaxLocked, setMinLocked],
    );
}

function getSnappedValue(sortedMarkers: number[], value: number | number[], target: SnapTarget): number | number[] {
    if (Array.isArray(value)) {
        return value.map((v) => getSnappedValue(sortedMarkers, v, target)) as number[];
    }

    switch (target) {
        case "nearest": {
            const closestMarker = minBy(sortedMarkers, (marker) => Math.abs(marker - value))!;
            return closestMarker;
        }
        case "next": {
            const nextMarker = sortedMarkers.find((marker) => marker >= value);
            return nextMarker !== undefined ? nextMarker : sortedMarkers[sortedMarkers.length - 1];
        }
        case "prev": {
            const prevMarker = sortedMarkers.findLast((marker) => marker <= value);
            return prevMarker !== undefined ? prevMarker : sortedMarkers[0];
        }
    }
}

function getMarkerPercentage(value: number, min: number, max: number) {
    const range = max - min;

    if (range === 0) return 0;
    return ((value - min) / range) * 100;
}

export const Slider = React.forwardRef(SliderComponent) as <
    Value extends number | readonly number[] = number | readonly number[],
>(
    props: SliderProps<Value> & React.RefAttributes<HTMLDivElement>,
) => React.ReactNode;
