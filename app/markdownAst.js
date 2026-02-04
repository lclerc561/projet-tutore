const { unified } = require('unified');
const remarkParse = require('remark-parse').default;
const remarkStringify = require('remark-stringify').default;

/**
 * Parse un markdown en AST (remark)
 */
function parseMarkdownToAst(markdown) {
    return unified()
        .use(remarkParse)
        .parse(markdown || '');
}

/**
 * Convertit un AST remark en markdown
 */
function astToMarkdown(ast) {
    return unified()
        .use(remarkStringify, {
            bullet: '-',
            fences: true,
            incrementListMarker: false
        })
        .stringify(ast);
}

/**
 * Ajoute un titre (H2 minimum pour Zola)
 */
function insertHeadingAst(ast, level, text) {
    if (!ast || !ast.children || !text) return;

    const headingNode = {
        type: 'heading',
        depth: Math.min(Math.max(level, 2), 6),
        children: [
            { type: 'text', value: text }
        ]
    };

    ast.children.push(headingNode);
}

/**
 * Ajoute un paragraphe simple
 */
function insertParagraphAst(ast, text) {
    if (!ast || !ast.children || !text) return;

    const paragraphNode = {
        type: 'paragraph',
        children: [
            { type: 'text', value: text }
        ]
    };

    ast.children.push(paragraphNode);
}

/**
 * Ajoute plusieurs paragraphes (séparés par ligne vide)
 */
function insertParagraphsAst(ast, text) {
    if (!ast || !ast.children || !text) return;

    const paragraphs = text
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

    paragraphs.forEach(p => {
        ast.children.push({
            type: 'paragraph',
            children: [{ type: 'text', value: p }]
        });
    });
}

module.exports = {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst,
    insertParagraphAst,
    insertParagraphsAst
};
