import type { Meta, StoryObj } from "@storybook/react";

import { ColorPalette } from "@lib/utils/ColorPalette";

import { ColorTile } from "./index";

const { Tile, Group: TileGroup } = ColorTile;

const SAMPLE_PALETTE = new ColorPalette({
    id: "sample",
    name: "Sample",
    colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"],
});

// ─── Tile ────────────────────────────────────────────────────────────────────

const tileMeta: Meta<typeof Tile> = {
    title: "Components/ColorTile/Tile",
    component: Tile,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A small colored square used to represent a color value inline.

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

export default tileMeta;
type TileStory = StoryObj<typeof Tile>;

export const Default: TileStory = {};

export const Sizes: TileStory = {
    parameters: {
        docs: { description: { story: "All three size variants side by side." } },
    },
    render: () => (
        <div className="flex items-center gap-3">
            <Tile color="#3b82f6" size="small" />
            <Tile color="#3b82f6" size="default" />
            <Tile color="#3b82f6" size="large" />
        </div>
    ),
};

export const Interactive: TileStory = {
    parameters: {
        docs: {
            description: { story: "`interactive` adds a hover outline and brightness lift — hover to see the effect." },
        },
    },
    args: {
        interactive: true,
    },
};

export const Grouped: TileStory = {
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
                <Tile key={color} color={color} grouped />
            ))}
        </div>
    ),
};

// ─── Group ───────────────────────────────────────────────────────────────────

export const Group: StoryObj<typeof TileGroup> = {
    parameters: {
        docs: {
            description: {
                story: "Renders all colors of a `ColorPalette` as a flush swatch row (`gap=false`) or a spaced row (`gap=true`).",
            },
        },
    },
    render: () => (
        <div className="flex w-64 flex-col gap-4">
            <TileGroup colorPalette={SAMPLE_PALETTE} />
            <TileGroup colorPalette={SAMPLE_PALETTE} gap />
        </div>
    ),
};
