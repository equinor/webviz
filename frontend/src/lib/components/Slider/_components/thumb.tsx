import type React from "react";

import { Slider as SliderBase, Tooltip as TooltipBase, type BaseUIEvent } from "@base-ui/react";
import { Key } from "ts-key-enum";

import { getNextTextSize, getTextSizeForSelectableSize, type SelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

import { isDualSliderValue } from "../_utils";

export function Thumb(props: {
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
        <TooltipBase.Root open={props.showValue && !thumbHidden}>
            <TooltipBase.Trigger
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
            <TooltipBase.Portal>
                <TooltipBase.Positioner sideOffset={6} side={props.labelSide}>
                    <TooltipBase.Popup
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
                    ></TooltipBase.Popup>
                </TooltipBase.Positioner>
            </TooltipBase.Portal>
        </TooltipBase.Root>
    );
}
