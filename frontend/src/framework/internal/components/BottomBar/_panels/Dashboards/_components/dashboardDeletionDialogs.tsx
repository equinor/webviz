import { AlertDialog, type AlertDialogProps } from "@lib/components/AlertDialog";

export type ConfirmDeleteDashboardDialogProps = {
    open: boolean;
    dashboardName?: string;
    onConfirmDelete: () => void;
    onClose: () => void;
    /** Where focus goes on close - the element focused before may be the deleted dashboard's tab. */
    finalFocus?: AlertDialogProps["finalFocus"];
};

export function ConfirmDeleteDashboardDialog(props: ConfirmDeleteDashboardDialogProps) {
    return (
        <AlertDialog
            open={props.open}
            finalFocus={props.finalFocus}
            onOpenChange={(open) => {
                if (!open) {
                    props.onClose();
                }
            }}
            title={`Really delete dashboard "${props.dashboardName ?? ""}"?`}
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
            Deleting the dashboard will remove it and all the modules it contains from your session. This action cannot
            be undone.
        </AlertDialog>
    );
}
