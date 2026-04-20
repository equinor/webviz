import React from "react";

import { Login, Logout } from "@mui/icons-material";

import { postLogout } from "@api";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Avatar } from "@lib/newComponents/Avatar";
import { Button } from "@lib/newComponents/Button";
import { Popover } from "@lib/newComponents/Popover";
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
                    size={24}
                    userData={{
                        imageSrc: `data:image/png;base64,${userInfo?.avatar_b64str}`,
                        initials: userInfo?.display_name
                            ? (makeInitials(userInfo?.display_name ?? "") ?? undefined)
                            : undefined,
                    }}
                />
            );
        } else if (authState === AuthState.NotLoggedIn) {
            return <Login fontSize="small" />;
        } else {
            return <CircularProgress size="medium-small" />;
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
        <Popover.Root>
            <Popover.Trigger variant="text" tone="neutral" iconOnly>
                {makeIcon()}
            </Popover.Trigger>
            <Popover.Popup>
                <div className="flex flex-col">
                    <Popover.Title fontSize="sm" hideCloseButton>
                        {text}
                    </Popover.Title>
                    <Button variant="text" tone="neutral" onClick={handleLogout}>
                        <Logout fontSize="inherit" />
                        Sign out
                    </Button>
                </div>
            </Popover.Popup>
        </Popover.Root>
    );
};
