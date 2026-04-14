import type { ToastProviderProps } from "@base-ui/react";
import { Toast as ToastBase } from "@base-ui/react";
import { X } from "@mui/icons-material";

export type ToastProps = ToastProviderProps;

export function Toast(props: ToastProps) {
    return (
        <ToastBase.Provider {...props}>
            <ToastBase.Portal>
                <ToastBase.Viewport className="bottom-vertical-xs right-horizontal-xs z-toast fixed top-auto left-auto h-24 w-60">
                    <ToastList />
                </ToastBase.Viewport>
            </ToastBase.Portal>
        </ToastBase.Provider>
    );
}

function ToastList() {
    const { toasts } = ToastBase.useToastManager();

    return toasts.map((toast) => (
        <ToastBase.Root
            key={toast.id}
            toast={toast}
            className="bg-floating absolute right-0 box-border h-(--height) w-full rounded"
        >
            <ToastBase.Title className="text-sm font-medium" />
            <ToastBase.Description className="text-muted-foreground text-sm" />
            <ToastBase.Close className="" aria-label="Close">
                <X fontSize="inherit" />
            </ToastBase.Close>
        </ToastBase.Root>
    ));
}
