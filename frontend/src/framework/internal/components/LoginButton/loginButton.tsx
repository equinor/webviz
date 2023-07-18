import React from "react";

import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { UserIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";

export const LoginButton: React.FC = () => {
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
        <Button onClick={handleLoginOrLogout} startIcon={<UserIcon className="w-5 h-5" />}>
            {authState === "LoggedIn" ? `${userInfo?.username} - Logout` : "Login"}
        </Button>
    );
};
