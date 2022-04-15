import {RenderingOptions} from "./types";

const TurndownService = require('turndown')
const debug = require('debug')('asccinema')
const os = require('os');

export interface Env {
    Term: string
    Shell: string
}


export interface Asciicast {
    version: number
    width: number
    height: number
    timestamp?: number
    duration?: number
    command?: string
    theme?: {
        fg: string
        bg: string
        palette: string
    }
    title: string
    env: any
}

export interface CodeBlock {
    index: number
    size: number
    endsAt: number
    startAt: number
    content: string
    parsed: string
    cast: string
    frames: any[]
}

export interface ParseResult {
    blocks: CodeBlock[]
    template: string
}

export interface Frame {
    startedAt: number
    frame: string
    lineData: any[]
}

interface Timer {
    started: number
    current: number
    end?: number
}

// https://github.com/asciinema/asciinema/blob/develop/doc/asciicast-v2.md
export const defaults: Asciicast = {
    "version": 2,
    "width": 80,
    "height": 24,
    "theme": {
        "fg": "#d0d0d0",
        "bg": "#212121",
        "palette": "#151515:#ac4142:#7e8e50:#e5b567:#6c99bb:#9f4e85:#7dd6cf:#d0d0d0:#505050:#ac4142:#7e8e50:#e5b567:#6c99bb:#9f4e85:#7dd6cf:#f5f5f5"
    },
    "title": "demo",
    "env": {"TERM": "xterm-256color", "SHELL": "/bin/zsh"}
};

export const defaultRenderingOptions: RenderingOptions = {
    cpm: 300,
    skipEmptyLines: true,
    prompt: null
};

const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
});

interface AscciCastInfo {
    frames: any[]
    content: string
}

interface DecoratorOptions {
    isComment: boolean
}

interface MarkdownParsing {
    blocks: CodeBlock[]
    html: string
    markdown: string
}

export class MarkdownToAsccicast {

    private readonly options: Asciicast;
    private turndownService: any;
    codeBlockImageIndex: number = 0;

    get parsed(): string {
        return this._parsed;
    }

    private _parsed: string = ''
    private _timeAcc: { [key: string]: any } = {}

    private lineDecorator(line: string): string {
        // replace multiple signs at the beginning
        if (line.startsWith('#')) {
            return `${line.substring(line.indexOf('#') + 1)}`
        } else {
            return line
        }
    }

    private chrDecorator(chr: string, {isComment}: DecoratorOptions): string {
        // https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
        const esc = ['\\', 'u', '001b'].join('')
        const color = isComment ? 37 : 96;
        return chr === "" ? chr : esc + `[${color}m` + chr + esc + "[0m"

    }

    //https://github.com/asciinema/asciinema/blob/develop/doc/asciicast-v2.md
    /**
     * frameRenderer renders a line or frame at the time
     * @param blockIndex
     * @param v
     * @param index
     */
    private frameRenderer = (blockIndex: string, v: string, index: number): Frame => {
        const cwd = process.cwd();
        // const prompt = process.env.ASCCINEMA_PROMPT || "\u001b[32m~"+`${process.cwd()}`+"\u001b[30m\u001b(B\u001b[m "
        const prompt = this._renderingOptions.prompt || process.env.ASCCINEMA_PROMPT || `${cwd.replace(/\\/g, "/")} `
        const cpm = this._renderingOptions.cpm; // chars per minute
        const sps = 60 / cpm; // strokes per second
        const mil = Math.random()

        const isFormatted: boolean = v.startsWith('# \\u001b')
        const value: string = isFormatted ? v : this.lineDecorator(v);
        const isComment: boolean = v.startsWith('#')
        const showPrompt: boolean = !isComment
        const started: boolean = !this._timeAcc[blockIndex];
        const skipEmptyLines: boolean = this._renderingOptions.skipEmptyLines;

        let lines = []
        let lineData: any[] = []

        if (started) {
            // debug(`create frame ${blockIndex} for the first time`)
            this._timeAcc[blockIndex] = {
                started: 0,
                current: mil, // start time
                end: 0
            }
        }

        let startedAt = started ? mil : this._timeAcc[blockIndex].current;
        let acc = startedAt;

        if ((value.length === 0) && skipEmptyLines) {
            // debug(`skip: ${value.length}`)
            return {startedAt, frame: '', lineData}
        }

        if (isFormatted) {
            const line = v.substring(v.lastIndexOf('#') + 1)
            const formattedLine = `${line}\r\n`
            lines.push(`[${startedAt} , "o", "${formattedLine}" ]`)
            lineData.push(startedAt, formattedLine)
            this._timeAcc[blockIndex].current = Number(formatter.format(startedAt + acc))
            return {startedAt, frame: lines.join("\n"), lineData}
        }

        for (let i = 0, j = -1; i < value.length + 1; i++, j++) {

            const chr = value.substring(j, j + 1)
            const decorated = this.chrDecorator(chr, {
                isComment
            })
            const frameEndsAt = formatter.format(startedAt + acc)

            let std = ''

            lines.push(`[${frameEndsAt} , "o", "${decorated}"]`) // hit enter at the end of the line
            lineData.push(frameEndsAt, decorated)

            if (j === -1 && showPrompt) {
                std = `\r\n${prompt}`
                lines.push(`[${frameEndsAt} , "o", "${std}"]`) // prompt at the start
                lineData.push(frameEndsAt, std)
            }

            if (j === value.length - 1) {
                std = "\r\n"
                lines.push(`[${frameEndsAt} , "o", "${std}"]`) // hit enter at the end of the line
                lineData.push(frameEndsAt, std)
            }

            // increment our time accumulator on each frame
            acc += sps
            // update current time
            this._timeAcc[blockIndex].current = Number(frameEndsAt)
        }

        return {startedAt, frame: lines.join("\n"), lineData}
    }

    /**
     *
     * @param content
     */
    _extractCodeBlocks = (content: string): MarkdownParsing => {
        let blocks: CodeBlock[] = [];
        let ref = this;
        let lastFenceIndex = 0;
        // Actual default values
        const md = require('markdown-it')({
            html: false,
            linkify: false,
            typographer: false,
            highlight: function (str: string, lang: string) {
                const fenceHeader = '```'
                const fenceFooter = '```'
                const fenceStart = content.indexOf(fenceHeader, lastFenceIndex)
                const fenceEnd = content.indexOf(fenceFooter, fenceStart + str.length + 3)
                const html = `<img alt="code block" src="./asccinema-block-${blocks.length}" />`
                let block: CodeBlock = {
                    index: blocks.length,
                    startAt: fenceStart,
                    endsAt: fenceEnd,
                    size: fenceEnd - fenceStart,
                    cast: '',
                    content: str,
                    parsed: html,
                    frames: []
                }

                lastFenceIndex = fenceEnd

                const gen = ref.generate(block)

                block.frames = gen.frames
                block.cast = gen.content;
                blocks.push(block)

                // return ''; // use external default escaping
                return '<pre class="asccinema"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
            }
        });

        // const regEx = new RegExp(`\`\`\`([\\s\\S]*)\`\`\``, '')
        // const matches = content.match(regEx);

        const html = md.render(content)

        const markdown = this.turndownService.turndown(html)

        return {blocks, html, markdown};
    }

    /**
     * This method returns the content with codeblocks replaced by asccinema references
     * @param c
     */
    parseAll = (c: string): ParseResult => {
        const {blocks, html, markdown: template} = this._extractCodeBlocks(c);
        // debug('parseAll', html)
        return {
            blocks,
            template
        }
    };

    private _renderingOptions: RenderingOptions;

    /**
     *
     * @param block
     */
    generate(block: CodeBlock): AscciCastInfo {
        let opts: Asciicast = this.options;
        const header = JSON.stringify(opts) + "\n"
        // debug('generate block', block)
        const frames: Frame[] = block.content
            .split("\n")
            .map((value, index) => {
                return this.frameRenderer(`block-${block.index}`, value, index)
            })
        const lines = frames.map(f => f.frame).join("\n")
        // const elapsed = frames.map(f => f.elapsed).reduce((sum, x) => sum + x);
        // opts.duration = Math.ceil(opts.timestamp + (elapsed))
        return {
            frames,
            content: (header + lines + "\n")
        }
    }

    /**
     *
     * @param options
     * @param renderingOptions
     */
    constructor(options: Partial<Asciicast>, renderingOptions?: Partial<RenderingOptions>) {

        const self = this;

        this.options = Object.assign(defaults, options)
        this._renderingOptions = Object.assign(defaultRenderingOptions, renderingOptions)

        this.turndownService = new TurndownService({
            preformattedCode: true,
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        })

        this.turndownService
            .addRule('asccinema', {
                filter: 'pre',
                replacement(content: string) {
                    return content + `![](${self.nextCodeBlockImage()})`
                }
            })
    }

    nextCodeBlockImage(): string {
        return `%codeblock-img-${(this.codeBlockImageIndex++)}%`;
    }

    hydrateImageBlocks(content: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let replaced: string = content
            replaced = replaced.replace("%codeblock-img-0%", '.asciicast/block-0.gif')
            replaced = replaced.replace("%codeblock-img-1%", '.asciicast/block-1.gif')
            replaced = replaced.replace("%codeblock-img-2%", '.asciicast/block-2.gif')
            resolve(replaced)
        })
    }
}

interface AsccicastJson {
    [key: string]: any

    stdout: any[]
}

let _groupByN = (n: number, data: any[]) => {
    let result = [];
    for (let i = 0; i < data.length; i += n) result.push(data.slice(i, i + n));
    return result;
};

/**
 *
 * @param block
 * @param opts
 */
export function blockToJson(block: CodeBlock, opts?: Asciicast): AsccicastJson {
    const options = Object.assign(defaults, opts, {version: 1})
    let stdout: any[] = []
    block.frames.map(e => stdout = [...stdout, ...e.lineData])
    return {...options, stdout: _groupByN(2, stdout)}
}
