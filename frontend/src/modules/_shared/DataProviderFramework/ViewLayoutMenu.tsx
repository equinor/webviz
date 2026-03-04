import type React from "react";

import { Settings, TableRowsOutlined, ViewColumnOutlined } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu/next/composedMenu";

import { ViewLayout } from "../enums/viewLayout";

export type ViewportLayoutMenuProps = {
    value: ViewLayout;
    onValueChange: (newValue: ViewLayout) => void;
};

export function ViewportLayoutMenu(props: ViewportLayoutMenuProps): React.ReactNode {
    function handleMenuItemClick(itemId: string) {
        if (!Object.values(ViewLayout).includes(itemId as ViewLayout)) {
            // throw new Error(`Invalid view layout: ${itemId}`);
            console.warn(`Invalid view layout: ${itemId}`);
            return;
        }

        props.onValueChange(itemId as ViewLayout);
    }

    return (
        <Menu
            side="bottom"
            align="center"
            flat
            closeOnClick
            onActionClicked={handleMenuItemClick}
            items={[
                {
                    id: "layout",
                    label: "Preferred view layout",
                    items: [
                        {
                            id: ViewLayout.HORIZONTAL,
                            label: "Horizontal",
                            checked: props.value === ViewLayout.HORIZONTAL,
                            icon: <ViewColumnOutlined fontSize="inherit" />,
                        },
                        {
                            id: ViewLayout.VERTICAL,
                            label: "Vertical",
                            checked: props.value === ViewLayout.VERTICAL,
                            icon: <TableRowsOutlined fontSize="inherit" />,
                        },
                    ],
                },
            ]}
        >
            <span title="Settings">
                <Settings fontSize="inherit" />
            </span>
        </Menu>
    );
}
