import React from "react";

export type OverlayProps = {
    visible: boolean;
};

export const Overlay: React.FC<OverlayProps> = (props: OverlayProps) => {
    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50"
            style={{ display: props.visible ? "block" : "none" }}
        />
    );
};

Overlay.displayName = "Overlay";
