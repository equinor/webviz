import React from "react";

import WebvizLogo from "@assets/webviz.svg";
import { DrawerContent, GuiState } from "@framework/GuiMessageBroker";
import { LayoutElement, Workbench } from "@framework/Workbench";
import { LeftNavBar, RightNavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { ToggleDevToolsButton } from "@framework/internal/components/ToggleDevToolsButton";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { WebvizSpinner } from "@lib/components/WebvizSpinner";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { useQueryClient } from "@tanstack/react-query";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

function DevLabel() {
    return (
        <div className="bg-orange-600 text-white p-2 rounded max-w-[400px] text-sm text-center mt-4 z-50 shadow">
            <strong>NOTE:</strong> This application is still under heavy development and bugs are to be expected. Please
            help us improve Webviz by reporting any undesired behaviour either on{" "}
            <a href="https://equinor.slack.com/messages/webviz/" target="blank" className="underline cursor-pointer">
                Slack
            </a>{" "}
            or{" "}
            <a
                href="(https://web.yammer.com/main/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiIxMzM5NzE0NyJ9"
                target="blank"
                className="underline cursor-pointer"
            >
                Yammer
            </a>
            .
        </div>
    );
}

enum InitAppState {
    CheckingIfUserIsSignedIn = "checking-if-user-is-signed-in",
    LoadingEnsembles = "loading-ensembles",
    InitCompleted = "init-completed",
}

const layout: LayoutElement[] = [];

const WORKBENCH = new Workbench();

function App() {
    const [isMounted, setIsMounted] = React.useState<boolean>(false);
    const [initAppState, setInitAppState] = React.useState<InitAppState>(InitAppState.CheckingIfUserIsSignedIn);

    const queryClient = useQueryClient();
    const { authState } = useAuthProvider();

    function initApp() {
        if (!WORKBENCH.loadLayoutFromLocalStorage()) {
            WORKBENCH.makeLayout(layout);
        }

        if (WORKBENCH.getLayout().length === 0) {
            WORKBENCH.getGuiMessageBroker().setState(GuiState.DrawerContent, DrawerContent.ModulesList);
        } else {
            WORKBENCH.getGuiMessageBroker().setState(GuiState.DrawerContent, DrawerContent.ModuleSettings);
        }
        setInitAppState(InitAppState.InitCompleted);
    }

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    React.useEffect(
        function handleMountWhenSignedIn() {
            if (authState !== AuthState.LoggedIn || isMounted) {
                return;
            }

            setIsMounted(true);

            const storedEnsembleIdents = WORKBENCH.maybeLoadEnsembleSettingsFromLocalStorage();
            if (storedEnsembleIdents) {
                setInitAppState(InitAppState.LoadingEnsembles);
                WORKBENCH.loadAndSetupEnsembleSetInSession(queryClient, storedEnsembleIdents).finally(() => {
                    initApp();
                });
            } else {
                initApp();
            }

            return function handleUnmount() {
                WORKBENCH.clearLayout();
                WORKBENCH.resetModuleInstanceNumbers();
            };
        },
        [authState, isMounted, queryClient]
    );

    function makeStateMessages() {
        return (
            <div className="relative mt-4 w-full">
                <div
                    className={resolveClassNames(
                        "absolute top-0 transition-opacity duration-500 ease-in-out w-full text-center",
                        {
                            "opacity-0": initAppState !== InitAppState.CheckingIfUserIsSignedIn,
                            "opacity-100": initAppState === InitAppState.CheckingIfUserIsSignedIn,
                        }
                    )}
                >
                    Checking if user is signed in...
                </div>
                <div
                    className={resolveClassNames(
                        "absolute top-0 transition-opacity duration-500 ease-in-out w-full text-center",
                        {
                            "opacity-0": initAppState !== InitAppState.LoadingEnsembles,
                            "opacity-100": initAppState === InitAppState.LoadingEnsembles,
                        }
                    )}
                >
                    Restoring working session...
                </div>
            </div>
        );
    }

    const isInitializingApp = initAppState !== InitAppState.InitCompleted;

    return (
        <>
            {authState === AuthState.NotLoggedIn ? (
                <div className="w-screen h-screen flex flex-col items-center justify-center gap-8">
                    <img src={WebvizLogo} alt="Webviz logo" className="w-32 h-32" />
                    <p className="text-lg">Please sign in to continue.</p>
                    <Button onClick={signIn}>Sign in</Button>
                    <DevLabel />
                </div>
            ) : (
                isInitializingApp && (
                    <div
                        className={resolveClassNames(
                            "absolute inset-0 w-screen h-screen flex flex-col items-center justify-center gap-8 z-50",
                            {
                                hidden: !isInitializingApp,
                            }
                        )}
                    >
                        <WebvizSpinner size={100} />
                        {makeStateMessages()}
                        <DevLabel />
                    </div>
                )
            )}
            <div
                className={resolveClassNames("h-screen flex flex-row transition-opacity ease-in-out duration-1000", {
                    "opacity-0": isInitializingApp,
                    "opacity-100": !isInitializingApp,
                })}
            >
                <LeftNavBar workbench={WORKBENCH} />
                <SettingsContentPanels workbench={WORKBENCH} />
                <RightNavBar workbench={WORKBENCH} />
            </div>
            <ToggleDevToolsButton guiMessageBroker={WORKBENCH.getGuiMessageBroker()} />
        </>
    );
}

export default App;
