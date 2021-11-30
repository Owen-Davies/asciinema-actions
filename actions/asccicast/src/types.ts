export interface SharedArgv {
    renderingOptions?: RenderingOptions
}

export interface RenderingOptions {
    // bash prompt
    prompt: string | null
    // chars per minute
    cpm: number
    // should we skip empty lines
    skipEmptyLines: boolean
}

export interface GenerateArguments extends Partial<SharedArgv> {
    o: string
    s: string
}
