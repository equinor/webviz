import React from "react";

import { Tooltip } from "@base-ui-components/react";
import * as Base from "@base-ui-components/react/slider";

import _ from "lodash";

import { buildBaseUiClassName } from "../utils/buildBaseUiClassName";

export type SliderProps = Omit<Base.Slider.Root.Props, "value"> & {
    value: number | readonly number[];
    markSteps?: boolean;
    valueLabelDisplay?: "auto" | "off" | "on";
    valueLabelFormat?: string | ((value: number) => string);
};

type ValueLabelTooltipProps = {
    value: number;
    open?: boolean;
    valueLabelDisplay?: "auto" | "off" | "on";
    valueLabelFormat?: string | ((value: number) => string);
    children: React.ReactElement;
};

function ValueLabelTooltip(props: ValueLabelTooltipProps): React.ReactNode {
    let formattedValue: string | number = props.value;
    if (typeof props.valueLabelFormat === "function") {
        formattedValue = props.valueLabelFormat(props.value);
    } else if (props.valueLabelFormat) {
        formattedValue = props.valueLabelFormat;
    }

    return (
        <Tooltip.Root open={props.open}>
            <Tooltip.Trigger render={props.children} />
            <Tooltip.Portal>
                <Tooltip.Positioner side="top" sideOffset={8}>
                    <Tooltip.Popup className="pointer-events-none inline-block rounded-sm bg-blue-600 text-white p-2 h-6 text-xs font-bold leading-none whitespace-nowrap">
                        <Tooltip.Arrow className="-bottom-0.5 rotate-45 bg-blue-600 size-2.5 -z-10" />
                        {formattedValue}
                    </Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

function isMultiValue(value: SliderProps["value"]): value is readonly number[] {
    return Array.isArray(value);
}

function valueToPercentString(value: number, min: number, max: number) {
    return `${((value - min) * 100) / (max - min)}%`;
}

function SliderMarks(props: SliderProps): React.ReactNode {
    if (!props.markSteps) return null;

    // ! Default matches the default ones from
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    const step = props.step ?? 1;

    return (
        <>
            {_.range(min, max + 1, step).map((v) => (
                <span
                    key={v}
                    className="--mark"
                    style={{
                        position: "absolute",
                        insetInlineStart: valueToPercentString(v, min, max),
                    }}
                />
            ))}
        </>
    );
}

function SliderThumbs(props: SliderProps & { isHoveringSlider: boolean }) {
    const { valueLabelDisplay, isHoveringSlider } = props;

    const labelsShouldShow = valueLabelDisplay === "on" || (isHoveringSlider && props.valueLabelDisplay === "auto");

    return (
        <>
            <Base.Slider.Thumb
                className="--thumb"
                render={(divProps, inputProps, state) => {
                    if (state.values[0] == null) return <></>;
                    return (
                        <ValueLabelTooltip open={labelsShouldShow} value={state.values[0]}>
                            <div {...divProps}>
                                <input {...inputProps} />
                            </div>
                        </ValueLabelTooltip>
                    );
                }}
            />

            <Base.Slider.Thumb
                className="--thumb"
                render={(divProps, inputProps, state) => {
                    if (state.values[1] == null) return <></>;
                    return (
                        <ValueLabelTooltip open={labelsShouldShow} value={state.values[1]}>
                            <div {...divProps}>
                                <input {...inputProps} />
                            </div>
                        </ValueLabelTooltip>
                    );
                }}
            />
        </>
    );
}

function SliderComponent(props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const { className, ...otherProps } = props;

    const [isHoveringSlider, setIsHoveringSlider] = React.useState(false);

    return (
        <Base.Slider.Root className="--wv-slider" {...otherProps}>
            <Tooltip.Provider>
                <Base.Slider.Control
                    ref={ref}
                    className={(state) => buildBaseUiClassName(state, "--control", className)}
                    onPointerEnter={() => setIsHoveringSlider(true)}
                    onPointerLeave={() => setIsHoveringSlider(false)}
                >
                    <Base.Slider.Track key={isMultiValue(props.value) ? "mult" : "single"} className="--track">
                        <Base.Slider.Indicator className="--indicator" />
                        <SliderMarks {...otherProps} />
                        <SliderThumbs isHoveringSlider={isHoveringSlider} {...otherProps} />
                    </Base.Slider.Track>
                </Base.Slider.Control>
            </Tooltip.Provider>
        </Base.Slider.Root>
    );
}

export const Slider = React.forwardRef(SliderComponent);
