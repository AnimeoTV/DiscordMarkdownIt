import MarkdownIt           from "markdown-it";
import ruleText             from "./rules/ruleText.js";
import ruleDiscordEmphasis  from "./rules/ruleDiscordEmphasis.js";
import ruleMentionAndEmoji  from "./rules/ruleMentionAndEmoji.js";
import ruleUnicodeEmoji     from "./rules/ruleUnicodeEmoji.js";
import ruleSubtext          from "./rules/ruleSubtext.js";


//////////////////////////////////////////////////
//  EXPORTS
//////////////////////////////////////////////////


export function createDiscordMarkdownParser() {
    const markdown = new MarkdownIt({ linkify: true });

    // Disable the existing "text" rule and enable insert our custom "text" rule.
    // This is needed since the default rule does not include the "|" terminator character.
    markdown.inline.ruler.disable([ "text" ]);
    markdown.inline.ruler.before("text", "discord_text", ruleText);

    // Disable the existing "emphasis" rule that handles "bold" and "italic".
    markdown.inline.ruler.disable([ "emphasis" ]);
    markdown.inline.ruler2.disable([ "emphasis" ]);

    // Add a custom emphasis rule that handle "bold", "italic", "underline" or "spoiler".
    markdown.inline.ruler.before("emphasis", "discord_emphasis", ruleDiscordEmphasis.tokenize);
    markdown.inline.ruler2.before("emphasis", "discord_emphasis", ruleDiscordEmphasis.postProcess);

    // Add custom rules for Discord mentions and emojis.
    markdown.inline.ruler.push("mention", ruleMentionAndEmoji);
    markdown.inline.ruler.push("unicode_emoji", ruleUnicodeEmoji);

    // Add a custom rule to handle Discord "subtext".
    markdown.block.ruler.before("heading", "subtext", ruleSubtext, {
        alt: [ "paragraph", "reference", "blockquote" ],
    });

    return markdown;
}

export * from "./transformer.js";
