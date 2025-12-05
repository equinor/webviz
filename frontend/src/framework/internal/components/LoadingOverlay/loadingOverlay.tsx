import FmuLogoAnimated from "@assets/fmuAnimated.svg";

export type LoadingOverlayProps = {
    text: string;
    note?: string;
};

export function LoadingOverlay(props: LoadingOverlayProps): JSX.Element {
    return (
        <div className="fixed inset-0 z-100 w-full h-full flex items-center justify-center bg-white/50 backdrop-blur-xs">
            <div className="flex items-center justify-center flex-col gap-8">
                <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="w-32 h-32" />
                <div className="flex flex-col items-center justify-center text-center gap-3">
                    <span className="text-3xl font-semibold">{props.text}</span>
                    {props.note && (
                        <span className="italic text-md text-gray-700 leading-relaxed whitespace-pre-line">
                            {props.note}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
