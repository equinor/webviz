import React from "react";

export type ContentHiddenProps = {
    /** The content to show or hide. Content stays mounted in the DOM. */
    children: React.ReactNode;
    /** When true, the children are hidden via CSS display:none. @default false */
    hidden?: boolean;
};

export function ContentHidden(props: ContentHiddenProps): React.ReactNode {
    return <div className={props.hidden ? "hidden" : "contents"}>{props.children}</div>;
}
