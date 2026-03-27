import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ScrimProps = {
    isDismissable?: boolean;
    open: boolean;
    onClose: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    children?: React.ReactNode;
};

const DEFAULT_PROPS = {
    isDismissable: false,
} satisfies Partial<ScrimProps>;

export function Scrim(props: ScrimProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const { onClose } = defaultedProps;

    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const handleClose = React.useCallback(
        function handleClose(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
            onClose?.(e);
        },
        [onClose],
    );

    const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== wrapperRef.current) {
            return;
        }
        handleClose(e);
    };

    return (
        <div
            ref={wrapperRef}
            className={resolveClassNames("z-scrim fixed inset-0 h-full w-full", {
                "pointer-events-none": !defaultedProps.isDismissable,
                "bg-backdrop": defaultedProps.isDismissable,
                hidden: !defaultedProps.open,
            })}
            onClick={handleBackgroundClick}
        >
            {props.children}
        </div>
    );
}
