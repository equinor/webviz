import React from "react";

import { Close } from "./close";

export type HeaderProps = {
    /** When true, shows a close icon button in the top-right corner. @default false */
    closeIconVisible?: boolean;
    /** The content rendered inside the header, typically a title. */
    children: React.ReactNode;
};

export const Header = React.forwardRef<HTMLDivElement, HeaderProps>(function Header(props, ref) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return (
        <div
            ref={ref}
            className="dialog__popup__child gap-x-md border-neutral flex grow-0 items-start justify-between border-b"
        >
            {props.children}
            {props.closeIconVisible && <Close />}
        </div>
    );
});
