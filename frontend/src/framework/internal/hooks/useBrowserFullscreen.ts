import React from "react";

export function useBrowserFullscreen(): [boolean, () => void] {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    document.addEventListener("fullscreenchange", () => {
        setIsFullscreen(document.fullscreenElement != null);
    });

    const enterFullscreen = React.useCallback((element?: HTMLElement) => {
        if (!document.fullscreenEnabled) return console.warn("Fullscreen not allowed");

        const el = element ?? document.body;
        el.requestFullscreen();
    }, []);

    const exitFullscreen = React.useCallback(() => {
        document.exitFullscreen();
    }, []);

    const toggleFullscreen = React.useCallback(() => {
        if (document.fullscreenElement) exitFullscreen();
        else enterFullscreen();
    }, [enterFullscreen, exitFullscreen]);

    return [isFullscreen, toggleFullscreen];
}
