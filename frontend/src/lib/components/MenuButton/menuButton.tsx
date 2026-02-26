import React from "react";

import { MenuButton as MuiMenuButton } from "@mui/base/MenuButton";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuButtonProps = {
    label?: string;
    disabled?: boolean;
    children?: React.ReactNode;
};

function MenuButtonComponent(props: MenuButtonProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    return (
        <MuiMenuButton
            {...props}
            ref={ref}
            className={resolveClassNames(
                "p-1 text-sm rounded-sm flex gap-1 items-center text-gray-600",
                "hover:bg-blue-200 hover:text-gray-900",
                "focus:outline focus:outline-blue-600",
                "disabled:pointer-events-none disabled:text-gray-400",
                "[&.Mui-expanded]:bg-blue-300",
            )}
        />
    );
}

export const MenuButton = React.forwardRef(MenuButtonComponent);
