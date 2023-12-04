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

export type SeismicSliceImageData = {
    image: ImageBitmap | null;
    synchedOptions: SeismicSliceImageOptions | null;
    status: SeismicSliceImageStatus;
};

/**
 * Hook to generate seismic slice image for async utility.
 *
 * Returns image, synched image options used to generate the image, and image status.
 */
export function useGenerateSeismicSliceImageData(imageOptions: SeismicSliceImageOptions | null): SeismicSliceImageData {
    const [prevData, setPrevData] = React.useState<any>(null);
    const [image, setImage] = React.useState<ImageBitmap | null>(null);
    const [imageStatus, setImageStatus] = React.useState<SeismicSliceImageStatus>(SeismicSliceImageStatus.SUCCESS);
    const [synchedImageOptions, setSynchedImageOptions] = React.useState<SeismicSliceImageOptions | null>(null);

    if (imageOptions !== null && !isEqual(imageOptions, prevData)) {
        setPrevData(imageOptions);
        setImageStatus(SeismicSliceImageStatus.LOADING);

        // Async generation of seismic slice image
        generateSeismicSliceImage(
            { datapoints: imageOptions.dataValues, yAxisValues: imageOptions.yAxisValues },
            imageOptions.trajectoryXyPoints,
            imageOptions.colormap,
            {
                isLeftToRight: true,
            }
        )
            .then((result) => {
                setImage(result ?? null);
                setImageStatus(SeismicSliceImageStatus.SUCCESS);
                setSynchedImageOptions(imageOptions);
            })
            .catch(() => {
                setImage(null);
                setImageStatus(SeismicSliceImageStatus.ERROR);
                setSynchedImageOptions(imageOptions);
            });
    }

    // Slice image data
    return { image: image, synchedOptions: synchedImageOptions, status: imageStatus };
}
