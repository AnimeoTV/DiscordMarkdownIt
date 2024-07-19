import { StateInline } from "markdown-it/index.js";

const regexNumbers = /^[\u0030-\u0039]\uFE0F\u20E3/;

export default function ruleUnicodeEmoji(state: StateInline, silent: boolean) {
    const content   = state.src.slice(state.pos);
    const match     = regexNumbers.exec(content);

    if (match) {
        if (!silent) {
            const token = state.push("unicode_emoji", "unicode_emoji", 0);

            token.content = match[0];
        }

        state.pos += match[0].length;

        return true;
    }

    return false;
}
