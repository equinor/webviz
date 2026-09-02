import React from "react";

import type { Options } from "react-markdown";
import Markdown from "react-markdown";

import { Banner } from "@lib/components/Banner";
import { Separator } from "@lib/components/Separator";
import { Typography } from "@lib/components/Typography";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";

export type MarkdownWrapperProps = Options;

export function MarkdownWrapper(props: MarkdownWrapperProps): React.ReactNode {
    const components = React.useMemo<Options["components"]>(
        () => ({
            h1: (props) => <Heading layoutClassName="not-first:mt-2xl" as="h1" {...props} />,
            h2: (props) => <Heading layoutClassName="not-first:mt-xl" as="h2" {...props} />,
            h3: (props) => <Heading layoutClassName="not-first:mt-lg mb-4xs" as="h3" {...props} />,
            h4: (props) => <Heading layoutClassName="not-first:mt-md mb-4xs" as="h4" {...props} />,
            h5: (props) => <Heading layoutClassName="not-first:mt-sm mb-4xs" as="h5" {...props} />,
            h6: (props) => <Heading layoutClassName="not-first:mt-xs mb-4xs" as="h6" {...props} />,
            ul: (props) => <Typography layoutClassName="list-disc list ml-md" as="ul" size="md" {...props} />,
            ol: (props) => <Typography layoutClassName="list-decimal ml-md" as="ol" size="md" {...props} />,
            li: (props) => <li {...props} />,
            p: (props) => <Paragraph size="md" {...props} />,
            hr: () => <Separator layoutClassName="my-lg!" />,
            a: (props) => <a {...props} className="text-accent-subtle hover:underline" />,
            img: (props) => <img {...props} className="my-2xs mr-md max-w-xl rounded-md" />,
            pre: (props) => <pre {...props} className="bg-backdrop/20 p-sm border-neutral-strong rounded-md border" />,
            code: (props) => (
                <code
                    {...props}
                    className="not-[&:where(pre_code)]:bg-backdrop/20 not-[&:where(pre_code)]:border-neutral-strong not-[&:where(pre_code)]:px-3xs rounded border border-transparent"
                />
            ),
            blockquote: (props) => (
                <Banner tone="info" layoutClassName="italic">
                    {props.children}
                </Banner>
            ),
            ...props.components,
        }),
        [props.components],
    );

    return (
        <div className="markdown-wrapper">
            <Markdown {...props} components={components}>
                {props.children}
            </Markdown>
        </div>
    );
}
