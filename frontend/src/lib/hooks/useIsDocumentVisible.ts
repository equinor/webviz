import React from "react";

function getIsDocumentVisible(): boolean {
    return !document.hidden;
}

/**
 * Tracks whether the document is currently visible (the tab is in the foreground).
 *
 * Deliberately keyed on `document.hidden` only, *not* `document.hasFocus()`: a window that is
 * visible but not focused (e.g. two windows side by side) still counts as visible. Consumers that
 * react to "the user came back" - like {@link GpuResourceBoundary}'s auto-restore - must not fire
 * on mere focus changes, or two visible windows competing for a scarce resource would ping-pong.
 */
export function useIsDocumentVisible(): boolean {
    const [visible, setVisible] = React.useState(getIsDocumentVisible);

    React.useEffect(function subscribeToDocumentVisibilityEffect() {
        function onVisibilityChange() {
            setVisible(getIsDocumentVisible());
        }

        document.addEventListener("visibilitychange", onVisibilityChange);

        // Catch any transition missed between the initial render and this effect running.
        onVisibilityChange();

        return function unsubscribe() {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    return visible;
}
