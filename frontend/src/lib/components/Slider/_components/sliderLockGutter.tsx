import React from "react";

import type { SliderRootState } from "@base-ui/react";

import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TRACK_HEIGHT_CLASS_NAMES } from "../_constants";

type SliderLockGutterProps = {
    placement: "start" | "end";
    inverse: boolean;
    hovered: boolean;
    locked: boolean;
    size: SelectableSize;
    sliderState: SliderRootState;
    onSetLocked: (locked: boolean) => void;
};

export const SliderLockGutter = React.forwardRef<HTMLDivElement, SliderLockGutterProps>(
    function SliderLockGutter(props, ref) {
        const isFilled = props.inverse !== props.locked;
        const isDragging = props.sliderState.dragging || props.hovered;
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
    },
);
