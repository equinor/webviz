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
                    <Heading as="h4">Uncertainty reduction</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Ranks parameters by how much uncertainty decreased from prior to posterior. Computed as the
                        relative reduction in Shannon entropy.
                    </Paragraph>
                </div>

                <div>
                    <Heading as="h4">Information gain</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Ranks parameters by how much the distribution changed from prior to posterior (location, spread
                        or shape). Captures what the observations taught us, even if uncertainty did not decrease.
                        Computed as the Kullback-Leibler divergence from prior to posterior.
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
