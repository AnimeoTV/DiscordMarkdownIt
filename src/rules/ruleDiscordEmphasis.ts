import { StateInline } from "markdown-it/index.js";

function getTag(marker: number, isStrong: boolean) {
    if (isStrong) {
        switch (marker) {
            case 0x5F /* | */   : return "underline";
            case 0x2A /* * */   : return "strong";
            default /* | */     : return "spoiler";
        }
    }

    return "em";
}

function postProcessEmphasis(state: StateInline, delimiters: StateInline.Delimiter[]) {
    const max = delimiters.length;

    for (let i = (max - 1); i >= 0; i--) {
        const startDelim = delimiters[i]!;

        if (startDelim.marker !== 0x5F /* _ */ && startDelim.marker !== 0x2A /* * */ && startDelim.marker !== 0x7C /* | */)
            continue;

        // Process only opening markers
        if (startDelim.end === -1)
            continue;

        const endDelim = delimiters[startDelim.end]!;

        // If the previous delimiter has the same marker and is adjacent to this one,
        // merge those into one strong delimiter.
        //
        // `<em><em>whatever</em></em>` -> `<strong>whatever</strong>`
        //
        const isStrong = i > 0 &&
            delimiters[i - 1]!.end === startDelim.end + 1 &&

            // check that first two markers match and adjacent
            delimiters[i - 1]!.marker === startDelim.marker &&
            delimiters[i - 1]!.token === startDelim.token - 1 &&

            // check that last two markers are adjacent (we can safely assume they match)
            delimiters[startDelim.end + 1]!.token === endDelim!.token + 1;

        const ch    = String.fromCharCode(startDelim.marker);
        const tag   = getTag(startDelim.marker, isStrong)

        const token_o   = state.tokens[startDelim.token]!;
        token_o.type    = `${tag}_open`;
        token_o.tag     = tag;
        token_o.nesting = 1;
        token_o.markup  = isStrong ? (ch + ch) : ch;
        token_o.content = "";

        const token_c   = state.tokens[endDelim.token]!;
        token_c.type    = `${tag}_close`;
        token_c.tag     = tag;
        token_c.nesting = -1;
        token_c.markup  = isStrong ? (ch + ch) : ch;
        token_c.content = "";

        if (isStrong) {
            state.tokens[delimiters[i - 1]!.token]!.content                 = "";
            state.tokens[delimiters[startDelim.end + 1]!.token]!.content    = "";
            i--
        }
    }
}

export default {

    tokenize(state: StateInline, silent: boolean): boolean {
        const start     = state.pos
        const marker    = state.src.charCodeAt(start)

        if (silent)
            return false;

        if (marker !== 0x5F /* _ */ && marker !== 0x2A /* * */ && marker !== 0x7C /* | */)
            return false;

        const scanned = state.scanDelims(state.pos, (marker === 0x2A || marker === 0x7C));

        // Special case for spoilers, which must be surrounded by a strong marker
        // ||like this|| and not |like this|.
        if (marker === 0x7C && scanned.length !== 2)
            return false;

        for (let i = 0; i < scanned.length; i++) {
            const token = state.push("text", "", 0);

            token.content = String.fromCharCode(marker)

            state.delimiters.push({

                // Char code of the starting marker (number).
                marker,

                // Total length of these series of delimiters.
                length: scanned.length,

                // A position of the token this delimiter corresponds to.
                token: state.tokens.length - 1,

                // If this delimiter is matched as a valid opener, `end` will be
                // equal to its position, otherwise it's `-1`.
                end: -1,

                // Boolean flags that determine if this delimiter could open or close
                // an emphasis.
                open    : true,
                close   : true,
            });
        }

        state.pos += scanned.length;

        return true;
    },

    postProcess(state: StateInline): boolean {
        const tokens_meta = state.tokens_meta;

        postProcessEmphasis(state, state.delimiters);

        for (let i = 0; i < tokens_meta.length; i++)
            if (tokens_meta[i]?.delimiters)
                postProcessEmphasis(state, tokens_meta[i]!.delimiters);

        return false;
    },
};
