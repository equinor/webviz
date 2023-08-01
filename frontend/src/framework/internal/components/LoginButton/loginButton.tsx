import React from "react";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon, UserIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { getTextWidth } from "@lib/utils/textSize";

export type LoginButtonProps = {
    className?: string;
    showText?: boolean;
    title?: string;
};

export const LoginButton: React.FC<LoginButtonProps> = (props) => {
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
    const textRef = React.useRef<HTMLSpanElement>(null);

    const { authState, userInfo } = useAuthProvider();

    function handleLogout() {
        window.alert("Sign out not implemented in backend yet.");
        /*
        window.location.href = "/api/logout";
        */
    }

    function handleMenuOpen(e: React.MouseEvent<HTMLElement>) {
        setMenuAnchor(e.currentTarget);
        setMenuOpen(true);
    }

    function handleButtonClick(e: React.MouseEvent<HTMLElement>) {
        if (authState === "LoggedIn") {
            handleMenuOpen(e);
        } else {
            window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
        }
    }

    function handleMenuClose(open: boolean) {
        if (!open) {
            setMenuOpen(false);
            setMenuAnchor(null);
        }
    }

    function makeIcon() {
        if (authState === AuthState.LoggedIn) {
            return <UserIcon className="w-5 h-5 mr-1" />;
        } else if (authState === AuthState.NotLoggedIn) {
            return <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />;
        } else {
            return <CircularProgress size="medium-small" />;
        }
    }

    function makeText() {
        if (authState === AuthState.LoggedIn) {
            return userInfo?.username || "Unknown user";
        } else if (authState === AuthState.NotLoggedIn) {
            return "Sign in";
        } else {
            return "Checking status...";
        }
    }

    let text = makeText();
    if (textRef.current !== null && props.showText) {
        let textWidth = getTextWidth(text, textRef.current);
        let addDots = false;
        while (textWidth > 150) {
            text = text.slice(0, -1);
            textWidth = getTextWidth(text + "...", textRef.current);
            addDots = true;
        }
        if (addDots) {
            text += "...";
        }
    }

    return (
        <>
            <Button
                onClick={handleButtonClick}
                className={props.className}
                title={authState === AuthState.LoggedIn ? `Signed in as ${userInfo?.username}` : "Sign in"}
            >
                <span className="flex items-center gap-2 min-w-0">
                    {makeIcon()}
                    <span className="overflow-hidden text-ellipsis min-w-0 whitespace-nowrap" ref={textRef}>
                        {props.showText && text}
                    </span>
                </span>
            </Button>
            <Menu open={menuOpen} onOpenChange={handleMenuClose} anchorEl={menuAnchor} anchorOrigin="bottom-start">
                <MenuItem onClick={handleLogout}>
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Sign out
                </MenuItem>
            </Menu>
        </>
    );
};
