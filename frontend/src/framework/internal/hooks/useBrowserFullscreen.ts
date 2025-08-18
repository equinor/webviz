import React from "react";

export function useBrowserFullscreen(): [boolean, () => void] {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = React.useCallback(() => {
        if (!document.fullscreenEnabled) return console.warn("Fullscreen not allowed");
        if (document.fullscreenElement) document.exitFullscreen();

        document.body.requestFullscreen();
    }, []);

    React.useEffect(
        function setupFullscreenListeners() {
            // ! The browsers (chrome and firefox at-least) are for some reason not actually using
            // ! the Fullscreen API when the user presses their fullscreen key, causing 'fullscreenElement'
            // ! to not be set. As a workaround, we manually call the API ourselves
            function handleFullscreenKey(evt: KeyboardEvent) {
                if (evt.code !== "F11") return;

                evt.preventDefault();
                toggleFullscreen();
            }

            function handleFullscreenChange() {
                setIsFullscreen(document.fullscreenElement != null);
            }

            document.addEventListener("keydown", handleFullscreenKey);
            document.addEventListener("fullscreenchange", handleFullscreenChange);
            return function removeFullscreenListeners() {
                document.removeEventListener("keydown", handleFullscreenKey);
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
            };
        },
        [toggleFullscreen],
    );

    return [isFullscreen, toggleFullscreen];
}
