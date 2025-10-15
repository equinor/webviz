import { WebAsset } from "@mui/icons-material";

export type EmptyLayoutProps = {
    visible: boolean;
};

export function EmptyLayout(props: EmptyLayoutProps) {
    if (!props.visible) {
        return null;
    }

    return (
        <div className="flex flex-col justify-center items-center w-full h-full text-slate-400 gap-4 text-center p-4 text-sm">
            <WebAsset fontSize="large" />
            Drag modules here to add them to the layout
        </div>
    );
}
