import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { Login, Logout } from "@mui/icons-material";

import { postLogout } from "@api";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuItem } from "@lib/components/MenuItem";
import { MenuText } from "@lib/components/MenuText/menuText";
import { Tooltip } from "@lib/components/Tooltip";
import { Avatar } from "@lib/newComponents/Avatar";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { makeInitials } from "@lib/utils/userNames";

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
        window.location.reload();
    }

    function makeIcon() {
        if (authState === AuthState.LoggedIn) {
            return (
                <Avatar
                    size="small"
                    userData={{
                        imageSrc: `data:image/png;base64,${userInfo?.avatar_b64str}`,
                        initials: userInfo?.display_name
                            ? (makeInitials(userInfo?.display_name ?? "") ?? undefined)
                            : undefined,
                    }}
                />
            );
        } else if (authState === AuthState.NotLoggedIn) {
            return <Login fontSize="small" className="mr-1" />;
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
                        "items-center rounded-md p-2 font-medium hover:bg-indigo-100",
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
