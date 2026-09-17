import { AlertDialog } from "@lib/components/AlertDialog";

export type ConfirmDeleteDashboardDialogProps = {
    open: boolean;
    onConfirmDelete: () => void;
    onClose: () => void;
};

export function ConfirmDeleteDashboardDialog(props: ConfirmDeleteDashboardDialogProps) {
    return (
        <AlertDialog
            open={props.open}
            onOpenChange={(open) => {
                if (!open) {
                    props.onClose();
                }
            }}
            title="Really delete dashboard?"
            primaryAction={{
                label: "Yes, delete",
                onClick: props.onConfirmDelete,
                tone: "danger",
                closesDialog: true,
            }}
            secondaryActions={[
                {
                    label: "No, cancel",
                    onClick: props.onClose,
                    tone: "neutral",
                    closesDialog: true,
                },
            ]}
        >
            Deleting this dashboard will remove it and all the modules it contains from your session. This action cannot
            be undone.
        </AlertDialog>
    );
}

export type CannotRemoveLastDashboardDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function CannotRemoveLastDashboardDialog(props: CannotRemoveLastDashboardDialogProps) {
    return (
        <AlertDialog
            open={props.open}
            onOpenChange={(open) => {
                if (!open) {
                    props.onClose();
                }
            }}
            title="Cannot remove last dashboard"
            primaryAction={{
                label: "OK",
                onClick: props.onClose,
                tone: "neutral",
                closesDialog: true,
            }}
        >
            A session must contain at least one dashboard. Add another dashboard before removing this one.
        </AlertDialog>
    );
}
