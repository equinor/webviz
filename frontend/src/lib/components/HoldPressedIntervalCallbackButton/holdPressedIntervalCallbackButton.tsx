import React from "react";

import { Button, ButtonProps } from "../Button/button";

export type HoldPressedIntervalCallbackButtonProps = ButtonProps & {
    onHoldPressedIntervalCallback: () => void;
};

export function HoldPressedIntervalCallbackButton(props: HoldPressedIntervalCallbackButtonProps): React.ReactNode {
    const { onHoldPressedIntervalCallback, ...other } = props;

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    function handleClick() {
        onHoldPressedIntervalCallback();
    }

    function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        timeoutRef.current = setTimeout(() => {
            e.preventDefault();
            intervalRef.current = setInterval(() => {
                onHoldPressedIntervalCallback();
            }, 100);
        }, 300);
    }

    function handlePointerUp() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    return (
        <Button
            {...other}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
    );
}
