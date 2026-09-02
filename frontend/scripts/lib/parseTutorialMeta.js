import fs from "fs";

import ts from "typescript";

const REQUIRED_FIELDS = ["slug", "category", "title", "description"];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Statically parse the `export const meta = tutorialMeta({...})` declaration out of a story test
 * file's source text (the file is never executed/imported — it's a Playwright test file that would
 * otherwise try to register tests outside of the test runner).
 *
 * Returns `{ slug, category, title, description, sourceFile }`. Throws a descriptive error if the
 * declaration is missing, malformed, or any required field is missing/invalid.
 */
export function parseTutorialMeta(filePath) {
    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    let metaInitializer = null;
    sourceFile.forEachChild((node) => {
        if (!ts.isVariableStatement(node)) {
            return;
        }
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (!isExported) {
            return;
        }
        for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === "meta" && decl.initializer) {
                metaInitializer = decl.initializer;
            }
        }
    });

    if (!metaInitializer) {
        throw new Error(`${filePath}: no "export const meta = tutorialMeta({...})" declaration found.`);
    }

    if (
        !ts.isCallExpression(metaInitializer) ||
        !ts.isIdentifier(metaInitializer.expression) ||
        metaInitializer.expression.text !== "tutorialMeta"
    ) {
        throw new Error(`${filePath}: "meta" must be assigned from a "tutorialMeta({...})" call.`);
    }

    const [arg] = metaInitializer.arguments;
    if (!arg || !ts.isObjectLiteralExpression(arg)) {
        throw new Error(`${filePath}: "tutorialMeta(...)" must be called with a plain object literal.`);
    }

    const result = {};
    for (const prop of arg.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
            continue;
        }
        if (prop.name.text === "order") {
            if (!ts.isNumericLiteral(prop.initializer)) {
                throw new Error(
                    `${filePath}: property "order" must be a numeric literal (found ${ts.SyntaxKind[prop.initializer.kind]}).`,
                );
            }
            result.order = Number(prop.initializer.text);
            continue;
        }
        if (!ts.isStringLiteralLike(prop.initializer)) {
            throw new Error(
                `${filePath}: property "${prop.name.text}" must be a plain string literal (found ${ts.SyntaxKind[prop.initializer.kind]}).`,
            );
        }
        result[prop.name.text] = prop.initializer.text;
    }

    const missing = REQUIRED_FIELDS.filter((field) => !result[field]);
    if (missing.length > 0) {
        throw new Error(`${filePath}: missing required tutorialMeta field(s): ${missing.join(", ")}.`);
    }

    if (!SLUG_RE.test(result.slug)) {
        throw new Error(
            `${filePath}: slug "${result.slug}" must be kebab-case (lowercase letters, digits and hyphens only).`,
        );
    }

    return {
        slug: result.slug,
        category: result.category,
        title: result.title,
        description: result.description,
        order: result.order,
        sourceFile: filePath,
    };
}
