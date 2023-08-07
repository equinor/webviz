import React from "react";

import { Menu as MuiMenu, MenuProps as MuiMenuProps, PopperPlacementType } from "@mui/base";

export type MenuProps = {
    anchorOrigin?: PopperPlacementType;
} & MuiMenuProps;

export const Menu: React.FC<MenuProps> = (props) => {
    const { anchorOrigin, ...rest } = props;
    return (
        <MuiMenu
            slotProps={{
                root: {
                    className: "bg-white shadow-md z-50 border border-gray-200 py-2 rounded transition-opacity",
                    placement: anchorOrigin,
                },
            }}
            {...rest}
        />
    );
};

Menu.displayName = "Menu";
