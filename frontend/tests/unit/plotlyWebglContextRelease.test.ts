import { describe, expect, it } from "vitest";

import { patchPlotlySource } from "../../vite-plugin-plotly-webgl-context-release.js";

const CLEAN_PLOT = `if (hadGl && !hasGl) {
    if (oldFullLayout._glcontainer !== void 0) {
        oldFullLayout._glcontainer.selectAll(".gl-canvas").remove();
    }
}`;

function makeSource(parameter: string, layoutParameter = parameter): string {
    return `${CLEAN_PLOT}
plots.purge = function(${parameter}) {
    var fullLayout = ${layoutParameter}._fullLayout || {};
    if (fullLayout._glcontainer !== void 0) {
        fullLayout._glcontainer.selectAll(".gl-canvas").remove();
    }
}`;
}

describe("patchPlotlySource", function () {
    it.each(["gd", "gd3"])("patches purge with the %s bundle parameter", function (parameter) {
        const patched = patchPlotlySource(makeSource(parameter));

        expect(patched).toContain("if(oldFullLayout._glcanvas&&oldFullLayout._glcanvas.each)");
        expect(patched).toContain("if(fullLayout._glcanvas&&fullLayout._glcanvas.each)");
        expect(patched.indexOf("if(fullLayout._glcanvas")).toBeLessThan(
            patched.indexOf('fullLayout._glcontainer.selectAll(".gl-canvas").remove();'),
        );
    });

    it("rejects a purge function that reads from a different parameter", function () {
        expect(() => patchPlotlySource(makeSource("gd3", "gd"))).toThrow("patched 1");
    });
});
