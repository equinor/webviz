import React from "react";

import { Menu as BaseMenu } from "@base-ui/react";
import type { SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuSeparatorProps = ComponentWrapperProps<SeparatorBaseProps>;

function SeparatorComponent(props: MenuSeparatorProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return (
        <BaseMenu.Separator
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__separator", props.layoutClassName)}
        />
    );
}

export const Separator = React.forwardRef(SeparatorComponent);
