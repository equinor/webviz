import type { DrawPreviewFunc } from "@framework/Preview";

export type PreviewImageProps = {
    size: number;
    drawPreviewFunc: DrawPreviewFunc | null;
};

export function PreviewImage(props: PreviewImageProps): React.ReactNode {
    const { size, drawPreviewFunc } = props;

    if (!drawPreviewFunc) {
        return (
            <div className="border-neutral-subtle bg-neutral flex h-full w-full items-center justify-center border" />
        );
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {drawPreviewFunc(size, size)}
        </svg>
    );
}
