import React from "react";

export function useResponsiveDialogHeightPercent() {
    const [dialogHeightPercent, setDialogHeightPercent] = React.useState(0);

    React.useLayoutEffect(() => {
        // Calculate dialog height percentage based on window size
        // - Use full height for small windows, standard 75% for larger ones
        // - When window height is between 750px and 1000px, transition dialog height from 75% to 100%
        const STANDARD_DIALOG_HEIGHT_PERCENT = 75;
        const PX_HEIGHT_AT_STANDARD_DIALOG = 1000;
        const PX_HEIGHT_AT_FULL_DIALOG = (STANDARD_DIALOG_HEIGHT_PERCENT / 100) * PX_HEIGHT_AT_STANDARD_DIALOG;

        function handleResize() {
            let percent = STANDARD_DIALOG_HEIGHT_PERCENT;
            if (window.innerHeight < PX_HEIGHT_AT_STANDARD_DIALOG) {
                percent = Math.min(100, Math.round((PX_HEIGHT_AT_FULL_DIALOG / window.innerHeight) * 100));
            }
            setDialogHeightPercent(percent);
        }

        // Initialize immediately
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return dialogHeightPercent;
}
