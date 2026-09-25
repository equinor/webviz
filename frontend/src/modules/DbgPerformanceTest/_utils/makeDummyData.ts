export function makeDummyData(sizeMb: number): Float64Array {
    const numElements = Math.max(1, Math.floor((sizeMb * 1024 * 1024) / Float64Array.BYTES_PER_ELEMENT));
    const data = new Float64Array(numElements);
    for (let i = 0; i < numElements; i++) {
        data[i] = Math.random();
    }
    return data;
}
