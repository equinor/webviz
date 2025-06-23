import FmuLogoAnimated from "@assets/fmuAnimated.svg";

export type LoadingOverlayProps = {
    text: string;
};

export function LoadingOverlay(props: LoadingOverlayProps): JSX.Element {
    return (
        <div className="fixed inset-0 z-100 w-full h-full flex items-center justify-center bg-white/50 backdrop-blur-xs">
            <div className="flex items-center justify-center flex-col gap-8">
                <img src={FmuLogoAnimated} alt="FMU Analysis animated logo" className="w-32 h-32" />
                {props.text}
            </div>
        </div>
    );
}
