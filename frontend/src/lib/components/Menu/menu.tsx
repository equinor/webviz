import type React from "react";

import type { MenuProps as MuiMenuProps, PopupOwnProps as MuiPopupOwnProps } from "@mui/base";
import { Menu as MuiMenu } from "@mui/base";

export type MenuProps = {
    anchorOrigin?: MuiPopupOwnProps["placement"];
} & MuiMenuProps;

export const Menu: React.FC<MenuProps> = (props) => {
    const { anchorOrigin, ...rest } = props;
    return (
        <MuiMenu
            slotProps={{
                root: {
                    className: "bg-white shadow-md z-50 border border-gray-200 py-2 rounded-sm transition-opacity",
                    placement: anchorOrigin,
                },
            }}
            {...rest}
        />
    );
};

Menu.displayName = "Menu";
