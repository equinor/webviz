import React from "react";

export function useResponsiveDialogHeightPercent() {
    const [dialogHeightPercent, setDialogHeightPercent] = React.useState(0);

    React.useLayoutEffect(() => {
        // Calculate dialog height percentage based on window size
        // - Use full height for small windows, standard 75% for larger ones
        // - When window height is between 750px and 1000px, transition dialog height from 75% to 100%
        const standardDialogHeightPercent = 75;
        const pxHeightAtStandardDialog = 1000;
        const pxHeightAtFullDialog = (standardDialogHeightPercent / 100) * pxHeightAtStandardDialog;

        function handleResize() {
            let percent = standardDialogHeightPercent;
            if (window.innerHeight < pxHeightAtStandardDialog) {
                percent = Math.min(100, Math.round((pxHeightAtFullDialog / window.innerHeight) * 100));
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
