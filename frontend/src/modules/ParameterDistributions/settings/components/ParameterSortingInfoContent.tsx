import type React from "react";

import { Typography } from "@lib/components/Typography";
import { Paragraph } from "@lib/components/Typography/compositions";

export function ParameterSortingInfoContent(): React.ReactElement {
    return (
        <>
            <div className="space-y-2xs p-2xs">
                <div>
                    <SectionTitle>Alphabetical</SectionTitle>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Sorts parameters by name in alphabetical order (A-Z).
                    </Paragraph>
                </div>

                <div>
                    <SectionTitle>Uncertainty reduction</SectionTitle>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Ranks parameters by how much uncertainty decreased from prior to posterior. Computed as the
                        relative reduction in Shannon entropy.
                    </Paragraph>
                </div>

                <div>
                    <SectionTitle>Information gain</SectionTitle>
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

function SectionTitle(props: { children: React.ReactNode }): React.ReactElement {
    return (
        <Typography as="h6" family="header" size="sm" weight="bolder">
            {props.children}
        </Typography>
    );
}
