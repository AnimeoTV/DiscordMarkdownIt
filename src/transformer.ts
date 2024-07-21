import { StateInline, Token } from "markdown-it/index.js";


//////////////////////////////////////////////////
//  TYPES
//////////////////////////////////////////////////


type MarkdownTokenEntry = {
    token       : Token;
    children    : MarkdownTokenEntry[];
};

type MarkdownMapper = {
    mention(type: string, id: string): any;
};



//////////////////////////////////////////////////
//  TRANSFORMER
//////////////////////////////////////////////////


function serializeTokens(tokens: Token[]): MarkdownTokenEntry[] {
    let stack   = [] as MarkdownTokenEntry[];
    let content = [] as MarkdownTokenEntry[];
    let pos     = 0;

    while (pos < tokens.length) {
        const token = tokens[pos++]!;

        if (token.type === undefined) {
            console.log(tokens)
        }

        if (token.type.endsWith("_open")) {
            stack.push({ token, children: [] });

        } else if (token.type.endsWith("_close")) {
            const group = stack.pop();

            if (!group)
                throw new Error("Unexpected close token.");

            if (stack.length) {
                stack.at(-1)!.children.push(group);

            } else {
                content.push(group);
            }

        } else {
            if (stack.length) {
                stack.at(-1)!.children.push({
                    token,
                    children: token.children
                        ? serializeTokens(token.children)
                        : [],
                });

            } else {
                content.push({
                    token,
                    children: token.children
                        ? serializeTokens(token.children)
                        : [],
                });
            }
        }
    }

    return content;
}

export function transformMarkdown(tokens: Token[], mapper: MarkdownMapper) {

    function renderToken({ token, children }: MarkdownTokenEntry): any {

        function renderChildren(children: MarkdownTokenEntry[]): any {
            return children.flatMap(renderToken).filter((obj) => obj);
        }

        if (token.type === "text")
            return token.content;

        if (token.type === "softbreak")
            return "\n";

        if (token.type === "inline")
            return renderChildren(children);

        if (token.type === "em_open") {
            return {
                type    : "italic",
                content : renderChildren(children),
            };
        }

        if (token.type === "strong_open") {
            return {
                type    : "bold",
                content : renderChildren(children),
            };
        }

        if (token.type === "underline_open") {
            return {
                type    : "underline",
                content : renderChildren(children),
            };
        }

        if (token.type === "spoiler_open") {
            return {
                type    : "spoiler",
                content : renderChildren(children),
            };
        }

        if (token.type === "s_open") {
            return {
                type    : "strikethrough",
                content : renderChildren(children),
            };
        }

        if (token.type === "link_open") {
            return {
                type    : "link",
                content : renderChildren(children),
                url     : token.attrs?.find(([ name ]) => name === "href")?.[1],
            };
        }

        if (token.type === "heading_open") {
            return {
                type    : token.tag === "h1" ? "title" : "subtitle",
                content : renderChildren(children),
            };
        }

        if (token.type === "subtext_open") {
            return {
                type    : "subtext",
                content : renderChildren(children),
            };
        }

        if (token.type === "paragraph_open") {
            return {
                type    : "text",
                content : renderChildren(children),
            };
        }

        if (token.type === "blockquote_open") {
            return {
                type    : "blockquote",
                content : renderChildren(children),
            };
        }

        if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
            return {
                type    : "list",
                items   : children.map((li) => li.children.map(renderToken)),
            };
        }

        if (token.type === "fence") {
            if (token.tag == "code") {
                return {
                    type    : "code_block",
                    lang    : token.info,
                    content : token.content,
                };
            }
        }

        if (token.type === "code_inline") {
            return {
                type    : "code_inline",
                content : token.content,
            };
        }

        if (token.type === "emoji") {
            return {
                type    : "emoji",
                name    : (token.info as any).name,
                url     : `https://cdn.discordapp.com/emojis/${(token.info as any).id}`,
                animated: (token.info as any).animated,
            };
        }

        if (token.type === "unicode_emoji") {
            return {
                type    : "unicode_emoji",
                content : token.content,
            };
        }

        // @TODO: We need to override the inline bold parser because
        // on Discord "** **" is just an empty bold tag not a horizontal separator.
        if (token.type === "hr") {
            return "";
        }

        if (token.type === "mention") {
            const content = {
                type    : "mention",
                subType : (token.info as any).type,
                id      : (token.info as any).id || null,
                extra   : null,
            };

            // Get extra info on mention.
            if (content.id && mapper.mention) {
                const extra = mapper.mention(content.subType, content.id);

                if (extra)
                    content.extra = extra;
            }

            return content;
        }

        console.warn(token);

        return "**ERREUR PARSEUR**";
    }

    return serializeTokens(tokens).map(renderToken);
}
