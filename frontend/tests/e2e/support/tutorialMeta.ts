/**
 * Metadata describing a story test as a published tutorial video.
 *
 * `slug` is the stable identifier used both for the published video/thumbnail filenames in Azure
 * Blob Storage and as the key tying this test to its entry in the generated tutorials manifest
 * (see frontend/scripts/generate-tutorials-manifest.js). Never change it once a story has been
 * recorded and published, or existing links will break.
 *
 * Declared in a side-effect-free `<story>.meta.ts` sidecar next to each story so the manifest
 * generator can import it directly — the `.test.ts` file registers Playwright tests on import and
 * can't be imported outside the runner.
 */
export type TutorialMeta = {
    slug: string;
    category: string;
    title: string;
    description: string;
    /** Optional sort weight within a category (ascending); unset tutorials sort after ordered ones. */
    order?: number;
};
