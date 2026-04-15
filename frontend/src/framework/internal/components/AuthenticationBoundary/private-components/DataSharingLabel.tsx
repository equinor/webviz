import { Card } from "@lib/newComponents/Banner";
import { Paragraph } from "@lib/newComponents/Paragraph/paragraph";

export function DataSharingLabel() {
    return (
        <Card tone="warning">
            <div className="gap-vertical-md flex flex-col">
                <Paragraph size="md">
                    <strong>Disclaimer:</strong> Webviz is a service provided by Equinor and is not a way of sharing
                    official data. Data should continue to be shared through L2S, FTP and/or Dasha.
                </Paragraph>
                <Paragraph size="md">
                    References to e.g. earlier models, model results and data should still be done through the mentioned
                    tools, and not Webviz. Since Webviz is currently under heavy development and not production ready,
                    there is no guarantee given as of now that calculations are error-free.
                </Paragraph>
            </div>
        </Card>
    );
}
