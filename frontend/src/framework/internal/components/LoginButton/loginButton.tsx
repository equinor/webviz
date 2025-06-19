import React from "react";

import { Tooltip } from "@equinor/eds-core-react";
import { Dropdown, MenuButton } from "@mui/base";
import { AccountCircle, Login, Logout } from "@mui/icons-material";

import { postLogout } from "@api";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuItem } from "@lib/components/MenuItem";
import { MenuText } from "@lib/components/MenuText/menuText";
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

    async function handleLogout() {
        console.debug("Logging out...");
        await postLogout();
        console.debug("Redirecting to login screen...");
        window.location.href = "/";
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
            <Tooltip title={makeText()} placement="bottom">
                <MenuButton
                    className={resolveClassNames(
                        props.className ?? "",
                        "items-center p-2 font-medium rounded-md hover:bg-indigo-100",
                    )}
                >
                    {makeIcon()}
                </MenuButton>
            </Tooltip>
            <Menu anchorOrigin="bottom-start">
                <MenuText>{text}</MenuText>
                <MenuDivider />
                <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" className="mr-2" />
                    Sign out
                </MenuItem>
            </Menu>
        </Dropdown>
    );
};
