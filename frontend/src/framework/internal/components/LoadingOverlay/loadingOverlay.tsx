import { WebvizSpinner } from "@lib/components/WebvizSpinner";

export function LoadingOverlay(): JSX.Element {
    return (
        <div className="fixed inset-0 z-[100] w-full h-full flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm">
            <div className="flex items-center justify-center flex-col gap-8">
                <WebvizSpinner size={100} />
                Loading ensembles...
            </div>
        </div>
    );
}
