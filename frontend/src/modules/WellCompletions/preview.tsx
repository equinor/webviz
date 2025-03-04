import type { DrawPreviewFunc } from "@framework/Preview";
import previewImg from "./preview.svg";
 
export const preview: DrawPreviewFunc = function (width: number, height: number) {
   return <img src={previewImg} style={{width, height}} />
};
