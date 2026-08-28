import React from "react";

function getIsDocumentActive(): boolean {
    return !document.hidden && document.hasFocus();
}

export function useIsDocumentActive() {
    const [active, setActive] = React.useState(getIsDocumentActive);

    React.useEffect(function subscribeToDocumentActivityEffect() {
        function onActivityChange() {
            setActive(getIsDocumentActive());
        }

        document.addEventListener("visibilitychange", onActivityChange);
        window.addEventListener("focus", onActivityChange);
        window.addEventListener("blur", onActivityChange);

        // Catch any transition missed between the initial render and this effect running.
        onActivityChange();

        return function unsubscribe() {
            document.removeEventListener("visibilitychange", onActivityChange);
            window.removeEventListener("focus", onActivityChange);
            window.removeEventListener("blur", onActivityChange);
        };
    }, []);

    return active;
}
