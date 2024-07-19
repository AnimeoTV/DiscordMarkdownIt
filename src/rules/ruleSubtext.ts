import { StateBlock } from "markdown-it/index.js";

export default function ruleSubtext(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
    let pos = state.bMarks[startLine]! + state.tShift[startLine]!;
    let max = state.eMarks[startLine];

    if (state.src.charCodeAt(pos) !== 0x2D /* - */ || state.src.charCodeAt(pos + 1) !== 0x23 /* # */ || state.src.charCodeAt(pos + 2) !== 0x20 /*   */)
        return false;

    if (silent)
        return true;

    pos += 3;

    state.line = startLine + 1;

    const token_o       = state.push("subtext_open", "subtext", 1)
    token_o.markup      = "#-";
    token_o.map         = [ startLine, state.line ];

    const token_i       = state.push("inline", "", 0);
    token_i.content     = state.src.slice(pos, max).trim();
    token_i.map         = [ startLine, state.line ];
    token_i.children    = [];

    const token_c       = state.push("subtext_close", "subtext", -1);
    token_c.markup      = "#-";

    return true;
}
