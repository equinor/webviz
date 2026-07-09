import type React from "react";

import { Heading, Paragraph } from "@lib/components/Typography/compositions";

export function ParameterSortingInfoContent(): React.ReactElement {
    return (
        <>
            <div className="space-y-2xs p-2xs">
                <div>
                    <Heading as="h4">Alphabetical</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Sorts parameters by name in alphabetical order (A-Z).
                    </Paragraph>
                </div>

                <div>
                    <Heading as="h4">Entropy Reduction</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Shows parameters where uncertainty decreased the most from prior to posterior. High percentage =
                        distribution became more predictable.
                    </Paragraph>
                </div>

                <div>
                    <Heading as="h4">KL Divergence</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Shows parameters where the distribution changed the most (spread, location, or shape). High
                        value = parameter distribution shape and/or location changed significantly.
                    </Paragraph>
                </div>

                <div className="bg-info-canvas p-4xs rounded">
                    <Paragraph size="sm" tone="info">
                        <strong>Note:</strong> For independent ensemble mode, only alphabetical sorting is available.
                    </Paragraph>
                </div>
            </div>
        </>
    );
}
