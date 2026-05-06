import type { Meta, StoryObj } from "@storybook/react";

import { ColorTile } from "./index";

const meta: Meta<typeof ColorTile> = {
    title: "Components/ColorTile",
    component: ColorTile,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A small colored square used to represent a color value inline — e.g. inside a
\`ColorSelect\` button or a legend row.

- **\`size\`** controls the tile height (\`small\` = 16px, \`default\` = 20px, \`large\` = 24px).
- **\`interactive\`** adds a hover outline and brightness effect for clickable tiles.
- **\`grouped\`** removes the border-radius for use in a tight row of adjacent swatches.
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        color: { control: "color" },
        size: { control: "select", options: ["small", "default", "large"] },
        interactive: { control: "boolean" },
        grouped: { control: "boolean" },
    },
    args: {
        color: "#3b82f6",
        size: "default",
        interactive: false,
        grouped: false,
    },
};

export default meta;
type Story = StoryObj<typeof ColorTile>;

export const Default: Story = {};

export const Sizes: Story = {
    parameters: {
        docs: { description: { story: "All three size variants side by side." } },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <ColorTile color="#3b82f6" size="small" />
            <ColorTile color="#3b82f6" size="default" />
            <ColorTile color="#3b82f6" size="large" />
        </div>
    ),
};

export const Interactive: Story = {
    parameters: {
        docs: {
            description: { story: "`interactive` adds a hover outline and brightness lift — hover to see the effect." },
        },
    },
    args: {
        interactive: true,
    },
};

export const Grouped: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    "`grouped` removes border-radius so adjacent tiles sit flush against each other. " +
                    "Use this when rendering a palette row.",
            },
        },
    },
    render: () => (
        <div className="flex">
            {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                <ColorTile key={color} color={color} grouped />
            ))}
        </div>
    ),
};

export const Palette: Story = {
    parameters: {
        docs: {
            description: { story: "A grid of swatches across multiple rows." },
        },
    },
    render: () => {
        const rows = [
            ["#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe", "#ddd6fe"],
            ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"],
            ["#991b1b", "#9a3412", "#854d0e", "#166534", "#1e40af", "#5b21b6"],
        ];
        return (
            <div className="flex flex-col">
                {rows.map((row, i) => (
                    <div key={i} className="flex">
                        {row.map((color) => (
                            <ColorTile key={color} color={color} size="large" grouped interactive />
                        ))}
                    </div>
                ))}
            </div>
        );
    },
};
