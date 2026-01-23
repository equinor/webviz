import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuItem } from "@lib/components/MenuItem";
import { Dropdown } from "@mui/base";
import { Settings } from "@mui/icons-material";
import React from "react";

export type PerformanceSettingsPopoverProps = {};

export function PerformanceSettingsPopover(props: PerformanceSettingsPopoverProps): React.ReactNode {
    const [open, setOpen] = React.useState<boolean>(false);

    const handleOpenChange = React.useCallback(function () {
        setOpen((prevOpen) => !prevOpen);
    }, []);

    return (
        <Dropdown open={open} onOpenChange={handleOpenChange}>
            <MenuButton>
                <Settings fontSize="inherit" />
            </MenuButton>
            <Menu anchorOrigin="bottom-end">
                <MenuItem>Low</MenuItem>
            </Menu>
        </Dropdown>
    );
}
