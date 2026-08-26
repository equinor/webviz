import React from "react";

export function useIsDocumentActive() {
    const [active, setActive] = React.useState(!document.hidden);

    React.useEffect(function onVisibilityChangeEffect() {
        function onVisibilityChange() {
            setActive(!document.hidden);
        }

        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    return active;
}
