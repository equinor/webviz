import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";
import type { SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuSeparatorProps = ComponentWrapperProps<SeparatorBaseProps>;

export const Separator = React.forwardRef<HTMLDivElement, MenuSeparatorProps>(function Separator(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return (
        <BaseMenu.Separator
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__separator", baseProps.className)}
        />
    );
});
