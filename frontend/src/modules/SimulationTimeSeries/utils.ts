export function find_intermediate_color(
    lowcolor: string,
    highcolor: string,
    intermed: number,
    colortype: string = "tuple"
): string {
    /*
    Returns the color at a given distance between two colors
    This function takes two color strings in the format 'rgba(r,g,b,a)', where
    each value is between 0 and 255, along with a value 0 < intermed < 1 and
    returns a color that is intermed-percent from lowcolor to highcolor. If
    colortype is set to 'rgba', the function will return the intermediate color
    as an rgba string. Otherwise, the function will return the intermediate
    color as a tuple in the format (r, g, b, a).
    */

    const unlabel_rgba = (color: string) => {
        const rgba = color.match(/\d+(\.\d+)?/g) || [];
        return rgba.map(Number);
    };

    const label_rgba = (rgba: number[]) => {
        return `rgba(${rgba.join(", ")})`;
    };

    if (colortype === "rgba") {
        // convert to tuple color, e.g. [255, 18, 67, 1]
        const low = unlabel_rgba(lowcolor);
        const high = unlabel_rgba(highcolor);

        const diff_0 = high[0] - low[0];
        const diff_1 = high[1] - low[1];
        const diff_2 = high[2] - low[2];
        const diff_3 = high[3] - low[3];

        const inter_med_tuple = [low[0] + intermed * diff_0,
        low[1] + intermed * diff_1,
        low[2] + intermed * diff_2,
        low[3] + intermed * diff_3,
        ];

        // back to an rgba string, e.g. rgba(30, 20, 10, 1)
        const inter_med_rgba = label_rgba(inter_med_tuple);
        return inter_med_rgba;
    }

    // colortype is "tuple"
    const low = lowcolor.split(",");
    const high = highcolor.split(",");
    const diff_0 = Number(high[0]) - Number(low[0]);
    const diff_1 = Number(high[1]) - Number(low[1]);
    const diff_2 = Number(high[2]) - Number(low[2]);
    const diff_3 = Number(high[3]) - Number(low[3]);

    const inter_med_tuple = [Number(low[0]) + intermed * diff_0,
    Number(low[1]) + intermed * diff_1,
    Number(low[2]) + intermed * diff_2,
    Number(low[3]) + intermed * diff_3,
    ];

    return `${inter_med_tuple.join(", ")}`;
}
