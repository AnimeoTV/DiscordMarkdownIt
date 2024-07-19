import { StateInline } from "markdown-it/index.js";

const regexMentions     = /^(?:<(@|@&|#)([0-9]+)>)/;
const regexEmojis       = /^<(a?):([^:]+):([0-9]+)>/;
const regexEveryone     = /^(?:^|\s)@(everyone)(?:$|\s)/;

export default function ruleMentionAndEmoji(state: StateInline, silent: boolean) {
    const content = state.src.slice(state.pos);

    {
        const match = regexEveryone.exec(content);

        if (match) {
            if (!silent) {
                const token = state.push("mention", "mention", 0);

                token.content = match[0];

                (token.info as any) = { type: match[1] };
            }

            state.pos += match[0].length;

            return true;
        }
    }

    {
        const match = regexMentions.exec(content);

        if (match) {
            if (!silent) {
                const token = state.push("mention", "mention", 0);

                token.content = match[0];

                (token.info as any) = {
                    id      : (match[2]),
                    type    : (match[1] === "@")
                        ? "user"
                        : (match[1] === "#")
                            ? "channel"
                            : "role",
                };
            }

            state.pos += match[0].length;

            return true;
        }
    }

    {
        const match = regexEmojis.exec(content);

        if (match) {
            if (!silent) {
                const token = state.push("emoji", "emoji", 0);

                token.content = match[0];

                (token.info as any) = {
                    animated    : match[1] === "a",
                    name        : match[2],
                    id          : match[3],
                };
            }

            state.pos += match[0].length;

            return true;
        }
    }

    return false;
}
