export interface EnsembleIdentInterface<TImplementation> {
    // createFromString(ensembleIdentString: string): TImplementation;
    getEnsembleName(): string;
    toString(): string;
    equals(otherIdent: TImplementation | null): boolean;
}
