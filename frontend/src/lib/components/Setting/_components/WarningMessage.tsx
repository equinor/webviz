import { Banner } from "@lib/components/Banner";

export type WarningMessageProps = {
    /** The warning text displayed in the banner. */
    message: string;
};

/**
 * Non-blocking warning banner shown inside a `Setting.Field`, below its input content. Use for a
 * partial failure (field still usable); for a complete failure, use `errorOverlay`/`overlay` instead.
 */
export function WarningMessage({ message }: WarningMessageProps) {
    return (
        <Banner layoutClassName="w-full mt-2xs" tone="warning">
            {message}
        </Banner>
    );
}
