import React from "react";

import { Banner } from "@lib/newComponents/Banner";
import { TextInputCompositions } from "@lib/newComponents/TextInput/compositions";
import { Heading, Paragraph } from "@lib/newComponents/Typography/compositions";

export type ConfirmationProps = {
    snapshotUrl: string;
};

export function Confirmation(props: ConfirmationProps): React.ReactNode {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    return (
        <div className="gap-y-sm flex flex-col">
            <Heading as="h6" tone="success" weight="bolder">
                Snapshot created successfully!
            </Heading>
            <Paragraph size="sm" tone="neutral">
                By sharing the following link you can give others access to your snapshot. <br />
                You can find all your created and visited snapshots in the snapshots dialog.
            </Paragraph>
            <TextInputCompositions.WithCopyButton ref={inputRef} value={props.snapshotUrl} className="w-full" />
            <Banner tone="warning">
                <ul className="pl-sm list-outside list-disc">
                    <li>Snapshots are not guaranteed to persist, as underlying data or module states may change.</li>
                    <li>
                        All Equinor-onboarded users with the link can access the snapshot settings; access to the data
                        itself requires appropriate permissions (Sumo, SMDA, SSDL etc.).
                    </li>
                </ul>
            </Banner>
        </div>
    );
}
