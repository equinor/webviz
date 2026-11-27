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
                        relative reduction in Shannon entropy H:{" "}
                        <math>
                            <mo stretchy="false">(</mo>
                            <Entropy of="prior" />
                            <mo>−</mo>
                            <Entropy of="post" />
                            <mo stretchy="false">)</mo>
                            <mo>/</mo>
                            <Entropy of="prior" />
                        </math>
                    </Paragraph>
                </div>

                <div>
                    <Heading as="h4">Information gain</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Ranks parameters by how much the distribution changed from prior to posterior (location, spread
                        or shape). Captures what the observations taught us, even if uncertainty did not decrease.
                        Computed as the Kullback-Leibler divergence{" "}
                        <math>
                            <mi>KL</mi>
                            <mo stretchy="false">(</mo>
                            <mi mathvariant="normal">post</mi>
                            <mo>‖</mo>
                            <mi mathvariant="normal">prior</mi>
                            <mo stretchy="false">)</mo>
                        </math>
                        .
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

function Entropy(props: { of: "prior" | "post" }): React.ReactElement {
    return (
        <mrow>
            <mi>H</mi>
            <mo stretchy="false">(</mo>
            <mi mathvariant="normal">{props.of}</mi>
            <mo stretchy="false">)</mo>
        </mrow>
    );
}
