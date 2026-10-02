import React from "react";

import { Slider as SliderBase, Tooltip as TooltipBase, type BaseUIEvent } from "@base-ui/react";
import { Error as ErrorIcon } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import { getNextTextSize, getTextSizeForSelectableSize, type SelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isDualSliderValue } from "../_utils";

export function Thumb(props: {
    labelBoundaryRef: React.RefObject<HTMLDivElement>;
    size: SelectableSize;
    index: number;
    showValue: boolean;
    labelSide?: "top" | "bottom";
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

    const isOutOfBounds = thumbValue < props.min || thumbValue > props.max;
    const shouldShowThumbLabel = props.showValue || isOutOfBounds;

    const anchorRef = React.useRef<HTMLDivElement>(null);

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
        <>
            <SliderBase.Thumb
                data-out-of-range={isOutOfBounds ? "" : undefined}
                // Hiding via style to keep refs stable
                hidden={thumbHidden}
                disabled={thumbHidden}
                // Note that z-index is forced to 2. Internal slider logic will attempt to set it to 1, so we force it to avoid layering issues with Dots
                className="border-accent-strong data-disabled:border-disabled data-out-of-range:border-danger-strong bg-surface not-data-disabled:hover:outline-focus focus-within:outline-focus z-2! box-content size-(--thumb-size) rounded-full border-2 outline-2 outline-offset-2 outline-transparent"
                index={props.index}
                inputRef={props.inputRefs[props.index]}
                getAriaLabel={props.getAriaLabel}
                onKeyDownCapture={onThumbInputKeyDown}
                render={(p) => {
                    return (
                        <>
                            {/* We create a duplicate, invisible thumb for the the thumb tooltip to follow; this element won't move out into the gutters when locked, so the tooltip stays aligned with the track */}
                            <div
                                ref={anchorRef}
                                className={resolveClassNames(p.className, "pointer-events-none invisible")}
                                style={p.style}
                            />
                            <div
                                {...p}
                                style={{
                                    ...p.style,
                                    ...positionStyle,
                                }}
                            />
                        </>
                    );
                }}
            />
            <TooltipBase.Root open={shouldShowThumbLabel && !thumbHidden}>
                <TooltipBase.Portal className="pointer-events-none">
                    <TooltipBase.Positioner
                        sideOffset={4}
                        anchor={anchorRef.current}
                        side={props.labelSide}
                        collisionBoundary={props.labelBoundaryRef.current ?? "clipping-ancestors"}
                        collisionPadding={-8}
                        collisionAvoidance={{
                            side: "none",
                        }}
                    >
                        <TooltipBase.Popup
                            data-out-of-range={isOutOfBounds ? "" : undefined}
                            data-slider-disabled={props.disabled ? "" : undefined}
                            className="bg-accent-strong data-slider-disabled:bg-disabled data-out-of-range:bg-danger-strong px-2xs py-4xs text-info-strong-on-emphasis! rounded"
                            render={
                                <Typography
                                    as="div"
                                    variant="subtle"
                                    size={getNextTextSize(getTextSizeForSelectableSize(props.size), -1)}
                                >
                                    {props.valueLabelFormat
                                        ? props.valueLabelFormat(thumbValue, props.index)
                                        : thumbValue}

                                    {isOutOfBounds && (
                                        <ErrorIcon
                                            className="ml-2xs pointer-events-auto! inline align-sub"
                                            titleAccess="The value is out range!"
                                        />
                                    )}
                                </Typography>
                            }
                        />
                    </TooltipBase.Positioner>
                </TooltipBase.Portal>
            </TooltipBase.Root>
        </>
    );
}
