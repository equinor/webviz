import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import FmuLogo from "@assets/fmu.svg";
import FmuLogoAnimated from "@assets/fmuAnimated.svg";

import { GuiState, LeftDrawerContent } from "@framework/GuiMessageBroker";
import { LeftNavBar, RightNavBar } from "@framework/internal/components/NavBar";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { ToggleDevToolsButton } from "@framework/internal/components/ToggleDevToolsButton";
import { AuthState, useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Workbench } from "@framework/Workbench";
import type { LayoutElement } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

function DataSharingLabel() {
    return (
        <div className="border-2 border-orange-600 px-3 py-2 rounded-sm max-w-[600px] text-justify mt-4 z-50 shadow-sm">
            <p>
                <strong>Disclaimer:</strong> Webviz is a service provided by Equinor and is not a way of sharing
                official data. Data should continue to be shared through L2S, FTP and/or Dasha.
            </p>
            <p className="mt-3">
                References to e.g. earlier models, model results and data should still be done through the mentioned
                tools, and not Webviz. Since Webviz is currently under heavy development and not production ready, there
                is no guarantee given as of now that calculations are error-free.
            </p>
        </div>
    );
}

function DevLabel() {
    return (
        <div className="bg-orange-600 text-white px-3 py-2 rounded-sm max-w-[400px] text-sm text-justify mt-4 z-50 shadow-sm">
            <strong>NOTE:</strong> This application is still under heavy development; bugs and occasional downtime
            should be expected. Please help us improve Webviz by reporting any undesired behaviour either on{" "}
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

function App() {
    // Workbench must be kept as a state in order to keep it when any framework code is changed in dev mode.
    // Otherwise, the workbench will be reset on every code change. This would cause it to loose its state and will
    // cause the app to crash.
    const [workbench] = React.useState(new Workbench());

    const [isMounted, setIsMounted] = React.useState<boolean>(false);
    const [initAppState, setInitAppState] = React.useState<InitAppState>(InitAppState.CheckingIfUserIsSignedIn);

    const queryClient = useQueryClient();
    const { authState } = useAuthProvider();

    function signIn() {
        window.location.href = `/api/login?redirect_url_after_login=${btoa("/")}`;
    }

    React.useEffect(
        function handleMountWhenSignedIn() {
            function initApp() {
                if (!workbench.loadLayoutFromLocalStorage()) {
                    workbench.makeLayout(layout);
                }

                if (workbench.getLayout().length === 0) {
                    workbench.getGuiMessageBroker().setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModulesList);
                } else {
                    workbench
                        .getGuiMessageBroker()
                        .setState(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
                }
                setInitAppState(InitAppState.InitCompleted);
                workbench.getGuiMessageBroker().setState(GuiState.AppInitialized, true);
            }

            if (authState !== AuthState.LoggedIn || isMounted) {
                return;
            }

            setIsMounted(true);

            // Initialize the workbench
            workbench.initWorkbenchFromLocalStorage(queryClient).finally(() => {
                initApp();
            });

            return function handleUnmount() {
                workbench.clearLayout();
                workbench.resetModuleInstanceNumbers();
                workbench.stopEnsembleUpdatePolling();
            };
        },
        [authState, isMounted, queryClient, workbench],
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
                        },
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
                        },
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
                    <img src={FmuLogo} alt="FMU Analysis logo" className="w-32 h-32" />
                    <h1 className="text-3xl font-bold">FMU Analysis</h1>
                    <DataSharingLabel />
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
                            },
                        )}
                    >
                        <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="w-32 h-32" />
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
                <>
                    <LeftNavBar workbench={workbench} />
                    <SettingsContentPanels workbench={workbench} />
                    <RightNavBar workbench={workbench} />
                </>
            </div>
            <ToggleDevToolsButton guiMessageBroker={workbench.getGuiMessageBroker()} />
        </>
    );
}

export default App;
