import React from "react";

import { generateSeismicSliceImage } from "@equinor/esv-intersection";

import { isEqual } from "lodash";

export type SeismicSliceImageOptions = {
    dataValues: number[][]; // Array of seismic image data values
    yAxisValues: number[]; // Array of seismic image y axis values
    trajectoryXyPoints: number[][]; // Array of 2D projected points [x, y]
    colormap: string[];
    extension: number; // Needed to keep synched extension
};

export enum SeismicSliceImageStatus {
    SUCCESS = "success",
    LOADING = "loading",
    ERROR = "error",
}

export function useGenerateSeismicSliceImage(data: SeismicSliceImageOptions | null) {
    const [prevData, setPrevData] = React.useState<any>(null);
    const [image, setImage] = React.useState<ImageBitmap | null>(null);
    const [imageStatus, setImageStatus] = React.useState<SeismicSliceImageStatus>(SeismicSliceImageStatus.SUCCESS);
    const [synchedImageOptions, setSynchedImageOptions] = React.useState<SeismicSliceImageOptions | null>(null);

    if (data !== null && !isEqual(data, prevData)) {
        setPrevData(data);
        setImageStatus(SeismicSliceImageStatus.LOADING);

        // Async generation of seismic slice image
        generateSeismicSliceImage(
            { datapoints: data.dataValues, yAxisValues: data.yAxisValues },
            data.trajectoryXyPoints,
            data.colormap,
            {
                isLeftToRight: true,
            }
        )
            .then((result) => {
                setImage(result ?? null);
                setImageStatus(SeismicSliceImageStatus.SUCCESS);
                setSynchedImageOptions(data);
            })
            .catch(() => {
                setImage(null);
                setImageStatus(SeismicSliceImageStatus.ERROR);
                setSynchedImageOptions(data);
            });
    }

    return { image: image, synchedOptions: synchedImageOptions, status: imageStatus };
}
