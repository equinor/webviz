import React from "react";

export type ViewWrapperPlaceholderProps = {
    width: number;
    height: number;
    x: number;
    y: number;
};

export const ViewWrapperPlaceholder: React.FC<ViewWrapperPlaceholderProps> = (props) => {
    return (
        <div
            className="absolute box-border p-2"
            style={{
                width: props.width,
                height: props.height,
                left: props.x,
                top: props.y,
            }}
        >
            <div className="bg-blue-300 h-full w-full" />
        </div>
    );
};
