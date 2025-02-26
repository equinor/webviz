// This is used to set colors for different states throughout the application where CSS properties are not accessible (e.g. WebGL).
// However, it should be in sync with what is set in Tailwind CSS.
// The location of this file can still be decided upon.
export type Colors = {
    hover: [number, number, number];
    selected: [number, number, number];
};
export const COLORS: Colors = {
    hover: [191, 219, 254],
    selected: [37, 99, 235],
};
