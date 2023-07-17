import React from "react";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

export const LoginDialog: React.FC = () => {
    const auth = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    if (auth.authState === AuthState.NotLoggedIn) {
        return (
            <Dialog title="Sign in" open modal actions={<Button onClick={signIn}>Sign in</Button>}>
                You have to sign in in order to use this application.
            </Dialog>
        );
    } else {
        return null;
    }
};
