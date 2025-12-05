import { CopyInputField } from "@lib/components/CopyInputField";

export type ConfirmationProps = {
    snapshotUrl: string;
};

export function Confirmation(props: ConfirmationProps): React.ReactNode {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-green-600 text-lg font-bold">Snapshot created successfully!</div>
            <div className="text-sm">
                By sharing the following link you can give others access to your snapshot. <br />
                You can find all your created and visited snapshots in the snapshots dialog.
            </div>
            <CopyInputField value={props.snapshotUrl} className="w-full" />
        </div>
    );
}
