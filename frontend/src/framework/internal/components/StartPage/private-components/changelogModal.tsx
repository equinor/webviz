import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { file_description } from "@equinor/eds-icons";
import { Circle } from "@mui/icons-material";

import { extractMarkdownMetadata, MarkdownWrapper } from "@framework/internal/MarkdownWrapper";
import { useUserSettings } from "@framework/internal/providers/UserSettingsProvider";
import { Button } from "@lib/components/Button";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Dialog } from "@lib/components/Dialog";

import ChangelogMd from "@docs/WEBVIZ_CHANGELOG.md";

Icon.add({ file_description });

export function ChangelogDialog(): React.ReactNode {
    const [open, setOpen] = React.useState(false);

    const {
        settings: { disableChangelogPopup, lastSeenChangelog },
        setDisableChangelogPopup,
        setLastSeenChangelog,
    } = useUserSettings();

    const [markdown, metadata] = extractMarkdownMetadata(ChangelogMd);

    const currentRelease = Number(metadata.get("release"));

    const hasSeenRelease = currentRelease <= lastSeenChangelog;

    React.useEffect(() => {
        if (!hasSeenRelease && !disableChangelogPopup) {
            setOpen(true);
            setLastSeenChangelog(currentRelease);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- should only check on mount
    }, []);

    return (
        <>
            <Button
                layoutClassName="group"
                tone="accent"
                variant="ghost"
                onClick={() => {
                    setLastSeenChangelog(currentRelease);
                    setOpen(true);
                }}
            >
                <div className="relative">
                    <Icon name="file_description" fontSize="inherit" />
                    {!hasSeenRelease && (
                        <div className="absolute -top-1.5 -right-0.5">
                            <Circle
                                fontSize="inherit"
                                // Weird class name since we need to apply the stroke to the nested path
                                className="**:stroke-canvas group-hover:**:stroke-accent-hover overflow-visible! duration-150 **:stroke-6 **:transition-[stroke]"
                                color="warning"
                            />
                        </div>
                    )}
                </div>
                Changelog
            </Button>

            <Dialog.Popup
                open={open}
                onOpenChange={(newValue) => {
                    if (newValue) setLastSeenChangelog(currentRelease);
                    setOpen(newValue);
                }}
            >
                <Dialog.Header>
                    <Dialog.Title>Changelog</Dialog.Title>
                    <Dialog.Close />
                </Dialog.Header>
                <div className="max-h-[80vh] overflow-y-auto">
                    <Dialog.Body>
                        <MarkdownWrapper disallowedElements={["h1"]}>{markdown}</MarkdownWrapper>
                    </Dialog.Body>
                </div>
                <Dialog.Actions>
                    <Button.AsLink
                        layoutClassName="mr-auto"
                        // TODO: Should keep a more explicit release number with a tag
                        href="https://github.com/equinor/webviz/tree/main/docs/WEBVIZ_CHANGELOG.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        tone="accent"
                        external
                    >
                        Full changelog
                    </Button.AsLink>
                    <CheckboxCompositions.WithLabel
                        size="small"
                        checked={disableChangelogPopup}
                        onCheckedChange={setDisableChangelogPopup}
                    >
                        {"Don't show this again"}
                    </CheckboxCompositions.WithLabel>
                    <Button variant="ghost" tone="accent" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </Dialog.Actions>
            </Dialog.Popup>
        </>
    );
}
