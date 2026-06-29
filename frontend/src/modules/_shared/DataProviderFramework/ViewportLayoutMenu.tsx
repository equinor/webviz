import type React from "react";

import { GridView, Settings, TableRowsOutlined, ViewColumnOutlined } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Tooltip } from "@lib/components/Tooltip";

import { ViewLayout } from "../enums/viewLayout";

export type ViewportLayoutMenuProps = {
    value: ViewLayout;
    onValueChange: (newValue: ViewLayout) => void;
};

export function ViewportLayoutMenu(props: ViewportLayoutMenuProps): React.ReactNode {
    return (
        <Menu.Root>
            <Tooltip content="View layout settings">
                <Menu.Trigger>
                    <Button iconOnly size="small" variant="ghost" tone="neutral">
                        <Settings fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
            </Tooltip>
            <Menu.Popup>
                <Menu.Group>
                    <Menu.GroupLabel>View layout</Menu.GroupLabel>
                    <Menu.RadioGroup value={props.value} onValueChange={props.onValueChange}>
                        <Menu.RadioItem value={ViewLayout.GRID}>
                            Grid
                            <GridView className="ml-auto" fontSize="small" />
                        </Menu.RadioItem>

                        <Menu.RadioItem value={ViewLayout.HORIZONTAL}>
                            Horizontal
                            <ViewColumnOutlined className="ml-auto" fontSize="small" />
                        </Menu.RadioItem>

                        <Menu.RadioItem value={ViewLayout.VERTICAL}>
                            Vertical
                            <TableRowsOutlined className="ml-auto" fontSize="small" />
                        </Menu.RadioItem>
                    </Menu.RadioGroup>
                </Menu.Group>
            </Menu.Popup>
        </Menu.Root>
    );
}
