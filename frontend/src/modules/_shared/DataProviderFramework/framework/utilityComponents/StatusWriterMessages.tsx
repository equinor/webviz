import { Error, Info, Warning } from "@mui/icons-material";

import type { StatusMessage } from "@framework/types/statusWriter";
import { StatusMessageType } from "@framework/types/statusWriter";
import { Popover } from "@lib/components/Popover";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type StatusMessagesProps = { statusMessages: readonly StatusMessage[] };

export function StatusMessages(props: StatusMessagesProps) {
    const numInfo = props.statusMessages.filter((m) => m.type === StatusMessageType.Info).length;
    const numWarnings = props.statusMessages.filter((m) => m.type === StatusMessageType.Warning).length;
    const numErrors = props.statusMessages.filter((m) => m.type === StatusMessageType.Error).length;

    if (numInfo === 0 && numWarnings === 0 && numErrors === 0) {
        return null;
    }

    return (
        <Popover.Root>
            <Popover.Trigger tone="neutral" size="small" variant="ghost" iconOnly>
                <div className="flex items-center whitespace-nowrap">
                    <Info
                        style={{ fontSize: 16, display: numInfo === 0 ? "none" : "block" }}
                        className="text-info-subtle"
                    />
                    <Warning
                        style={{ fontSize: 16, display: numWarnings === 0 ? "none" : "block" }}
                        className={resolveClassNames("text-warning-subtle", { "-ml-xs": numInfo > 0 })}
                    />
                    <Error
                        style={{ fontSize: 16, display: numErrors === 0 ? "none" : "block" }}
                        className={resolveClassNames("text-danger-subtle", {
                            "-ml-xs": numInfo > 0 || numWarnings > 0,
                        })}
                    />
                </div>
            </Popover.Trigger>
            <Popover.Popup>
                <Popover.Content>
                    <ul className="gap-y-2xs flex flex-col">
                        {props.statusMessages.map((entry) => (
                            <li
                                key={`${entry.type}-${entry.message}-${entry.source}`}
                                className="gap-x-2xs flex items-center"
                            >
                                <Typography
                                    as="span"
                                    size="xs"
                                    title={entry.message}
                                    tone="neutral"
                                    layoutClassName="gap-x-2xs flex items-center"
                                >
                                    {entry.type === StatusMessageType.Info && (
                                        <Info fontSize="inherit" className="text-info-subtle" />
                                    )}
                                    {entry.type === StatusMessageType.Warning && (
                                        <Warning fontSize="inherit" className="text-warning-subtle" />
                                    )}
                                    {entry.type === StatusMessageType.Error && (
                                        <Error fontSize="inherit" className="text-danger-subtle" />
                                    )}
                                    {entry.message}
                                </Typography>
                            </li>
                        ))}
                    </ul>
                </Popover.Content>
            </Popover.Popup>
        </Popover.Root>
    );
}
