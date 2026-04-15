import type { ToastProviderProps } from "@base-ui/react";
import { Toast as ToastBase } from "@base-ui/react";
import { CheckCircle, Error, Warning } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Button } from "../Button";
import { CircularProgress } from "../CircularProgress";

import { type ToastManager, useToastManager, type ToastType } from "./toastManager";

export type ToastViewportProps = Omit<ToastProviderProps, "toastManager"> & {
    toastManager?: ToastManager<any>;
};

/**
 * EDS is using "Snackbar" as the canonical component name for both snackbars and toasts.
 * We are using "Toast" as the component name in order to reflect the fact that these are toasts, and not snackbars (which have different behavior and use cases).
 * However, we are styling the component in a way that is consistent with EDS snackbars, in order to maintain visual consistency with EDS components.
 * EDS is using "--eds-color-text-strong" as the background color for both snackbars and tooltips, which seems a bit odd, but we are following their lead in order to maintain visual consistency.
 */

export function ToastViewport({ toastManager, ...rest }: ToastViewportProps) {
    return (
        <ToastBase.Provider toastManager={toastManager as ToastProviderProps["toastManager"]} {...rest}>
            <ToastBase.Portal>
                <ToastBase.Viewport className="z-toast fixed top-auto right-auto bottom-0 left-1/2 w-60 -translate-1/2">
                    <ToastList />
                </ToastBase.Viewport>
            </ToastBase.Portal>
        </ToastBase.Provider>
    );
}

const TOAST_TYPE_TO_TONE_CLASSNAME: Record<ToastType, string> = {
    default: "",
    loading: "bg-accent-strong",
    success: "bg-success-strong",
    error: "bg-danger-strong",
    warning: "bg-warning-strong",
};

const TOAST_TYPE_TO_ICON: Record<ToastType, React.ReactNode> = {
    default: undefined,
    loading: <CircularProgress size={16} tone="on-emphasis" />,
    success: <CheckCircle fontSize="small" />,
    error: <Error fontSize="small" />,
    warning: <Warning fontSize="small" />,
};

function ToastList() {
    const { toasts } = useToastManager();

    return toasts.map((toast) => (
        <ToastBase.Root
            key={toast.id}
            toast={toast}
            swipeDirection="down"
            className="toast__popup flex items-center justify-center gap-0"
        >
            {toast.type && toast.type !== "default" && (
                <span
                    className={resolveClassNames(
                        "px-horizontal-sm py-vertical-sm rounded-l-rounded flex h-full items-center justify-center",
                        TOAST_TYPE_TO_TONE_CLASSNAME[toast.type],
                    )}
                >
                    {TOAST_TYPE_TO_ICON[toast.type]}
                </span>
            )}
            <ToastBase.Content className="toast__content text-header-sm font-heading gap-horizontal-sm flex items-center">
                <ToastBase.Title
                    render={(subProps) => (
                        <span {...subProps} className="px-horizontal-sm py-vertical-sm whitespace-nowrap">
                            {toast.title}
                        </span>
                    )}
                />
                {toast.actionProps && (
                    <ToastBase.Action
                        render={(subProps) => (
                            <Button
                                variant="text"
                                tone="accent"
                                {...subProps}
                                className={resolveClassNames(subProps.className, "ml-auto")}
                            />
                        )}
                    />
                )}
            </ToastBase.Content>
        </ToastBase.Root>
    ));
}
