import React from "react";

import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { UserIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";

export type LoginButtonProps = {
    className?: string;
    showText?: boolean;
    title?: string;
};

export const LoginButton: React.FC<LoginButtonProps> = (props) => {
    const { authState, userInfo } = useAuthProvider();
    const handleLoginOrLogout = () => {
        if (authState === "LoggedIn") {
            window.location.href = "/api/logout";
            return;
        } else {
            window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
        }
    };

    return (
        <Button
            onClick={handleLoginOrLogout}
            startIcon={<UserIcon className="w-5 h-5 mr-2" />}
            className={props.className}
            title={authState === "LoggedIn" ? `Signed in as ${userInfo?.username}` : "Sign out"}
        >
            {props.showText ? (authState === "LoggedIn" ? "Sign out" : "Sign in") : ""}
        </Button>
    );
};
