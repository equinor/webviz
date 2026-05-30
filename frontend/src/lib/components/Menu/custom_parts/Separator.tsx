import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";

function MenuSeparatorComponent(
    props: BaseMenu.Separator.Props,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    return <BaseMenu.Separator {...props} ref={ref} className="h-px bg-gray-200 my-1" />;
}

export const MenuSeparator = React.forwardRef(MenuSeparatorComponent);
