import React from "react";

import { Tooltip } from "@equinor/eds-core-react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Button } from "../Button";
import type { ButtonProps } from "../Button/button";

export type NavBarButtonProps = {
    /**
     * The icon rendered on the left side of the text
     */
    icon: React.ReactNode;
    /**
     * An alternate icon to use when the button is in it's "active" state
     */
    activeIcon?: React.ReactNode;
    /**
     * Renders the button in it's active state
     */
    active?: boolean;
    /**
     * Tooltip text
     */
    title?: string;
};

function NavBarButtonComponent(
    props: NavBarButtonProps & ButtonProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { icon, activeIcon, active, ...baseProps } = props;

    let buttonIcon: React.ReactNode;

    if (active && activeIcon) buttonIcon = activeIcon;
    else buttonIcon = icon;

    return (
        <Tooltip title={props.title} placement="right">
            <Button
                {...baseProps}
                ref={ref}
                className={resolveClassNames(
                    "w-full h-10 text-center px-3!",
                    active ? "text-cyan-600" : "text-slate-800!",
                )}
            >
                {buttonIcon}
            </Button>
        </Tooltip>
    );
}

export const NavBarButton = React.forwardRef(NavBarButtonComponent);
