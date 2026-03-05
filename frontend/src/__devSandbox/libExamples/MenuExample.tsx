import type React from "react";

import { Add, FolderOpen, Save, Download, Settings, Help, MoreVert } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu";
import type { MenuItem, MenuProps } from "@lib/components/Menu";

export type MenuExampleProps = Partial<MenuProps>;

const ExampleItems: MenuItem[] = [
    {
        id: "new",
        label: "New",
        icon: <Add fontSize="inherit" />,
    },
    {
        id: "open",
        label: "Open",
        icon: <FolderOpen fontSize="inherit" />,
    },

    {
        id: "save",
        label: "Save",
        icon: <Save fontSize="inherit" />,
    },
    { type: "divider" },
    {
        id: "export",
        label: "Export",
        icon: <Download fontSize="inherit" />,
        items: [
            {
                id: "export-pdf",
                label: "Export as PDF",
                description: "Export the current document as a PDF file.",
            },
            {
                id: "export-png",
                label: "Export as PNG",
                description: "Export the current document as a PNG image.",
            },
            {
                id: "export-csv",
                label: "Export as CSV",
                description: "Export the current document as a CSV file.",
            },
        ],
    },
    { type: "divider" },
    {
        id: "settings",
        label: "Settings",
        icon: <Settings fontSize="inherit" />,
        disabled: true,
    },
    {
        id: "help",
        label: "Help",
        icon: <Help fontSize="inherit" />,
    },
    { type: "divider" },
    {
        id: "textstuff",
        label: "text sizes example",
        items: [
            { type: "text", text: "extra-small", size: "extra-small" },
            { type: "text", text: "small", size: "small" },
            { type: "text", text: "medium-small", size: "medium-small" },
            { type: "text", text: "medium", size: "medium" },
            { type: "text", text: "large", size: "large" },
        ],
    },
    { type: "divider" },
    {
        id: "deep-nest",
        label: "Deeply nested submenu",
        items: [
            {
                id: "deep-nest",
                label: "Deeply nested submenu",
                items: [
                    {
                        id: "deep-nest",
                        label: "Deeply nested submenu",
                        items: [
                            {
                                id: "deep-nest",
                                label: "Deeply nested submenu",
                                items: [{ type: "text", text: "Hello there" }],
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

export function MenuExample(props: MenuExampleProps): React.ReactNode {
    return (
        <section>
            <div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-2 items-center w-fit">
                <p>Basic menu</p>
                <Menu {...props} items={ExampleItems}>
                    Options <MoreVert fontSize="inherit" />
                </Menu>

                <p>Flat menu</p>
                <Menu {...props} items={ExampleItems} flat>
                    Options <MoreVert fontSize="inherit" />
                </Menu>
            </div>
        </section>
    );
}
