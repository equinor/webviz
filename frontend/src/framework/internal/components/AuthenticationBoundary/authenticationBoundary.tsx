import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { DataSharingLabel } from "./private-components/DataSharingLabel";
import { DevLabel } from "./private-components/DevLabel";

import FmuLogo from "@assets/fmu.svg";
import FmuLogoAnimated from "@assets/fmuAnimated.svg";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type AuthenticationBoundaryProps = {
    children?: React.ReactNode;
};

export function AuthenticationBoundary(props: AuthenticationBoundaryProps) {
    const { authState } = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    let content: React.ReactNode = null;
    if (authState === AuthState.NotLoggedIn) {
        content = (
            <>
                <img src={FmuLogo} alt="FMU Analysis logo" className="w-32 h-32" />
                <h1 className="text-3xl font-bold">FMU Analysis</h1>
                <DataSharingLabel />
                <p className="text-lg">Please sign in to continue.</p>
                <Button onClick={signIn}>Sign in</Button>
                <DevLabel />
            </>
        );
    } else if (authState === AuthState.Loading) {
        content = (
            <>
                <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="w-32 h-32" />
                Checking if user is signed in...
            </>
        );
    }

    return (
        <div className="relative">
            <div
                className={resolveClassNames(
                    "absolute inset-0 z-1 w-screen h-screen flex flex-col items-center justify-center gap-8 transition-opacity ease-in-out duration-1000",
                    {
                        "opacity-0 pointer-events-none": authState === AuthState.LoggedIn,
                        "opacity-100": authState !== AuthState.LoggedIn,
                    },
                )}
            >
                {content}
            </div>
            <div
                className={resolveClassNames(
                    "absolute inset-0 h-screen flex flex-col transition-opacity ease-in-out duration-1000",
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
