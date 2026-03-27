import FmuLogo from "@assets/fmu.svg";
import FmuLogoAnimated from "@assets/fmuAnimated.svg";

import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { Heading } from "@lib/newComponents/Heading";
import { Paragraph } from "@lib/newComponents/Paragraph/paragraph";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DataSharingLabel } from "./private-components/DataSharingLabel";
import { DevLabel } from "./private-components/DevLabel";

export type AuthenticationBoundaryProps = {
    children?: React.ReactNode;
};

export function AuthenticationBoundary(props: AuthenticationBoundaryProps) {
    const { authState } = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa(window.location.pathname + window.location.search + window.location.hash)}`;
    }

    let content: React.ReactNode = null;
    if (authState === AuthState.NotLoggedIn) {
        content = (
            <div className="gap-space-md flex w-1/2 flex-col items-center">
                <img src={FmuLogo} alt="FMU Analysis logo" className="h-32 w-32" />
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
                <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="h-32 w-32" />
                <Paragraph size="xl">Checking if user is signed in...</Paragraph>
            </>
        );
    }

    return (
        <div className="relative">
            <div
                className={resolveClassNames(
                    "absolute inset-0 z-1 flex h-screen w-screen flex-col items-center justify-center gap-8 transition-opacity duration-1000 ease-in-out",
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
