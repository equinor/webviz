import React from "react";

import { AlertDialog as AlertDialogBase, type AlertDialogRootProps } from "@base-ui/react";

import { AlertDialogNestingContext } from "../../contexts/alertDialogNestingContext";
import type { ButtonProps } from "../Button";
import { Button } from "../Button";
import { Paragraph, Heading } from "../Typography/compositions";

export type AlertDialogAction = {
    /** The button label text. */
    label: string;
    /** Color tone of the action button. */
    tone?: ButtonProps["tone"];
    /** Called when the action button is clicked. */
    onClick: () => void;
    /** When true, clicking the button automatically closes the dialog. */
    closesDialog?: boolean;
};

export type AlertDialogProps = Omit<AlertDialogRootProps, "className" | "render" | "style" | "children"> & {
    /** Dialog heading text. */
    title: string;
    /** The main call-to-action button, rendered with contained styling and auto-focused. */
    primaryAction: AlertDialogAction;
    /** Additional action buttons rendered before the primary action. */
    secondaryActions?: AlertDialogAction[];
    /** The dialog description content. */
    children: React.ReactNode;
};

export const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(function AlertDialog(props, ref) {
    const { title, primaryAction, secondaryActions, children, open, ...rest } = props;
    const { increment, decrement } = React.useContext(AlertDialogNestingContext);

    React.useEffect(
        function syncNestingCount() {
            if (!open) return;
            increment();
            return function cleanup() {
                decrement();
            };
        },
        [open, increment, decrement],
    );

    // The "dialog__*" classes can be found in the dialog.css file in the styles/components folder
    return (
        <AlertDialogBase.Root {...rest} open={open}>
            <AlertDialogBase.Portal>
                <AlertDialogBase.Backdrop className="dialog__backdrop z-alert" />
                <AlertDialogBase.Popup className="dialog__popup z-alert" ref={ref}>
                    <AlertDialogBase.Title
                        className="dialog__popup__child"
                        render={(baseProps) => (
                            <Heading as="h5" {...baseProps}>
                                {title}
                            </Heading>
                        )}
                    />
                    <AlertDialogBase.Description
                        className="dialog__popup__child"
                        render={(baseProps) => (
                            <Paragraph size="md" {...baseProps}>
                                {children}
                            </Paragraph>
                        )}
                    />
                    <div className="dialog__popup__child gap-x-md flex items-center justify-end">
                        {secondaryActions?.map((action, index) =>
                            action.closesDialog ? (
                                <AlertDialogBase.Close
                                    key={index}
                                    onClick={action.onClick}
                                    render={(htmlProps) => (
                                        <Button variant="outlined" tone={action.tone} {...htmlProps}>
                                            {action.label}
                                        </Button>
                                    )}
                                />
                            ) : (
                                <Button variant="ghost" key={index} tone={action.tone} onClick={action.onClick}>
                                    {action.label}
                                </Button>
                            ),
                        )}
                        {primaryAction.closesDialog ? (
                            <AlertDialogBase.Close
                                onClick={primaryAction.onClick}
                                render={(htmlProps) => (
                                    <Button variant="contained" tone={primaryAction.tone} {...htmlProps} autoFocus>
                                        {primaryAction.label}
                                    </Button>
                                )}
                            />
                        ) : (
                            <Button
                                variant="contained"
                                tone={primaryAction.tone}
                                onClick={primaryAction.onClick}
                                autoFocus
                            >
                                {primaryAction.label}
                            </Button>
                        )}
                    </div>
                </AlertDialogBase.Popup>
            </AlertDialogBase.Portal>
        </AlertDialogBase.Root>
    );
});
