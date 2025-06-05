/**
 * A polyline and actual section lengths.
 *
 * The polyline has coordinates in UTM XY, with interleaved x and y values.
 * The actual section lengths are the actual lengths of the polyline sections, i.e. length
 * between each pair of consecutive (x,y)-points.
 *
 * A polyline can be simplified or down-sampled, thereby the actual section lengths are
 * the actual lengths of the polyline sections, not the linear distance between the points.
 *
 * The polylineUtmXy array is a flat array of: [x1, y1, x2, y2, ..., xn, yn].
 * The actualSectionLengths array is flat array of: [length1, length2, ..., lengthn-1].
 *
 * Example:
 *
 *  p1 = (polylineUtmXy[0], polylineUtmXy[1]) = (x1, y1)
 *  p2 = (polylineUtmXy[2], polylineUtmXy[3]) = (x2, y2)
 *  length1 = actualSectionLengths[0] = actual length between p1 and p2
 *
 */
export type PolylineWithSectionLengths = {
    polylineUtmXy: number[];
    actualSectionLengths: number[];
};
