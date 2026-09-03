import { createSvgIcon } from "@mui/material";

/**
 * List view shown inside an application window.
 *
 * Adapted from the Material UI `Dvr` icon: the list rows are kept, but the monitor
 * (screen + stand) is replaced by an application window with a title bar, in the spirit of
 * the Material UI `WebAsset` icon. The window is drawn slightly larger than `WebAsset` so the
 * glyph carries the same optical weight as filled Material icons at the same `fontSize`.
 */
export const WindowListIcon = createSvgIcon(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.5 3H3.5C2.65 3 2 3.65 2 4.5v15c0 .85.65 1.5 1.5 1.5h17c.85 0 1.5-.65 1.5-1.5V4.5C22 3.65 21.35 3 20.5 3zM20 19H4V7h16v12z" />
        <rect x="6" y="9.5" width="2.5" height="2.5" />
        <rect x="9.5" y="9.5" width="8.5" height="2.5" />
        <rect x="6" y="14" width="2.5" height="2.5" />
        <rect x="9.5" y="14" width="5.5" height="2.5" />
    </svg>,
    "WindowList",
);
