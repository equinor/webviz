import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { file_description } from "@equinor/eds-icons";
import Markdown from "react-markdown";

// import testimg from "@docs/images/changelog_system.png";
import ChangelogMd from "@docs/WEBVIZ_CHANGELOG.md";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Typography } from "@lib/components/Typography";
import { Heading, Paragraph } from "@lib/components/Typography/compositions";

Icon.add({ file_description });

export function ChangelogDialog(): React.ReactNode {
    const [open, setOpen] = React.useState(true);

    // const metadataLines: string[] = [];
    let markdownContent = ChangelogMd;

    const metadata = new Map();

    if (ChangelogMd.startsWith("%")) {
        const lines = ChangelogMd.split("\n");

        let i = 0;

        while (i < lines.length && lines[i].startsWith("%")) {
            // metadataLines.push(lines[i]);
            const line = lines[i].substring(1).trim(); // Remove the leading '%' and trim whitespace
            const [key, value] = line.split(/\s*:\s*/);

            metadata.set(key, value);

            i++;
        }

        markdownContent = lines.slice(i).join("\n");
    }

    return (
        <>
            <Button tone="accent" variant="ghost" onClick={() => setOpen(true)}>
                <Icon name="file_description" fontSize="inherit" />
                Changelog
            </Button>

            <Dialog.Popup open={open} onOpenChange={setOpen}>
                <Dialog.Header>
                    <Dialog.Title>Changelog</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>
                <div className="max-h-[50vh] overflow-y-auto">
                    <Dialog.Body>
                        <Markdown
                            disallowedElements={["h1"]}
                            components={{
                                h2: (props) => <Heading layoutClassName="not-first:mt-2xl" as="h2" {...props} />,
                                h3: (props) => <Heading layoutClassName="mt-xs mb-4xs" as="h3" {...props} />,
                                h4: (props) => <Heading layoutClassName="mt-xs mb-4xs" as="h4" {...props} />,
                                h5: (props) => <Heading layoutClassName="mt-xs mb-4xs" as="h5" {...props} />,
                                h6: (props) => <Heading layoutClassName="mt-xs mb-4xs" as="h6" {...props} />,
                                ul: (props) => (
                                    <Typography layoutClassName="list-disc ml-md" as="ul" size="md" {...props} />
                                ),
                                li: (props) => <Typography as="li" size="md" {...props} />,
                                p: (props) => <Paragraph size="md" {...props} />,
                                img: (props) => (
                                    <img
                                        {...props}
                                        className="my-2xs rounded-md"
                                        src={props.src?.replace("./", "/docs/")}
                                    />
                                ),
                            }}
                        >
                            {markdownContent}
                        </Markdown>
                    </Dialog.Body>
                </div>
                <Dialog.Actions>
                    <Button variant="ghost" tone="neutral" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}
// "@docs/*": ["./docs/*"],
