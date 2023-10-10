export class ParameterIdent {
    readonly name: string;
    readonly groupName: string | null;

    constructor(name: string, groupName: string | null) {
        this.name = name;
        this.groupName = groupName;
    }

    static fromNameAndGroup(name: string, groupName: string | null): ParameterIdent {
        return new ParameterIdent(name, groupName);
    }

    static fromString(paramIdentString: string): ParameterIdent {
        const parts = paramIdentString.split("~@@~");
        if (parts.length === 1) {
            return new ParameterIdent(parts[0], null);
        }
        if (parts.length === 2) {
            return new ParameterIdent(parts[0], parts[1]);
        }

        throw new Error(`Invalid parameter ident string: ${paramIdentString}`);
    }

    toString(): string {
        if (this.groupName) {
            return `${this.name}~@@~${this.groupName}`;
        } else {
            return this.name;
        }
    }

    equals(otherIdent: ParameterIdent | null): boolean {
        if (!otherIdent) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this.name === otherIdent.name && this.groupName === otherIdent.groupName;
    }
}
