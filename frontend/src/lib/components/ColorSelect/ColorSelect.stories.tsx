import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { ColorSelect } from "./index";

const meta: Meta<typeof ColorSelect> = {
    title: "Components/ColorSelect",
    component: ColorSelect,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A button that opens the browser's native color picker. The selected color is
displayed as a swatch inside the button.

\`\`\`tsx
import { ColorSelect } from "@/lib/newComponents/ColorSelect";

const [color, setColor] = React.useState("#3b82f6");

<ColorSelect value={color} onChange={setColor} />
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        disabled: { control: "boolean" },
        value: { control: "color" },
        size: {
            control: "select",
            options: ["small", "default", "large"],
        },
        variant: {
            control: "select",
            options: ["outlined", "text"],
        },
    },
    args: {
        value: "#3b82f6",
        disabled: false,
        size: "default",
        variant: "outlined",
    },
};

export default meta;
type Story = StoryObj<typeof ColorSelect>;

function DefaultRender(args: React.ComponentProps<typeof ColorSelect>) {
    const [color, setColor] = React.useState(args.value);
    return <ColorSelect {...args} value={color} onValueChange={setColor} />;
}

export const Default: Story = {
    parameters: {
        docs: { description: { story: "Click the button to open the native color picker." } },
    },
    render: (args) => <DefaultRender {...args} />,
};

export const Disabled: Story = {
    parameters: {
        docs: { description: { story: "Disabled — the picker cannot be opened." } },
    },
    args: {
        disabled: true,
    },
};

function ControlledRender() {
    const [color, setColor] = React.useState("#3b82f6");
    return (
        <div className="flex flex-col items-center gap-3">
            <ColorSelect value={color} onValueChange={setColor} />
            <p className="font-mono text-sm">{color}</p>
        </div>
    );
}

export const Controlled: Story = {
    parameters: {
        docs: {
            description: {
                story: "Controlled value — the selected color is reflected in the readout below.",
            },
        },
    },
    render: () => <ControlledRender />,
};

function MultipleSwatchesRender() {
    const [colors, setColors] = React.useState(["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"]);
    const labels = ["Background", "Foreground", "Accent", "Border"];
    return (
        <div className="flex flex-col gap-2">
            {colors.map((color, i) => (
                <div key={labels[i]} className="flex items-center gap-3">
                    <span className="w-24 text-sm">{labels[i]}</span>
                    <ColorSelect
                        value={color}
                        onValueChange={(v) => setColors((prev) => prev.map((c, j) => (j === i ? v : c)))}
                    />
                    <span className="font-mono text-sm">{color}</span>
                </div>
            ))}
        </div>
    );
}

export const MultipleSwatches: Story = {
    parameters: {
        docs: {
            description: {
                story: "Multiple independent color selects — each owns its own state.",
            },
        },
    },
    render: () => <MultipleSwatchesRender />,
};
