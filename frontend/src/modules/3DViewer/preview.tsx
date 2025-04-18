import type { DrawPreviewFunc } from "@framework/Preview";

import previewImg from "./preview.webp";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    return <img src={previewImg} style={{ width, height }} className="object-cover object-center" />;
};
