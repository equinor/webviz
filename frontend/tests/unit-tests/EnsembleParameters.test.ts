import { EnsembleParameters, Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { MinMax } from "@lib/utils/MinMax";

// prettier-ignore
const PARAM_ARR: Parameter[] = [
    {type: ParameterType.CONTINUOUS, name: "cparam_10", groupName: null,   description: "desc10",   isConstant: false, isLogarithmic: false, realizations: [1,2,3], values: [11, 12, 19]},
    {type: ParameterType.CONTINUOUS, name: "cparam_20", groupName: null,   description: "desc20",   isConstant: false, isLogarithmic: false, realizations: [1,2,3], values: [21, 22, 29]},
    {type: ParameterType.CONTINUOUS, name: "cparam_50", groupName: "grp1", description: "desc50g1", isConstant: false, isLogarithmic: false, realizations: [1,2,3], values: [51, 52, 54]},
    {type: ParameterType.CONTINUOUS, name: "cparam_50", groupName: "grp2", description: "desc50g2", isConstant: false, isLogarithmic: false, realizations: [1,2,3], values: [55, 56, 59]},

    {type: ParameterType.DISCRETE, name: "dparam_A", groupName: null, description: "descA", isConstant: false, realizations: [1,2,3], values: [1, 2, 3]},
    {type: ParameterType.DISCRETE, name: "dparam_B", groupName: null, description: "descB", isConstant: false, realizations: [1,2,3], values: ["A", "B", "C"]},
];


describe("EnsembleParameters tests", () => {
    test("Get list of parameter idents", () => {
        const ensParams = new EnsembleParameters(PARAM_ARR);
        {
            const allIdents = ensParams.getParameterIdents(null);
            expect(allIdents.length).toEqual(6);
            expect(allIdents[0]).toEqual(ParameterIdent.fromNameAndGroup("cparam_10", null));
            expect(allIdents[1]).toEqual(ParameterIdent.fromNameAndGroup("cparam_20", null));
            expect(allIdents[2]).toEqual(ParameterIdent.fromNameAndGroup("cparam_50", "grp1"));
            expect(allIdents[3]).toEqual(ParameterIdent.fromNameAndGroup("cparam_50", "grp2"));
            expect(allIdents[4]).toEqual(ParameterIdent.fromNameAndGroup("dparam_A", null));
            expect(allIdents[5]).toEqual(ParameterIdent.fromNameAndGroup("dparam_B", null));
        }
        {
            const contIdents = ensParams.getParameterIdents(ParameterType.CONTINUOUS);
            expect(contIdents.length).toEqual(4);
            expect(contIdents[0]).toEqual(ParameterIdent.fromNameAndGroup("cparam_10", null));
            expect(contIdents[1]).toEqual(ParameterIdent.fromNameAndGroup("cparam_20", null));
            expect(contIdents[2]).toEqual(ParameterIdent.fromNameAndGroup("cparam_50", "grp1"));
            expect(contIdents[3]).toEqual(ParameterIdent.fromNameAndGroup("cparam_50", "grp2"));
        }
        {
            const discIdents = ensParams.getParameterIdents(ParameterType.DISCRETE);
            expect(discIdents.length).toEqual(2);
            expect(discIdents[0]).toEqual(ParameterIdent.fromNameAndGroup("dparam_A", null));
            expect(discIdents[1]).toEqual(ParameterIdent.fromNameAndGroup("dparam_B", null));
        }
    });

    test("Check for parameter existence", () => {
        const ensParams = new EnsembleParameters(PARAM_ARR);

        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("cparam_10", null))).toBe(true);
        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("cparam_50", "grp1"))).toBe(true);
        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("cparam_50", "grp2"))).toBe(true);

        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("aName", "aGroup"))).toBe(false);
        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("", ""))).toBe(false);
        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("cparam_10", ""))).toBe(false);
        expect(ensParams.hasParameter(ParameterIdent.fromNameAndGroup("cparam_50", null))).toBe(false);
    });

    test("Get parameters", () => {
        const ensParams = new EnsembleParameters(PARAM_ARR);
        {
            const par = ensParams.getParameter(ParameterIdent.fromNameAndGroup("cparam_10", null));
            expect(par.type).toEqual(ParameterType.CONTINUOUS);
            expect(par.name).toEqual("cparam_10");
            expect(par.groupName).toEqual(null);
            expect(par.values).toEqual([11, 12, 19]);
        }
        {
            const par = ensParams.getParameter(ParameterIdent.fromNameAndGroup("cparam_50", "grp2"));
            expect(par.type).toEqual(ParameterType.CONTINUOUS);
            expect(par.name).toEqual("cparam_50");
            expect(par.groupName).toEqual("grp2");
            expect(par.values).toEqual([55, 56, 59]);
        }
        {
            const par = ensParams.getParameter(ParameterIdent.fromNameAndGroup("dparam_B", null));
            expect(par.type).toEqual(ParameterType.DISCRETE);
            expect(par.name).toEqual("dparam_B");
            expect(par.groupName).toEqual(null);
            expect(par.values).toEqual(["A", "B", "C"]);
        }
    });

    test("Check that getting non-existing parameter throws", () => {
        const ensParams = new EnsembleParameters(PARAM_ARR);
        expect(() => ensParams.getParameter(ParameterIdent.fromNameAndGroup("someBogusName", null))).toThrow();
    });

    test("Test getting min/max values for continuous parameter", () => {
        const ensParams = new EnsembleParameters(PARAM_ARR);
        {
            const minMax = ensParams.getContinuousParameterMinMax(ParameterIdent.fromNameAndGroup("cparam_10", null));
            expect(minMax).toEqual(new MinMax(11, 19));
        }
        {
            const minMax = ensParams.getContinuousParameterMinMax(ParameterIdent.fromNameAndGroup("cparam_50", "grp1"));
            expect(minMax).toEqual(new MinMax(51, 54));
        }
    });
});


describe("ParameterIdent tests", () => {
    test("Conversion to/from string", () => {
        {
            const identStr = ParameterIdent.fromNameAndGroup("aName", "aGroup").toString();
            const ident = ParameterIdent.fromString(identStr);
            expect(ident.name).toEqual("aName");
            expect(ident.groupName).toEqual("aGroup");
        }
        {
            const identStr = ParameterIdent.fromNameAndGroup("aName", null).toString();
            const ident = ParameterIdent.fromString(identStr);
            expect(ident.name).toEqual("aName");
            expect(ident.groupName).toEqual(null);
        }
    });

    test("Check for equality", () => {
        const identA = new ParameterIdent("aName", "aGroup");
        const identB = new ParameterIdent("aName", "aGroup");
        const identC = new ParameterIdent("anotherName", "anotherGroup");
        expect(identA.equals(identA)).toBe(true);
        expect(identA.equals(identB)).toBe(true);
        expect(identA.equals(identC)).toBe(false);
        expect(identA.equals(null)).toBe(false);
    });
});
