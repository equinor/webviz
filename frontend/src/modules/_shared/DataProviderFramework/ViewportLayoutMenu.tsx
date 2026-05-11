import type React from "react";

import { Settings, TableRowsOutlined, ViewColumnOutlined } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Parts as Menu } from "@lib/components/Menu";

import { ViewLayout } from "../enums/viewLayout";

export type ViewportLayoutMenuProps = {
    value: ViewLayout;
    onValueChange: (newValue: ViewLayout) => void;
};

export function ViewportLayoutMenu(props: ViewportLayoutMenuProps): React.ReactNode {
    return (
        <Menu.Root itemSize="small">
            <Menu.Trigger
                render={
                    <DenseIconButton title="Settings">
                        <Settings fontSize="inherit" />
                    </DenseIconButton>
                }
            />
            <Menu.Popup>
                <Menu.Group>
                    <Menu.GroupLabel>Preferred view layout</Menu.GroupLabel>
                    <Menu.RadioGroup value={props.value} onValueChange={props.onValueChange}>
                        <Menu.RadioItem value={ViewLayout.HORIZONTAL}>
                            <Menu.ItemContent icon={<TableRowsOutlined fontSize="inherit" />} label="Horizontal" />
                        </Menu.RadioItem>

                        <Menu.RadioItem value={ViewLayout.VERTICAL}>
                            <Menu.ItemContent icon={<ViewColumnOutlined fontSize="inherit" />} label="Vertical" />
                        </Menu.RadioItem>
                    </Menu.RadioGroup>
                </Menu.Group>
            </Menu.Popup>
        </Menu.Root>
    );
}
