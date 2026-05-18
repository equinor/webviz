import FmuLogoAnimated from "@assets/fmuAnimated.svg";
import { Heading, Paragraph } from "@lib/newComponents/Typography/compositions";

export type LoadingOverlayProps = {
    text: string;
    note?: string;
};

export function LoadingOverlay(props: LoadingOverlayProps): JSX.Element {
    return (
        <div className="z-tooltip fixed inset-0 flex h-full w-full items-center justify-center bg-white/50 backdrop-blur-xs">
            <div className="gap-vertical-md flex flex-col items-center justify-center">
                <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="h-32 w-32" />
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <Heading as="h6">{props.text}</Heading>
                    {props.note && (
                        <Paragraph size="md" className="whitespace-pre-line italic">
                            {props.note}
                        </Paragraph>
                    )}
                </div>
            </div>
        </div>
    );
}
