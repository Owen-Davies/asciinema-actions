import {blockToJson, MarkdownToAsccicast} from "../asciicast";
import path from "path";
import fs from "fs";
import {GenerateArguments} from "../types";

const concat = require('mississippi').concat;
// const debug = require('debug')('mta');
const readFile = require('fs').readFile;


interface OutputOptions {
    prefix: string
    outputFile: string
    outDir: string
}

/**
 *
 * @param str
 * @param prefix
 * @param outputFile
 * @param outDir
 * @param renderingOptions
 */
async function parse(str: any, {
    prefix,
    outputFile,
    outDir
}: OutputOptions, {renderingOptions}: GenerateArguments): Promise<void> {
    const markdown: string = Buffer.from(str).toString()
    const ascc = new MarkdownToAsccicast({
        title: "demo"
    }, renderingOptions)
    const cast = ascc.parseAll(markdown)
    const wp = path.join(path.resolve(outDir))

    const template = await ascc.hydrateImageBlocks(cast.template);

    fs.writeFileSync(`${wp}/asciinema-casts.json`, JSON.stringify(cast))
    fs.writeFileSync(`${wp}/${outputFile}`, template)

    for (let blockIndex in cast.blocks) {
        const block = cast.blocks[blockIndex];
        let json = JSON.stringify(blockToJson(block), null, 3);
        // @todo move somewhere else
        json = json.replace(/\\\\u/g, "\\" + "u")

        fs.writeFileSync(`${wp}/${prefix}${blockIndex}.cast`, block.cast)
        fs.writeFileSync(`${wp}/${prefix}${blockIndex}.json`, json)
    }

    process.exit(0)
}

export const command: string = 'generate [options]';
export const desc: string = 'Generate files';
export const builder = (yargs: any) => {
    return yargs
        .demand('s') // require -s to run
        .nargs('o', 1) // tell yargs -f needs 1 argument after it
        .nargs('s', 1) // tell yargs -f needs 1 argument after it
        .describe('s', 'source file to parse (markdown format)')
        .describe('o', 'output file')
}


/**
 *
 * @param argv
 */
export async function handler(argv: GenerateArguments): Promise<any> {
    const sourceFile = argv.s;
    const outDir = process.cwd();
    const outputFile = argv.o || 'asciinema-template.md';

    if (sourceFile === '-') {
        process.stdin.pipe(concat(parse));
    } else {
        readFile(sourceFile, (err: any, dataBuffer: ArrayBuffer) => {
            if (err) {
                throw err;
            } else {
                parse(dataBuffer.toString(),
                    {
                        prefix: 'block-',
                        outputFile,
                        outDir
                    },
                    argv
                );
            }
        });
    }
}
