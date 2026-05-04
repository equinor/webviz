import { AlertDialog as AlertDialogBase, type AlertDialogRootProps } from "@base-ui/react";

import type { ButtonProps } from "../Button";
import { Button } from "../Button";
import { Heading } from "../Typography/_compositions/Heading";
import { Paragraph } from "../Typography/_compositions/Paragraph";

export type AlertDialogAction = {
    label: string;
    tone?: ButtonProps["tone"];
    onClick: () => void;
    closesDialog?: boolean;
};

export type AlertDialogProps = AlertDialogRootProps & {
    title: string;
    description: string;
    primaryAction: AlertDialogAction;
    secondaryActions?: AlertDialogAction[];
};

export function AlertDialog(props: AlertDialogProps) {
    const { title, description, primaryAction, secondaryActions, ...rest } = props;

    // The "dialog__*" classes can be found in the dialog.css file in the styles/components folder
    return (
        <AlertDialogBase.Root {...rest}>
            <AlertDialogBase.Portal>
                <AlertDialogBase.Backdrop className="dialog__backdrop" />
                <AlertDialogBase.Popup className="dialog__popup z-toast">
                    <AlertDialogBase.Title
                        className="dialog__popup__child"
                        render={(baseProps) => (
                            <Heading as="h6" {...baseProps}>
                                {title}
                            </Heading>
                        )}
                    />
                    <AlertDialogBase.Description
                        className="dialog__popup__child"
                        render={(baseProps) => (
                            <Paragraph size="md" {...baseProps}>
                                {description}
                            </Paragraph>
                        )}
                    />
                    <div className="dialog__popup__child gap-horizontal-md flex items-center justify-end">
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
                                <Button variant="outlined" key={index} tone={action.tone} onClick={action.onClick}>
                                    {action.label}
                                </Button>
                            ),
                        )}
                        {primaryAction.closesDialog ? (
                            <AlertDialogBase.Close
                                onClick={primaryAction.onClick}
                                render={(htmlProps) => (
                                    <Button variant="contained" tone={primaryAction.tone} {...htmlProps}>
                                        {primaryAction.label}
                                    </Button>
                                )}
                            />
                        ) : (
                            <Button variant="contained" tone={primaryAction.tone} onClick={primaryAction.onClick}>
                                {primaryAction.label}
                            </Button>
                        )}
                    </div>
                </AlertDialogBase.Popup>
            </AlertDialogBase.Portal>
        </AlertDialogBase.Root>
    );
}
