import React from "react";

export function useResponsiveDialogSizePercent(): { width: number; height: number } {
    const [dialogWidthPercent, setDialogWidthPercent] = React.useState(0);
    const [dialogHeightPercent, setDialogHeightPercent] = React.useState(0);

    React.useLayoutEffect(function mountResizeListener() {
        // Calculate dialog width and height percentage based on window size
        // - Width:
        //    - Use full width for small windows, standard 75% for larger ones
        //    - When window width is between 900px and 1200px, transition dialog width from 75% to 100%
        // - Height:
        //    - Use full height for small windows, standard 75% for larger ones
        //    - When window height is between 750px and 1000px, transition dialog height from 75% to 100%
        const standardDialogWidthPercent = 75;
        const pxWidthAtStandardDialog = 1600;
        const pxWidthAtFullDialog = (standardDialogWidthPercent / 100) * pxWidthAtStandardDialog;

        const standardDialogHeightPercent = 75;
        const pxHeightAtStandardDialog = 1000;
        const pxHeightAtFullDialog = (standardDialogHeightPercent / 100) * pxHeightAtStandardDialog;

        function handleResize() {
            let widthPercent = standardDialogWidthPercent;
            let heightPercent = standardDialogHeightPercent;
            if (window.innerWidth < pxWidthAtStandardDialog) {
                widthPercent = Math.min(100, Math.round((pxWidthAtFullDialog / window.innerWidth) * 100));
            }
            if (window.innerHeight < pxHeightAtStandardDialog) {
                heightPercent = Math.min(100, Math.round((pxHeightAtFullDialog / window.innerHeight) * 100));
            }
            setDialogWidthPercent(widthPercent);
            setDialogHeightPercent(heightPercent);
        }

        // Initialize immediately
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return { width: dialogWidthPercent, height: dialogHeightPercent };
}
