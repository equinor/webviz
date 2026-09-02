/**
 * Metadata describing a story test as a published tutorial video.
 *
 * `slug` is the stable identifier used both for the published video/thumbnail filenames in Azure
 * Blob Storage and as the key tying this test to its entry in the generated tutorials manifest
 * (see frontend/scripts/generate-tutorials-manifest.js). Never change it once a story has been
 * recorded and published, or existing links will break.
 */
export type TutorialMeta = {
    slug: string;
    category: string;
    title: string;
    description: string;
    /** Optional sort weight within a category (ascending); unset tutorials sort after ordered ones. */
    order?: number;
};

/**
 * Identity helper — exists only so `frontend/scripts/lib/parseTutorialMeta.js` has a recognizable
 * `tutorialMeta({...})` call to statically parse out of the test file's source text (the object is
 * never executed by the generator). Keep the argument a plain object literal with string literal
 * values only.
 */
export function tutorialMeta(meta: TutorialMeta): TutorialMeta {
    return meta;
}
