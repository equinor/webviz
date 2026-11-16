import type React from "react";

export type ViewWrapperPlaceholderProps = {
    width: number;
    height: number;
    x: number;
    y: number;
};

export const ViewWrapperPlaceholder: React.FC<ViewWrapperPlaceholderProps> = (props) => {
    return (
        <div
            className="absolute box-border p-0"
            style={{
                width: props.width,
                height: props.height,
                left: props.x,
                top: props.y,
            }}
        >
            <div className="bg-accent-canvas h-full w-full" />
        </div>
    );
};
