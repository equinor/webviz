import React from "react";

import { Warning } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";
import { NumberInput } from "../NumberInput";

import type { SliderProps } from "./index";
import { Slider } from "./index";

const meta: Meta<typeof Slider> = {
    title: "Components/Slider",
    component: Slider,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
The \`Slider\` component allows users to select a value or range of values along a track by dragging a thumb. It supports both single-value and range selection, as well as various customization options for appearance and behavior. When explicitly using a singular value, the emitted change events will match the value type (and vice versa for dual sliders)
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="w-md">
                <Story />
            </div>
        ),
    ],
    tags: ["autodocs"],
    args: {
        markers: [],
    },
    argTypes: {
        thumbCollisionBehavior: {
            control: "inline-radio",
            options: ["push", "swap", "none"],
        },
        disabled: {
            control: "boolean",
        },
        step: {
            control: "number",
        },
        markerLabels: {
            control: "boolean",
        },
        showRangeLocks: {
            control: "radio",
            options: ["none", "min", "max", "both", true],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <Slider defaultValue={25} {...args} />
            <Slider defaultValue={[25, 75]} {...args} />
            <Slider defaultValue={75} {...args} inverted={!args.inverted} />
        </div>
    ),
};

export const Marks: Story = {
    args: { markers: [10, 20, 40, 60, 80], snapToMarkers: true, markerLabels: true },
    argTypes: {
        markerLabels: {
            control: "radio",
            options: [false, true, "(v) => `${v}%`", "(v, i) => (i % 2 === 0 ? v : null)"],
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Marks (or ticks) consist of three properties: \`markers\`, \`snapToMarkers\`, and \`markerLabels\`.
- The \`markers\` prop can be used to define an assorted list of slider points that should show a marker. The slider will *always* have marks at the \`min\` and \`max\` values.
- The \`snapToMarkers\` prop makes the slider thumb snap to the closest marker when dragged, or to the next/previous value when changing the value with keyboard inputs
- The \`markerLabels\` prop can be used to show text labels underneath each marker. Labels can be clicked to quickly snap the slider to the marked value. Set it to \`true\` to just show the marker values directly, or provide a custom formatting function to render custom labels.
`,
            },
        },
    },
    render: (args) => {
        let markerLabels = args.markerLabels as
            | SliderProps["markerLabels"]
            | "(v) => `${v}%`"
            | "(v, i) => (i % 2 === 0 ? v : null)";

        if (markerLabels === "(v) => `${v}%`") {
            markerLabels = (v: number) => `${v}%`;
        }

        if (markerLabels === "(v, i) => (i % 2 === 0 ? v : null)") {
            markerLabels = (v: number, i: number) => (i % 2 === 0 ? v : null);
        }

        return (
            <div className="gap-y-lg flex flex-col">
                <Slider {...args} defaultValue={20} markerLabels={markerLabels} />
                <Slider {...args} defaultValue={[20, 80]} markerLabels={markerLabels} />
            </div>
        );
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <Slider defaultValue={25} {...args} />
        </div>
    ),
};

export const Inverted: Story = {
    args: { inverted: true },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <Slider defaultValue={25} {...args} />
        </div>
    ),
};

export const NoIndicator: Story = {
    args: { noIndicator: true },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <Slider defaultValue={25} {...args} />
        </div>
    ),
};

export const Size: Story = {
    parameters: {
        docs: {
            description: {
                story: `
The \`size\` prop can be used to adjust the size of the slider. The default size is \`"default"\`, but you can also use \`"small"\` or \`"large"\`.

The size will affect the slider controller area; this means the slider height will generally match other library components, but if also showing markers, the total height will be bigger than other components. 
`,
            },
        },
    },
    argTypes: { size: { table: { disable: true } } },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <Slider defaultValue={25} valueLabelDisplay="always" {...args} size="small" />
            <Slider defaultValue={50} valueLabelDisplay="always" {...args} size="default" />
            <Slider defaultValue={75} valueLabelDisplay="always" {...args} size="large" />
        </div>
    ),
};

export const Controlled: Story = {
    argTypes: { min: { control: "number" }, max: { control: "number" } },
    args: { min: 0, max: 100 },
    render: function ControlledStoryComp(args) {
        const [lockMin, setLockMin] = React.useState(false);
        const [lockMax, setLockMax] = React.useState(true);

        const [sliderValue, setSliderValue] = React.useState<number[]>([10, 75]);

        return (
            <div className="gap-y-lg flex flex-col">
                <div className="flex justify-between">
                    <div className="text-body-xs bg-accent-subtle border-neutral-strong px-2xs w-fit rounded border">
                        Value: {Array.isArray(sliderValue) ? sliderValue.join(" - ") : sliderValue}
                        <br />
                        Range lock: {String(lockMin)} - {String(lockMax)}
                    </div>

                    <Button
                        onClick={() => {
                            setLockMin(true);
                            setLockMax(true);
                        }}
                    >
                        Lock ranges
                    </Button>
                </div>

                <div className="gap-x-xs flex">
                    <Slider
                        {...args}
                        layoutClassName="w-full grow"
                        showRangeLocks="both"
                        minLocked={lockMin}
                        maxLocked={lockMax}
                        onMinLockedChange={setLockMin}
                        onMaxLockedChange={setLockMax}
                        value={sliderValue}
                        onValueChange={(v) => {
                            setSliderValue(v as any);
                        }}
                        // rangeLocked={rangeLock}
                        // onRangeLockedChange={setRangeLock}
                    />
                    <NumberInput
                        layoutClassName="w-16"
                        min={sliderValue[0]}
                        max={args.max}
                        value={sliderValue[1]}
                        onValueChange={(v) => setSliderValue((prev) => [prev[0], v ?? 100])}
                    />
                </div>

                <div className="gap-x-xs flex">
                    <Slider
                        {...args}
                        layoutClassName="w-full grow"
                        showRangeLocks="max"
                        maxLocked={lockMax}
                        onMinLockedChange={setLockMin}
                        onMaxLockedChange={setLockMax}
                        value={sliderValue[1]}
                        onValueChange={(v) => {
                            setSliderValue((prev) => [prev[0], v as number]);
                        }}
                        // rangeLocked={rangeLock}
                        // onRangeLockedChange={setRangeLock}
                    />
                    <NumberInput
                        layoutClassName="w-16"
                        min={sliderValue[0]}
                        max={args.max}
                        value={sliderValue[1]}
                        onValueChange={(v) => setSliderValue((prev) => [prev[0], v ?? 100])}
                    />
                </div>
            </div>
        );
    },
};

export const SnapRangeLimit: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <SliderController
                initialValue={25}
                renderChildren={(props) => <Slider showRangeLocks {...args} {...props} />}
            />
            <SliderController
                initialValue={[25, 75]}
                renderChildren={(props) => <Slider showRangeLocks {...args} {...props} />}
            />

            <div className="w-3/4">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider showRangeLocks {...args} {...props} />}
                />
            </div>

            <div className="w-1/2">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider showRangeLocks="min" {...args} {...props} />}
                />
            </div>

            <div className="w-2/5">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider showRangeLocks="max" {...args} {...props} />}
                />
            </div>
        </div>
    ),
};

export const ValueLabelDisplaySettings: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-lg flex flex-col">
            <code className="bg-canvas text-body-xs border-neutral-strong px-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;auto&quot; (default)
            </code>
            <Slider {...args} defaultValue={25} valueLabelDisplay="auto" />

            <code className="bg-canvas text-body-xs border-neutral-strong px-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;always&quot;
            </code>
            <Slider {...args} defaultValue={[25, 75]} valueLabelDisplay="always" />

            <code className="bg-canvas text-body-xs border-neutral-strong px-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;off&quot;
            </code>
            <Slider {...args} defaultValue={[25, 75]} valueLabelDisplay="off" />
        </div>
    ),
};

export const ValueLabelFormatting: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-3xl flex flex-col">
            <Slider {...args} defaultValue={25} valueLabelDisplay="always" valueLabelFormat={(v) => `${v} %`} />

            <Slider
                {...args}
                defaultValue={[25, 75]}
                valueLabelDisplay="always"
                valueLabelFormat={(v) => {
                    return (
                        <>
                            {v}
                            {v > 50 && <Warning fontSize="inherit" className="ml-xs align-sub" />}
                        </>
                    );
                }}
            />
        </div>
    ),
};

function SliderController(props: {
    initialValue: number | readonly number[];
    renderChildren: (props: SliderProps) => React.ReactNode;
}) {
    const [value, setValue] = React.useState(props.initialValue);

    return (
        <div>
            Value: <span>{Array.isArray(value) ? value.join(" - ") : value}</span>
            {props.renderChildren({
                value,
                onValueChange: (v) => setValue(v),
            })}
        </div>
    );
}
