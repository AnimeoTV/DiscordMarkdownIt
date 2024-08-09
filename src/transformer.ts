import { Token } from "markdown-it/index.js";


//////////////////////////////////////////////////
//  TYPES
//////////////////////////////////////////////////


type MarkdownTokenEntry = {
    token       : Token;
    children    : MarkdownTokenEntry[];
};

type MapperMentionType = "user" | "role" | "channel";

type MapperUserMentionResult = {
    color   : string;
    name    : string;
};

type MapperRoleMentionResult = {
    name            : string;
    color           : string;
    unicodeEmoji    : string;
    icon            : string;
};
type MapperChannelMentionResult = {
    type    : string;
    name    : string;
};

type MapperMentionResult = MapperUserMentionResult
    | MapperRoleMentionResult
    | MapperChannelMentionResult
    | void;

type MarkdownMapper = {
    mention?: (type: MapperMentionType, id: string) => MapperMentionResult;
};

type MarkdownTransformedBlock = {
    type        : "title" | "subtitle" | "subtext" | "blockquote";
    content     : MarkdownTransformedNode[];
};

type MarkdownTransformedInline = {
    type        : "italic" | "bold" | "underline" | "spoiler" | "strikethrough" | "text";
    content     : MarkdownTransformedNode[];
};

type MarkdownTransformedInlineString = {
    type        : "code_inline" | "unicode_emoji";
    content     : string;
};

type MarkdownTransformedLink = {
    type        : "link";
    content     : MarkdownTransformedNode[];
    url         : string;
};

type MarkdownTransformedEmoji = {
    type        : "emoji";
    id          : string;
    name        : string;
    animated    : boolean;
    url         : string;
};

type MarkdownTransformedMention = {
    type        : "mention";
    subType     : "here" | "everyone";
} | {
    type        : "mention"
    subType     : "user" | "channel" | "role";
    id          : string;
    extra       : any;
};

type MarkdownTransformedList = {
    type        : "list";
    items       : MarkdownTransformedNode[];
};

type MarkdownTransformedCodeBlock = {
    type        : "code_block";
    lang        : string;
    content     : string;
};

type MarkdownTransformedUnsupported = {
    type        : "unsupported_token";
};

type MarkdownTransformedNode = string
    | MarkdownTransformedBlock
    | MarkdownTransformedInline
    | MarkdownTransformedInlineString
    | MarkdownTransformedLink
    | MarkdownTransformedEmoji
    | MarkdownTransformedMention
    | MarkdownTransformedList
    | MarkdownTransformedCodeBlock
    | MarkdownTransformedUnsupported
    | MarkdownTransformedNode[];


//////////////////////////////////////////////////
//  TRANSFORMER
//////////////////////////////////////////////////


function serializeTokens(tokens: Token[]): MarkdownTokenEntry[] {
    let stack   = [] as MarkdownTokenEntry[];
    let content = [] as MarkdownTokenEntry[];
    let pos     = 0;

    while (pos < tokens.length) {
        const token = tokens[pos++]!;

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

export function transformMarkdown(tokens: Token[], mapper: MarkdownMapper = {}): MarkdownTransformedNode[] {

    function renderToken({ token, children }: MarkdownTokenEntry): MarkdownTransformedNode {

        function renderChildren(children: MarkdownTokenEntry[]): MarkdownTransformedNode[] {
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
                url     : token.attrs?.find(([ name ]) => name === "href")?.[1]!,
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
                type        : "emoji",
                id          : token.meta.id,
                name        : token.meta.name,
                animated    : token.meta.animated,
                url         : `https://cdn.discordapp.com/emojis/${token.meta.id}.${token.meta.animated ? `gif` : `png`}`,
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
            const content: MarkdownTransformedMention = {
                type    : "mention",
                subType : token.meta.type,
                id      : token.meta.id,
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

        return {
            type: "unsupported_token",
        };
    }

    return serializeTokens(tokens).map(renderToken);
}
