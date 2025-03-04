#!/usr/bin/env node

const fs = require("fs").promises;
const util = require("util");
const zlib = require("zlib");

const glob = require("glob");

const compFunction = util.promisify(zlib.brotliCompress);
const settings = {
    params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
    },
};

const compressFile = (filePath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const compFilePath = `${filePath}.br`;

            const buffer = await fs.readFile(filePath);

            await fs.writeFile(compFilePath, await compFunction(buffer, settings));

            const origSize = (await fs.stat(filePath)).size;
            const compSize = (await fs.stat(compFilePath)).size;

            const reduction = (100 * (origSize - compSize)) / origSize;

            console.info(`${filePath} → ${compFilePath} (${reduction.toFixed(1)} % reduction)`);

            return resolve();
        } catch (err) {
            reject(err);
        }
    });
};

glob.glob(
    "dist/assets/*.{json,js,css,svg}",
    async (_err, files) => await Promise.all(files.map((file) => compressFile(file))),
);
