import type React from "react";

import type { MenuItemProps as MuiMenuItemProps } from "@mui/base";
import { MenuItem as MuiMenuItem } from "@mui/base";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuItemProps = MuiMenuItemProps;

export const MenuItem: React.FC<MenuItemProps> = (props) => {
    return (
        <MuiMenuItem
            {...props}
            slotProps={{
                root: {
                    className: resolveClassNames("hover:bg-blue-100 cursor-pointer flex items-center gap-2 py-2 px-4", {
                        "opacity-30 pointer-events-none": props.disabled,
                    }),
                },
            }}
        />
    );
};

MenuItem.displayName = "MenuItem";
