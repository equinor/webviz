import React from "react";

import WebvizLogo from "@assets/webviz.svg";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";

export type StartScreenProps = {
    children?: React.ReactNode;
};

export const StartScreen: React.FC<StartScreenProps> = (props) => {
    const { authState } = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    if (authState === AuthState.Loading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center gap-8">
                <CircularProgress />
            </div>
        );
    }

    if (authState === AuthState.NotLoggedIn) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center gap-8">
                <img src={WebvizLogo} alt="Webviz logo" className="w-32 h-32" />
                <p className="text-lg">Please sign in to continue.</p>
                <Button onClick={signIn}>Sign in</Button>
            </div>
        );
    }

    return <>{props.children}</>;
};

StartScreen.displayName = "StartScreen";
