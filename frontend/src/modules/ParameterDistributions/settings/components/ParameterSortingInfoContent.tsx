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
                        Ranks parameters by how much uncertainty decreased from prior to posterior.
                    </Paragraph>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Computed as the relative reduction in Shannon entropy:
                    </Paragraph>
                    <UncertaintyReductionEquation />
                </div>

                <div>
                    <Heading as="h4">Information gain</Heading>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Ranks parameters by how much the distribution changed from prior to posterior (location, spread
                        or shape). Captures what the observations taught us, even if uncertainty did not decrease.
                    </Paragraph>
                    <Paragraph size="sm" layoutClassName="mt-4xs">
                        Computed as the Kullback-Leibler divergence:
                    </Paragraph>
                    <InformationGainEquation />
                </div>

                <Paragraph size="sm">
                    <MathInline>
                        <Prob which="prior" index />
                    </MathInline>{" "}
                    and{" "}
                    <MathInline>
                        <Prob which="post" index />
                    </MathInline>{" "}
                    are the fractions of prior and posterior realizations in histogram bin{" "}
                    <MathInline>
                        <mi>i</mi>
                    </MathInline>
                    , using the same bins for both distributions.
                </Paragraph>

                <div className="bg-info-canvas p-4xs rounded">
                    <Paragraph size="sm" tone="info">
                        <strong>Note:</strong> For independent ensemble mode, only alphabetical sorting is available.
                    </Paragraph>
                </div>
            </div>
        </>
    );
}

function MathBlock(props: { children: React.ReactNode }): React.ReactElement {
    return (
        <math display="block" className="mt-3xs text-body-sm">
            {props.children}
        </math>
    );
}

function MathInline(props: { children: React.ReactNode }): React.ReactElement {
    return <math>{props.children}</math>;
}

// Renders p_prior / p_post, optionally with bin index i
function Prob(props: { which: "prior" | "post"; index?: boolean }): React.ReactElement {
    return (
        <msub>
            <mi>p</mi>
            <mrow>
                <mi mathvariant="normal">{props.which}</mi>
                {props.index && (
                    <>
                        <mo>,</mo>
                        <mi>i</mi>
                    </>
                )}
            </mrow>
        </msub>
    );
}

function Entropy(props: { which: "prior" | "post" }): React.ReactElement {
    return (
        <mrow>
            <mi>H</mi>
            <mo>(</mo>
            <Prob which={props.which} />
            <mo>)</mo>
        </mrow>
    );
}

function SumOverBins(): React.ReactElement {
    return (
        <munder>
            <mo>∑</mo>
            <mi>i</mi>
        </munder>
    );
}

function Log2(): React.ReactElement {
    return (
        <msub>
            <mi>log</mi>
            <mn>2</mn>
        </msub>
    );
}

function UncertaintyReductionEquation(): React.ReactElement {
    return (
        <>
            <MathBlock>
                <mfrac>
                    <mrow>
                        <Entropy which="prior" />
                        <mo>−</mo>
                        <Entropy which="post" />
                    </mrow>
                    <Entropy which="prior" />
                </mfrac>
                <mo>×</mo>
                <mn>100</mn>
                <mo>%</mo>
            </MathBlock>
            <MathBlock>
                <mi>H</mi>
                <mo>(</mo>
                <mi>p</mi>
                <mo>)</mo>
                <mo>=</mo>
                <mo>−</mo>
                <SumOverBins />
                <msub>
                    <mi>p</mi>
                    <mi>i</mi>
                </msub>
                <Log2 />
                <msub>
                    <mi>p</mi>
                    <mi>i</mi>
                </msub>
            </MathBlock>
        </>
    );
}

function InformationGainEquation(): React.ReactElement {
    return (
        <MathBlock>
            <mi>KL</mi>
            <mo>(</mo>
            <Prob which="post" />
            <mo>‖</mo>
            <Prob which="prior" />
            <mo>)</mo>
            <mo>=</mo>
            <SumOverBins />
            <Prob which="post" index />
            <Log2 />
            <mfrac>
                <Prob which="post" index />
                <Prob which="prior" index />
            </mfrac>
        </MathBlock>
    );
}
