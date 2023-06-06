import { SeismicCubeSchema } from "@api";

export class SeismicCubeAccessor {
    private seismicCubeDirectory: SeismicCubeSchema[] 

    constructor(seismicCubeDirectory: SeismicCubeSchema[]) {
        if (seismicCubeDirectory.length === 0) {
            throw new Error("SeismicCubeAccessor: seismicCubeDirectory is empty");
        }
        this.seismicCubeDirectory = seismicCubeDirectory;
        console.log("seismicCubeDirectory", seismicCubeDirectory)
    }
    public getAllAttributes(): string[] {
        return this.seismicCubeDirectory.map(cube => cube.name);
    }
    public getTimeStampsForAttribute(attribute: string): string[] {
        const cube = this.seismicCubeDirectory.find(cube => cube.name === attribute);
        if (cube && cube.timestamps) {
            return [...new Set(cube.timestamps)];
        } else {
            return [];
        }
    }
    public getTimeStepsForAttribute(attribute: string): string[] {
        const cube = this.seismicCubeDirectory.find(cube => cube.name === attribute);
        if (cube && cube.timesteps) {
            return [...new Set(cube.timesteps)];
        } else {
            return [];
        }
    }    
}