import React from "react";

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
     * Collapses the button (rendering only the icon)
     */
    collapsed?: boolean;
    /**
     * Renders the button in it's active state
     */
    active?: boolean;
    /**
     * Text shown next to the button
     */
    text?: string;
    /**
     * Tooltip text
     */
    title?: string;
};

function NavBarButtonComponent(
    props: NavBarButtonProps & ButtonProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { icon, activeIcon, text, collapsed, active, ...baseProps } = props;

    let buttonIcon: React.ReactNode;

    if (active && activeIcon) buttonIcon = activeIcon;
    else buttonIcon = icon;

    return (
        <Button
            {...baseProps}
            ref={ref}
            className={resolveClassNames("w-full", "h-10", active ? "text-cyan-600" : "text-slate-800!")}
        >
            {buttonIcon}
            {!collapsed && <span className="ml-2">{text}</span>}
        </Button>
    );
}

export const NavBarButton = React.forwardRef(NavBarButtonComponent);
