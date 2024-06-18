/*
Returns the corresponding i, j, k indices for a given cell index in a 3D grid.

See: https://github.com/OPM/ResInsight/blob/809f5597923672a8fca1725231c39d2a0e053a0c/ApplicationLibCode/ReservoirDataModel/RigGridBase.cpp#L209
*/
export function ijkFromCellIndex(cellIndex: number, cellCountI: number, cellCountJ: number): [number, number, number] {
    const i = cellIndex % cellCountI;
    const j = Math.floor(cellIndex / cellCountI) % cellCountJ;
    const k = Math.floor(cellIndex / (cellCountI * cellCountJ));
    return [i, j, k];
}
