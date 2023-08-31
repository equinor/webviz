import React from "react";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { ArrowLeftOnRectangleIcon, ArrowRightOnRectangleIcon, UserIcon } from "@heroicons/react/20/solid";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidth } from "@lib/utils/textSize";
import { Dropdown, MenuButton } from "@mui/base";

export type LoginButtonProps = {
    className?: string;
    showText?: boolean;
    title?: string;
};

export const LoginButton: React.FC<LoginButtonProps> = (props) => {
    const textRef = React.useRef<HTMLSpanElement>(null);

    const { authState, userInfo } = useAuthProvider();

    function handleLogout() {
        window.alert("Sign out not implemented in backend yet.");
        /*
        window.location.href = "/api/logout";
        */
    }

    function makeIcon() {
        if (authState === AuthState.LoggedIn) {
            return <UserIcon className="w-5 h-5 mr-1" />;
        } else if (authState === AuthState.NotLoggedIn) {
            return <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />;
        } else {
            return <CircularProgress size="medium-small" className="mr-1" />;
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
        <Dropdown>
            <MenuButton
                className={resolveClassNames(
                    props.className ?? "",
                    "w-full inline-flex items-center min-w-0 px-4 py-2 font-medium rounded-md hover:bg-indigo-100"
                )}
            >
                <span
                    className="flex items-center gap-2"
                    title={authState === AuthState.LoggedIn ? `Signed in as ${userInfo?.username}` : "Sign in"}
                >
                    {makeIcon()}
                    <span className="overflow-hidden text-ellipsis min-w-0 whitespace-nowrap" ref={textRef}>
                        {props.showText && text}
                    </span>
                </span>
            </MenuButton>
            <Menu anchorOrigin="bottom-start">
                <MenuItem onClick={handleLogout}>
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Sign out
                </MenuItem>
            </Menu>
        </Dropdown>
    );
};
