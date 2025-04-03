import type React from "react";

import { MenuButton as MuiMenuButton } from "@mui/base/MenuButton";

export type MenuButtonProps = {
    ref?: React.Ref<HTMLButtonElement>;
    label?: string;
    disabled?: boolean;
    children?: React.ReactNode;
};

export function MenuButton(props: MenuButtonProps): React.ReactNode {
    return (
        <MuiMenuButton
            {...props}
            className="hover:bg-blue-200 focus:outline-blue-600 p-1 text-sm rounded-sm flex gap-1 items-center focus:outline focus:outline-1 hover:text-gray-900 text-gray-600"
        />
    );
}
