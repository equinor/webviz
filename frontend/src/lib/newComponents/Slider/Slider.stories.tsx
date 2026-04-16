import React from "react";

import { Warning } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import type { SliderProps } from "./index";
import { Slider } from "./index";

const meta: Meta<typeof Slider> = {
    title: "Components/Slider",
    component: Slider,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div className="w-md">
                <Story />
            </div>
        ),
    ],
    tags: ["autodocs"],
    argTypes: {
        disabled: {
            control: "boolean",
        },
        step: {
            control: "number",
        },
    },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
    render: (args) => (
        <div className="gap-y-vertical-lg flex flex-col">
            <Slider defaultValue={25} {...args} />
            <Slider defaultValue={[25, 75]} {...args} />
        </div>
    ),
};

export const SnapRangeLimit: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-vertical-lg flex flex-col">
            <SliderController
                initialValue={25}
                renderChildren={(props) => <Slider enableRangeLocks {...args} {...props} />}
            />
            <SliderController
                initialValue={[25, 75]}
                renderChildren={(props) => <Slider enableRangeLocks {...args} {...props} />}
            />

            <div className="w-3/4">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider enableRangeLocks {...args} {...props} />}
                />
            </div>

            <div className="w-1/2">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider enableRangeLocks="min" {...args} {...props} />}
                />
            </div>

            <div className="w-2/5">
                <SliderController
                    initialValue={[25, 75]}
                    renderChildren={(props) => <Slider enableRangeLocks="max" {...args} {...props} />}
                />
            </div>
        </div>
    ),
};

export const ValueLabelDisplaySettings: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-vertical-lg flex flex-col">
            <code className="bg-canvas text-body-xs border-neutral-strong px-vertical-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;auto&quot; (default)
            </code>
            <Slider {...args} defaultValue={25} valueLabelDisplay="auto" />

            <code className="bg-canvas text-body-xs border-neutral-strong px-vertical-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;always&quot;
            </code>
            <Slider {...args} defaultValue={[25, 75]} valueLabelDisplay="always" />

            <code className="bg-canvas text-body-xs border-neutral-strong px-vertical-2xs ml-auto w-fit rounded border">
                valueLabelDisplay=&quot;off&quot;
            </code>
            <Slider {...args} defaultValue={[25, 75]} valueLabelDisplay="off" />
        </div>
    ),
};

export const ValueLabelFormatting: Story = {
    args: { min: 0, max: 100 },
    render: (args) => (
        <div className="gap-y-vertical-3xl flex flex-col">
            <Slider {...args} defaultValue={25} valueLabelDisplay="always" valueLabelFormat={(v) => `${v} %`} />

            <Slider
                {...args}
                defaultValue={[25, 75]}
                valueLabelDisplay="always"
                valueLabelFormat={(v) => {
                    return (
                        <>
                            {v}
                            {v > 50 && <Warning fontSize="inherit" className="ml-horizontal-xs align-sub" />}
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
