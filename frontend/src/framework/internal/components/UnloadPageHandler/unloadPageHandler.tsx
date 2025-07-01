import React from "react";

import type { Workbench } from "@framework/Workbench";

export type UnloadPageHandlerProps = {
    workbench: Workbench;
};

export function UnloadPageHandler(props: UnloadPageHandlerProps): React.ReactNode {
    React.useEffect(
        function handleUnload() {
            const handleBeforeUnload = (event: BeforeUnloadEvent) => {
                if (!props.workbench.maybeCloseCurrentSession()) {
                    event.preventDefault();
                    event.returnValue = ""; // This is necessary for the dialog to show in some browsers.
                }
            };

            window.addEventListener("beforeunload", handleBeforeUnload);
            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        },
        [props.workbench],
    );

    return null; // This component does not render anything visible.
}
