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
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm">
                <ul className="list-disc list-outside pl-4">
                    <li>Snapshots are not guaranteed to persist, as underlying data or module states may change.</li>
                    <li>
                        All Equinor-onboarded users with the link can access the snapshot settings; access to the data
                        itself requires appropriate permissions (Sumo, SMDA, SSDL etc.).
                    </li>
                </ul>
            </div>
        </div>
    );
}
