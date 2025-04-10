import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { AccountCircle, Login, Logout } from "@mui/icons-material";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";

function makeInitials(name: string): string | null {
    const regExp = new RegExp(/([^()]+)(\([\w ]+\))/);
    const match = regExp.exec(name);

    if (match) {
        const names = match[1].trim().split(" ");
        if (names.length > 1) {
            return names[0].charAt(0) + names[names.length - 1].charAt(0);
        }
    }
    return null;
}

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
            if (userInfo?.avatar_b64str) {
                return (
                    <img
                        src={`data:image/png;base64,${userInfo.avatar_b64str}`}
                        alt="Avatar"
                        className="w-5 h-5 rounded-full mr-1"
                    />
                );
            }
            if (userInfo?.display_name) {
                const initials = makeInitials(userInfo.display_name);
                if (initials) {
                    return (
                        <div className="w-5 h-5 rounded-full bg-slate-300 text-[0.6em] flex items-center justify-center mr-1">
                            {initials}
                        </div>
                    );
                }
            }
            return <AccountCircle className="w-5 h-5 mr-1" />;
        } else if (authState === AuthState.NotLoggedIn) {
            return <Login fontSize="small" className=" mr-1" />;
        } else {
            return <CircularProgress size="medium-small" className="mr-1" />;
        }
    }

    function makeText() {
        if (authState === AuthState.LoggedIn) {
            return userInfo?.display_name || userInfo?.username || "Unknown user";
        } else if (authState === AuthState.NotLoggedIn) {
            return "Sign in";
        } else {
            return "Checking status...";
        }
    }

    let text = makeText();
    if (textRef.current !== null && props.showText) {
        let textWidth = getTextWidthWithFont(text, "Equinor", 1);
        let addDots = false;
        while (textWidth > 150) {
            text = text.slice(0, -1);
            textWidth = getTextWidthWithFont(text + "...", "Equinor", 1);
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
                    "w-full inline-flex items-center min-w-0 px-4 py-2 font-medium rounded-md hover:bg-indigo-100",
                )}
            >
                <span className="flex items-center gap-2" title={makeText()}>
                    {makeIcon()}
                    <span className="overflow-hidden text-ellipsis min-w-0 whitespace-nowrap" ref={textRef}>
                        {props.showText && text}
                    </span>
                </span>
            </MenuButton>
            <Menu anchorOrigin="bottom-start">
                <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" className="mr-2" />
                    Sign out
                </MenuItem>
            </Menu>
        </Dropdown>
    );
};
