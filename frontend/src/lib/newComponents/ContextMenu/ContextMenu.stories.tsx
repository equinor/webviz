import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { ContextMenu } from "./index";

const meta: Meta = {
    title: "Components/ContextMenu",
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
The \`ContextMenu\` is a compound component that appears at the pointer on right-click or long press.

## Sub-components

| Component | Description |
|---|---|
| \`ContextMenu.Root\` | State container. Wraps the trigger and menu together. |
| \`ContextMenu.Trigger\` | Marks the right-click zone. Pass your existing element via \`render\` to merge behavior without a wrapper div. |
| \`ContextMenu.Menu\` | The popup panel (Portal + Positioner + Popup). Place items inside. |
| \`ContextMenu.Item\` | A standard interactive menu item. |
| \`ContextMenu.CheckboxItem\` | A toggle-style item with checked/unchecked state. |
| \`ContextMenu.RadioGroup\` | Groups \`RadioItem\` children and manages their selected value. |
| \`ContextMenu.RadioItem\` | A radio-style item — only one can be selected within a \`RadioGroup\`. |
| \`ContextMenu.Group\` | Semantically groups related items for accessibility. |
| \`ContextMenu.Separator\` | A horizontal divider between groups of items. |
| \`ContextMenu.Submenu\` | Opens a nested menu from a parent item. |

## Composition

The trigger area is typically an **existing component** — a canvas, a list row, a panel.
Pass it via \`render\` on \`Trigger\` so the right-click handler is merged in without an extra wrapper div.
Menu items can be dynamic, driven by what was under the cursor when the user right-clicked.

\`\`\`tsx
<ContextMenu.Root>
    <ContextMenu.Trigger render={<MyCanvas onContextMenu={handleRightClick} />} />
    <ContextMenu.Menu>
        {selectedNode
            ? <ContextMenu.Item>Edit Node</ContextMenu.Item>
            : <ContextMenu.Item>Add Node Here</ContextMenu.Item>
        }
    </ContextMenu.Menu>
</ContextMenu.Root>
\`\`\`
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RightClickZone({ label = "Right-click here" }: { label?: string }) {
    return (
        <div className="w-80 h-40 flex items-center justify-center rounded border-2 border-dashed border-neutral-400 text-neutral-500 select-none text-sm">
            {label}
        </div>
    );
}

// ─── Sub-component stories ────────────────────────────────────────────────────

export const SubItem: Story = {
    name: "Sub-component: Item",
    parameters: {
        docs: {
            description: {
                story: "A standard `ContextMenu.Item`. Right-click the zone to open the menu.",
            },
        },
    },
    render: () => (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                <RightClickZone />
            </ContextMenu.Trigger>
            <ContextMenu.Menu>
                <ContextMenu.Item>Cut</ContextMenu.Item>
                <ContextMenu.Item>Copy</ContextMenu.Item>
                <ContextMenu.Item>Paste</ContextMenu.Item>
            </ContextMenu.Menu>
        </ContextMenu.Root>
    ),
};

export const SubItemDisabled: Story = {
    name: "Sub-component: Item (disabled)",
    parameters: {
        docs: {
            description: {
                story: "Pass `disabled` to prevent interaction. Disabled items are visible but not selectable.",
            },
        },
    },
    render: () => (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                <RightClickZone />
            </ContextMenu.Trigger>
            <ContextMenu.Menu>
                <ContextMenu.Item>Cut</ContextMenu.Item>
                <ContextMenu.Item>Copy</ContextMenu.Item>
                <ContextMenu.Item disabled>Paste</ContextMenu.Item>
            </ContextMenu.Menu>
        </ContextMenu.Root>
    ),
};

export const SubSeparator: Story = {
    name: "Sub-component: Separator",
    parameters: {
        docs: {
            description: {
                story: "`ContextMenu.Separator` draws a horizontal rule between logical groups of items.",
            },
        },
    },
    render: () => (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                <RightClickZone />
            </ContextMenu.Trigger>
            <ContextMenu.Menu>
                <ContextMenu.Item>Cut</ContextMenu.Item>
                <ContextMenu.Item>Copy</ContextMenu.Item>
                <ContextMenu.Item>Paste</ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item>Select All</ContextMenu.Item>
            </ContextMenu.Menu>
        </ContextMenu.Root>
    ),
};

export const SubGroup: Story = {
    name: "Sub-component: Group",
    parameters: {
        docs: {
            description: {
                story: "`ContextMenu.Group` semantically groups related items for accessibility.",
            },
        },
    },
    render: () => (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                <RightClickZone />
            </ContextMenu.Trigger>
            <ContextMenu.Menu>
                <ContextMenu.Group>
                    <ContextMenu.Item>Cut</ContextMenu.Item>
                    <ContextMenu.Item>Copy</ContextMenu.Item>
                    <ContextMenu.Item>Paste</ContextMenu.Item>
                </ContextMenu.Group>
                <ContextMenu.Separator />
                <ContextMenu.Group>
                    <ContextMenu.Item>Select All</ContextMenu.Item>
                    <ContextMenu.Item>Deselect All</ContextMenu.Item>
                </ContextMenu.Group>
            </ContextMenu.Menu>
        </ContextMenu.Root>
    ),
};

export const SubCheckboxItem: Story = {
    name: "Sub-component: CheckboxItem",
    parameters: {
        docs: {
            description: {
                story: "`ContextMenu.CheckboxItem` is a toggle item. The menu stays open on click by default so multiple toggles can be changed in one interaction.",
            },
        },
    },
    render: () => {
        const [showGrid, setShowGrid] = React.useState(false);
        const [snapToGrid, setSnapToGrid] = React.useState(true);
        const [showRulers, setShowRulers] = React.useState(false);
        return (
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <RightClickZone />
                </ContextMenu.Trigger>
                <ContextMenu.Menu>
                    <ContextMenu.CheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
                        Show Grid
                    </ContextMenu.CheckboxItem>
                    <ContextMenu.CheckboxItem checked={snapToGrid} onCheckedChange={setSnapToGrid}>
                        Snap to Grid
                    </ContextMenu.CheckboxItem>
                    <ContextMenu.CheckboxItem checked={showRulers} onCheckedChange={setShowRulers}>
                        Show Rulers
                    </ContextMenu.CheckboxItem>
                </ContextMenu.Menu>
            </ContextMenu.Root>
        );
    },
};

export const SubRadioGroup: Story = {
    name: "Sub-component: RadioGroup & RadioItem",
    parameters: {
        docs: {
            description: {
                story: "Wrap `ContextMenu.RadioItem` in `ContextMenu.RadioGroup` to enforce single selection. The menu stays open on click by default.",
            },
        },
    },
    render: () => {
        const [zoom, setZoom] = React.useState("100");
        return (
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <RightClickZone />
                </ContextMenu.Trigger>
                <ContextMenu.Menu>
                    <ContextMenu.RadioGroup value={zoom} onValueChange={setZoom}>
                        <ContextMenu.RadioItem value="50">50%</ContextMenu.RadioItem>
                        <ContextMenu.RadioItem value="100">100%</ContextMenu.RadioItem>
                        <ContextMenu.RadioItem value="150">150%</ContextMenu.RadioItem>
                        <ContextMenu.RadioItem value="200">200%</ContextMenu.RadioItem>
                    </ContextMenu.RadioGroup>
                </ContextMenu.Menu>
            </ContextMenu.Root>
        );
    },
};

export const SubSubmenu: Story = {
    name: "Sub-component: Submenu",
    parameters: {
        docs: {
            description: {
                story: "`ContextMenu.Submenu` nests a menu inside an item. Hover or arrow-key into it to open the nested panel.",
            },
        },
    },
    render: () => (
        <ContextMenu.Root>
            <ContextMenu.Trigger>
                <RightClickZone />
            </ContextMenu.Trigger>
            <ContextMenu.Menu>
                <ContextMenu.Item>Cut</ContextMenu.Item>
                <ContextMenu.Item>Copy</ContextMenu.Item>
                <ContextMenu.Item>Paste</ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Submenu>
                    <ContextMenu.Item>Email</ContextMenu.Item>
                    <ContextMenu.Item>Slack</ContextMenu.Item>
                    <ContextMenu.Item>Copy Link</ContextMenu.Item>
                </ContextMenu.Submenu>
            </ContextMenu.Menu>
        </ContextMenu.Root>
    ),
};

// ─── Composition stories ──────────────────────────────────────────────────────

export const DynamicItems: Story = {
    parameters: {
        docs: {
            description: {
                story: "The primary use case: a large area is the trigger and the menu items change based on what was under the cursor. Click a node first, then right-click the canvas.",
            },
        },
    },
    render: () => {
        const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

        const nodes = ["Node A", "Node B", "Node C"];

        return (
            <ContextMenu.Root>
                <ContextMenu.Trigger
                    render={
                        <div className="w-80 h-48 rounded border border-neutral-300 relative select-none">
                            {nodes.map((node, i) => (
                                <button
                                    key={node}
                                    className={[
                                        "absolute px-3 py-1 rounded text-sm border",
                                        selectedNode === node
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-neutral-300 bg-white text-neutral-700",
                                    ].join(" ")}
                                    style={{ top: 16 + i * 44, left: 16 + i * 48 }}
                                    onMouseDown={() => setSelectedNode(node)}
                                    onContextMenu={() => setSelectedNode(node)}
                                >
                                    {node}
                                </button>
                            ))}
                            <span className="absolute bottom-2 right-3 text-xs text-neutral-400">
                                {selectedNode ? `Selected: ${selectedNode}` : "Right-click a node or the canvas"}
                            </span>
                        </div>
                    }
                />
                <ContextMenu.Menu>
                    {selectedNode ? (
                        <>
                            <ContextMenu.Item onClick={() => alert(`Rename ${selectedNode}`)}>
                                Rename {selectedNode}
                            </ContextMenu.Item>
                            <ContextMenu.Item onClick={() => alert(`Duplicate ${selectedNode}`)}>
                                Duplicate
                            </ContextMenu.Item>
                            <ContextMenu.Separator />
                            <ContextMenu.Item onClick={() => setSelectedNode(null)}>
                                Delete {selectedNode}
                            </ContextMenu.Item>
                        </>
                    ) : (
                        <>
                            <ContextMenu.Item onClick={() => alert("Add node")}>Add Node</ContextMenu.Item>
                            <ContextMenu.Item onClick={() => alert("Paste")}>Paste</ContextMenu.Item>
                            <ContextMenu.Separator />
                            <ContextMenu.Item onClick={() => alert("Select all")}>Select All</ContextMenu.Item>
                        </>
                    )}
                </ContextMenu.Menu>
            </ContextMenu.Root>
        );
    },
};

export const FileExplorer: Story = {
    parameters: {
        docs: {
            description: {
                story: "A file explorer context menu combining groups, separators, checkboxes, and a submenu.",
            },
        },
    },
    render: () => {
        const [showHidden, setShowHidden] = React.useState(false);
        const [showExtensions, setShowExtensions] = React.useState(true);
        return (
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <RightClickZone label="Right-click a file" />
                </ContextMenu.Trigger>
                <ContextMenu.Menu>
                    <ContextMenu.Item>Open</ContextMenu.Item>
                    <ContextMenu.Item>Open With…</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Submenu>
                        <ContextMenu.Item>Desktop (shortcut)</ContextMenu.Item>
                        <ContextMenu.Item>Mail Recipient</ContextMenu.Item>
                        <ContextMenu.Item>Compressed Folder</ContextMenu.Item>
                    </ContextMenu.Submenu>
                    <ContextMenu.Separator />
                    <ContextMenu.Item>Cut</ContextMenu.Item>
                    <ContextMenu.Item>Copy</ContextMenu.Item>
                    <ContextMenu.Item>Paste</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.CheckboxItem checked={showHidden} onCheckedChange={setShowHidden}>
                        Show Hidden Files
                    </ContextMenu.CheckboxItem>
                    <ContextMenu.CheckboxItem checked={showExtensions} onCheckedChange={setShowExtensions}>
                        Show Extensions
                    </ContextMenu.CheckboxItem>
                    <ContextMenu.Separator />
                    <ContextMenu.Item>Rename</ContextMenu.Item>
                    <ContextMenu.Item>Delete</ContextMenu.Item>
                </ContextMenu.Menu>
            </ContextMenu.Root>
        );
    },
};

export const TextEditor: Story = {
    parameters: {
        docs: {
            description: {
                story: "A text editor context menu with clipboard actions, zoom selection via radio items, and view toggles via checkboxes.",
            },
        },
    },
    render: () => {
        const [zoom, setZoom] = React.useState("100");
        const [wordWrap, setWordWrap] = React.useState(true);
        const [lineNumbers, setLineNumbers] = React.useState(true);
        return (
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <RightClickZone label="Right-click to open editor menu" />
                </ContextMenu.Trigger>
                <ContextMenu.Menu>
                    <ContextMenu.Group>
                        <ContextMenu.Item>Cut</ContextMenu.Item>
                        <ContextMenu.Item>Copy</ContextMenu.Item>
                        <ContextMenu.Item>Paste</ContextMenu.Item>
                    </ContextMenu.Group>
                    <ContextMenu.Separator />
                    <ContextMenu.RadioGroup value={zoom} onValueChange={setZoom}>
                        {["75", "100", "125", "150"].map((level) => (
                            <ContextMenu.RadioItem key={level} value={level}>
                                {level}%
                            </ContextMenu.RadioItem>
                        ))}
                    </ContextMenu.RadioGroup>
                    <ContextMenu.Separator />
                    <ContextMenu.CheckboxItem checked={wordWrap} onCheckedChange={setWordWrap}>
                        Word Wrap
                    </ContextMenu.CheckboxItem>
                    <ContextMenu.CheckboxItem checked={lineNumbers} onCheckedChange={setLineNumbers}>
                        Line Numbers
                    </ContextMenu.CheckboxItem>
                </ContextMenu.Menu>
            </ContextMenu.Root>
        );
    },
};
