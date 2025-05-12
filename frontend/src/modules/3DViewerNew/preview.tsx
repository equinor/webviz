import { DrawPreviewFunc } from "@framework/Preview";
import previewImg from "./preview.jpg";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    return <image href={previewImg} width={width} height={height} />;
};
