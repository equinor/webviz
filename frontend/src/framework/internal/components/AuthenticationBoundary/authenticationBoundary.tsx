import { FmuAnimatedLogo } from "@assets/FmuAnimatedLogo";
import { FmuLogo } from "@assets/FmuLogo";

import { AuthState, AuthStateStore } from "@framework/internal/auth/AuthStateStore";
import { useAuthState } from "@framework/internal/auth/hooks";
import { Button } from "@lib/components/Button";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DataSharingLabel } from "./private-components/DataSharingLabel";
import { DevLabel } from "./private-components/DevLabel";

export type AuthenticationBoundaryProps = {
    children?: React.ReactNode;
};

export function AuthenticationBoundary(props: AuthenticationBoundaryProps) {
    const authState = useAuthState();

    function signIn() {
        // Before actually redirecting to the login page, check first if we might already have been logged in elsewhere
        AuthStateStore.getInstance()
            .checkIsLoggedInOnBackend()
            .then((isLoggedIn) => {
                // If still not logged in, redirect to the login page
                if (!isLoggedIn) {
                    window.location.href = `/api/login?redirect_url_after_login=${btoa(window.location.pathname + window.location.search + window.location.hash)}`;
                    return;
                }
                // Otherwise, the user is already logged in, so we reload the page to start fresh but logged in.
                // The auth state is deliberately left untouched - continuing in place could leave this page
                // with a second workbench next to the one from before the logout.
                window.location.reload();
            });
    }

    let content: React.ReactNode = null;
    if (authState === AuthState.NotLoggedIn) {
        content = (
            <div className="gap-y-xl flex w-1/2 flex-col items-center">
                <FmuLogo className="h-32 w-32" />
                <Heading as="h1">FMU Analysis</Heading>
                <DataSharingLabel />
                <Paragraph size="xl">Please sign in to continue.</Paragraph>
                <Button onClick={signIn} size="large">
                    Sign in
                </Button>
                <DevLabel />
            </div>
        );
    } else if (authState === AuthState.Loading) {
        content = (
            <>
                <FmuAnimatedLogo className="h-32 w-32" />
                <Paragraph size="lg">Checking if user is signed in...</Paragraph>
            </>
        );
    }

    return (
        <div className="relative">
            <div
                className={resolveClassNames(
                    "gap-y-lg z-elevated absolute inset-0 flex h-screen w-screen flex-col items-center justify-center transition-opacity duration-1000 ease-in-out",
                    {
                        "pointer-events-none opacity-0": authState === AuthState.LoggedIn,
                        "opacity-100": authState !== AuthState.LoggedIn,
                    },
                )}
            >
                {content}
            </div>
            <div
                className={resolveClassNames(
                    "absolute inset-0 flex h-screen flex-col transition-opacity duration-1000 ease-in-out",
                    {
                        "opacity-0": authState !== AuthState.LoggedIn,
                        "opacity-100": authState === AuthState.LoggedIn,
                    },
                )}
            >
                {authState === AuthState.LoggedIn ? props.children : null}
            </div>
        </div>
    );
}
