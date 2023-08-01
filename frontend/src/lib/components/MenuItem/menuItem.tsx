import React from "react";

import { MenuItem as MuiMenuItem, MenuItemProps as MuiMenuItemProps } from "@mui/base";

export type MenuItemProps = MuiMenuItemProps;

export const MenuItem: React.FC<MenuItemProps> = (props) => {
    return (
        <MuiMenuItem
            {...props}
            slotProps={{
                root: {
                    className: "hover:bg-blue-100 cursor-pointer flex items-center gap-2 py-2 px-4 text-sm",
                },
            }}
        />
    );
};
