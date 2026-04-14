import type { ToastProviderProps } from "@base-ui/react";
import { Toast as ToastBase } from "@base-ui/react";
import { Check, Close, Error, Info, Warning, X } from "@mui/icons-material";
import { Button } from "../Button";
import { Typography } from "../Typography";
import { Paragraph } from "../Paragraph";
import { ToastManager, useToastManager, type ToastType } from "./toastManager";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ToastProps = Omit<ToastProviderProps, "toastManager"> & {
    toastManager?: ToastManager<any>;
};

export function Toast({ toastManager, ...rest }: ToastProps) {
    return (
        <ToastBase.Provider toastManager={toastManager as ToastProviderProps["toastManager"]} {...rest}>
            <ToastBase.Portal>
                <ToastBase.Viewport className="bottom-vertical-xs right-horizontal-xs z-toast fixed top-auto left-auto h-24 w-60">
                    <ToastList />
                </ToastBase.Viewport>
            </ToastBase.Portal>
        </ToastBase.Provider>
    );
}

const TOAST_TYPE_TO_TONE: Record<ToastType, Parameters<NonNullable<typeof Typography>["props"]["color"]>[0]> = {
    default: undefined,
    success: "success",
    error: "danger",
    warning: "warning",
    info: "info",
};

const TOAST_TYPE_TO_ICON: Record<ToastType, React.ReactNode> = {
    default: undefined,
    success: <Check fontSize="inherit" />,
    error: <Error fontSize="inherit" />,
    warning: <Warning fontSize="inherit" />,
    info: <Info fontSize="inherit" />,
};

function ToastList() {
    const { toasts } = useToastManager();

    return toasts.map((toast) => (
        <ToastBase.Root
            key={toast.id}
            toast={toast}
            className={resolveClassNames("toast__popup gap-vertical-xs bg-floating flex flex-col")}
        >
            <ToastBase.Title
                render={(subProps) => (
                    <span className="mr-horizontal-2xl">
                        <Typography
                            family="header"
                            weight="bolder"
                            size="md"
                            tone={TOAST_TYPE_TO_TONE[toast.type || "default"]}
                            {...subProps}
                        >
                            <span className="gap-horizontal-xs flex items-center">
                                {TOAST_TYPE_TO_ICON[toast.type || "default"]}
                                {toast.title}
                            </span>
                        </Typography>
                    </span>
                )}
            />
            <ToastBase.Description render={(subProps) => <Paragraph size="sm" {...subProps} />} />
            <ToastBase.Close
                aria-label="Close"
                render={(subProps) => (
                    <span className="top-vertical-xs right-horizontal-xs absolute">
                        <Button iconOnly round {...subProps} variant="text" tone="neutral" size="small">
                            <Close fontSize="inherit" />
                        </Button>
                    </span>
                )}
            />
        </ToastBase.Root>
    ));
}
