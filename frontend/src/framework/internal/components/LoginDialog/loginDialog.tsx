import React from "react";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";

export const LoginDialog: React.FC = () => {
    const auth = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    if (auth.authState !== AuthState.LoggedIn) {
        return (
            <Dialog
                title="Sign in"
                open
                modal
                actions={
                    <Button onClick={signIn} disabled={auth.authState !== AuthState.NotLoggedIn}>
                        {auth.authState === AuthState.NotLoggedIn ? "Sign in" : <CircularProgress size="medium" />}
                    </Button>
                }
            >
                You have to sign in in order to use this application.
            </Dialog>
        );
    } else {
        return null;
    }
};
