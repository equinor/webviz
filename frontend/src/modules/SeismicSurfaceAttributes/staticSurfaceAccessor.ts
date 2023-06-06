import { StaticSurfaceDirectory } from "@api";

export class StaticSurfaceAccessor {
    private staticSurfaceDirectory: StaticSurfaceDirectory 

    constructor(staticSurfaceDirectory: StaticSurfaceDirectory) {
        if (staticSurfaceDirectory.names.length === 0) {
            throw new Error("StaticSurfaceAccessor: staticSurfaceDirectory is empty");
        }
        this.staticSurfaceDirectory = staticSurfaceDirectory;
        console.log("staticSurfaceDirectory", staticSurfaceDirectory)
    }
    public getAllAttributes(): string[] {
        return this.staticSurfaceDirectory.attributes;
    }
    public getAllNames(): string[] {
        return this.staticSurfaceDirectory.names;
    }
    public getAttributesForName(name: string): string[] {
        
        const indexOfName = this.staticSurfaceDirectory.names.indexOf(name);
        const attributeIndexes = this.staticSurfaceDirectory.valid_attributes_for_name[indexOfName];
        const attributes = attributeIndexes.map((attributeIndex) => {
            return this.staticSurfaceDirectory.attributes[attributeIndex];
        }
        );
        return attributes;
            
        
    }
    
}