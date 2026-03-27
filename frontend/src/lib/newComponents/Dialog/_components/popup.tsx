import { Dialog as DialogBase } from "@base-ui/react";

export type PopupProps = {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    width?: number | string;
    height?: number | string;
};

const DEFAULT_PROPS = {
    open: false,
} satisfies Partial<PopupProps>;

export function Popup(props: PopupProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    return (
        <DialogBase.Root open={defaultedProps.open} onOpenChange={defaultedProps.onOpenChange}>
            <DialogBase.Portal>
                <DialogBase.Backdrop className="bg-fill-backdrop fixed inset-0 min-h-screen touch-none opacity-60 transition-opacity" />
                <DialogBase.Popup
                    className="popup"
                    style={{ width: defaultedProps.width, height: defaultedProps.height }}
                >
                    {defaultedProps.children}
                </DialogBase.Popup>
            </DialogBase.Portal>
        </DialogBase.Root>
    );
}
