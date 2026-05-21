import type React from "react";

import { GridView, Settings, TableRowsOutlined, ViewColumnOutlined } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { Menu } from "@lib/newComponents/Menu";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

import { ViewLayout } from "../enums/viewLayout";

export type ViewportLayoutMenuProps = {
    value: ViewLayout;
    onValueChange: (newValue: ViewLayout) => void;
};

export function ViewportLayoutMenu(props: ViewportLayoutMenuProps): React.ReactNode {
    return (
        <Menu.Root>
            <TooltipCompositions.Default content="View layout settings">
                <Menu.Trigger>
                    <Button iconOnly size="small" variant="text">
                        <Settings fontSize="inherit" />
                    </Button>
                </Menu.Trigger>
            </TooltipCompositions.Default>
            <Menu.Popup>
                <Menu.Group>
                    <Menu.GroupLabel>Preferred view layout</Menu.GroupLabel>
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
