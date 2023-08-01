import React from "react";

import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import {
    ArrowLeftOnRectangleIcon,
    ArrowRightOnRectangleIcon,
    CheckIcon,
    UserIcon,
    XMarkIcon,
} from "@heroicons/react/20/solid";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";

export type LoginButtonProps = {
    className?: string;
    showText?: boolean;
    title?: string;
};

export const LoginButton: React.FC<LoginButtonProps> = (props) => {
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

    const { authState, userInfo } = useAuthProvider();

    function handleLogout() {
        window.location.href = "/api/logout";
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

    return (
        <>
            <Button
                onClick={handleButtonClick}
                startIcon={
                    <Badge
                        className="mr-1"
                        badgeContent={
                            authState === "LoggedIn" ? (
                                <CheckIcon className="w-3 h-3" />
                            ) : (
                                <XMarkIcon className="w-3 h-3" />
                            )
                        }
                        color={authState === "LoggedIn" ? "bg-green-600" : "bg-red-600"}
                    >
                        {authState === "LoggedIn" ? (
                            <UserIcon className="w-5 h-5 mr-1" />
                        ) : (
                            <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />
                        )}
                    </Badge>
                }
                className={props.className}
                title={authState === "LoggedIn" ? `Signed in as ${userInfo?.username}` : "Sign out"}
            >
                {props.showText ? (authState === "LoggedIn" ? "My account" : "Sign in") : ""}
            </Button>
            <Menu open={menuOpen} onOpenChange={handleMenuClose} anchorEl={menuAnchor} anchorOrigin="right-start">
                <MenuItem onClick={handleLogout}>
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Sign out
                </MenuItem>
            </Menu>
        </>
    );
};
