// markdownAst.js
const { unified } = require('unified');
const remarkParse = require('remark-parse').default;
const remarkStringify = require('remark-stringify').default;

/* =========================
   Markdown ↔ AST
========================= */

function parseMarkdownToAst(markdown) {
    return unified().use(remarkParse).parse(markdown);
}

function astToMarkdown(ast) {
    return unified().use(remarkStringify).stringify(ast);
}

/* =========================
   AST helpers
========================= */

function insertHeadingAst(ast, level, text) {
    if (!ast || !ast.children) return;

    const headingNode = {
        type: 'heading',
        depth: Math.min(Math.max(level, 2), 6), // H2 minimum (Zola)
        children: [{ type: 'text', value: text }]
    };

    ast.children.push(headingNode);
}

module.exports = {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst
};
