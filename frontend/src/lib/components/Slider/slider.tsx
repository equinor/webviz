import React from "react";

import type { SliderRootProps as SliderRootBaseProps } from "@base-ui/react/slider";
import { Slider as SliderBase } from "@base-ui/react/slider";
import { chain, clamp, clone, isEqual, minBy } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { withDefaults } from "../_shared/utils/defaultProps";
import { SELECTABLE_SIZES_CLASSNAMES, type SelectableSize } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

import { LimitLockSwitch } from "./_components/limitLockSwitch";
import { Marker, type MarkerVariant } from "./_components/marker";
import { MarkerLabel, type MarkerLabelProps } from "./_components/markerLabel";
import { SliderLockGutter } from "./_components/sliderLockGutter";
import { Thumb } from "./_components/thumb";
import { INDICATOR_CLASS_NAME, TRACK_CLASS_NAME, TRACK_HEIGHT_CLASS_NAMES } from "./_constants";
import { useLockedValueUpdate, useLockState, useUnlockOnValueChange } from "./_hooks";
import { getMarkerPercentage, getSnappedValue, isDualSliderValue } from "./_utils";
import type { SliderChangeEventDetails, SnapTarget } from "./types";

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

    valueLabelSide?: "top" | "bottom";

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

    /** Additional slider values to show a mark at. The slider will *always* show markers at the ends. @default [] */
    markers?: number[];

    /** Snaps the allowed slider values to the values defined in markers (including min/max). @default false */
    snapToMarkers?: boolean;

    /**
     * Display the value of each marker below them.
     * A function can be provided for further customization. Returning an empty node (null, false, etc) or an empty string will fully remove the label */
    markerLabels?: boolean | MarkerLabelProps["labelFormat"];

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

export const Slider = React.forwardRef<HTMLDivElement, SliderProps<number | number[]>>(function Slider(
    // ! Note: To simplify internal logic, we always type the slider props as number | number[] using some direct
    // ! casting. Externally, slider users will see the change event's with the same type as the provided values
    props: SliderProps<number | number[]>,
    ref,
): React.ReactNode {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);

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
    const controllerRef = React.useRef<HTMLDivElement | null>(null);

    React.useImperativeHandle(ref, () => controllerRef.current as HTMLDivElement);

    const [internalValue, setInternalValue] = React.useState(defaultedProps.value ?? defaultedProps.defaultValue);
    const [prevMin, setPrevMin] = React.useState(defaultedProps.min);
    const [prevMax, setPrevMax] = React.useState(defaultedProps.max);

    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);

    const showMinLock = [true, "both", "min"].includes(defaultedProps.showRangeLocks);
    const showMaxLock = [true, "both", "max"].includes(defaultedProps.showRangeLocks);

    const markerLabelFormatFunc =
        typeof defaultedProps.markerLabels === "function" ? defaultedProps.markerLabels : undefined;
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
    const controllerSize = useElementSize(controllerRef);

    const thumbSize = React.useMemo(() => ({ small: 6, default: 8, large: 10 })[componentSize], [componentSize]);
    const markSize = React.useMemo(() => ({ small: 4, default: 6, large: 8 })[componentSize], [componentSize]);

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

    // We generally want to use the dots, but if there's not
    // enough room, we use simple ticks as a fall-back
    const activeMarkerVariant = React.useMemo<MarkerVariant>(() => {
        if (allMarkers.length * (markSize + 4) < controllerSize.width) {
            return "dot";
        } else if (allMarkers.length * 3 < controllerSize.width) {
            return "tick";
        }
        return "none";
    }, [allMarkers.length, controllerSize.width, markSize]);

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
            className={resolveClassNames(baseProps.className, "px-2xs grid items-center")}
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
                    "--thumb-size": `${thumbSize}px`,
                    "--mark-size": `${markSize}px`,

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
                        ref={controllerRef}
                        className={resolveClassNames(
                            "group/slider-comp py-xs flex w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed",
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
                                hovered={isHovered}
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
                                labelSide={props.valueLabelSide}
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
                                labelSide={props.valueLabelSide}
                                getAriaLabel={getThumbAriaLabel}
                                onSetMinLocked={setMinLocked}
                                onSetMaxLocked={setMaxLocked}
                            />

                            {allMarkers.map((v, i) => (
                                <Marker
                                    // We always keep the min and max markers as dots
                                    variant={i !== 0 && i !== allMarkers.length - 1 ? activeMarkerVariant : "dot"}
                                    leftPosPercent={getMarkerPercentage(v, defaultedProps.min, defaultedProps.max)}
                                    key={i}
                                />
                            ))}
                        </SliderBase.Track>

                        {showMaxLock && (
                            <SliderLockGutter
                                ref={maxGutterDotRef}
                                hovered={isHovered}
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
                                <MarkerLabel
                                    key={i}
                                    leftPosPercent={getMarkerPercentage(v, defaultedProps.min, defaultedProps.max)}
                                    value={v}
                                    index={i}
                                    numMarkers={allMarkers.length}
                                    disabled={props.disabled}
                                    labelFormat={markerLabelFormatFunc}
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
}) as <Value extends number | readonly number[] = number | readonly number[]>(
    props: SliderProps<Value> & React.RefAttributes<HTMLDivElement>,
) => React.ReactNode;
