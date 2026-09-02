import { createSvgIcon } from "@mui/material";

/**
 * List view shown inside an application window.
 *
 * Adapted from the Material UI `Dvr` icon: the list rows are kept, but the monitor
 * (screen + stand) is replaced by an application window with a title bar, matching
 * the frame of the Material UI `WebAsset` icon.
 */
export const WindowListIcon = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V8h14v10z" />
        <rect x="7" y="10" width="2" height="2" />
        <rect x="11" y="10" width="6" height="2" />
        <rect x="7" y="14" width="2" height="2" />
        <rect x="11" y="14" width="4" height="2" />
    </svg>,
    "WindowList",
);
