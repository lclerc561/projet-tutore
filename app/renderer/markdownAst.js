const { unified } = require('unified');
const remarkParse = require('remark-parse').default;
const remarkStringify = require('remark-stringify').default;

// --- CORE ---
function parseMarkdownToAst(markdown) {
    return unified().use(remarkParse).parse(markdown || '');
}

function astToMarkdown(ast) {
    return unified()
        .use(remarkStringify, {
            bullet: '-',
            fences: true,
            incrementListMarker: false
        })
        .stringify(ast);
}

// --- INSERTION ---

function insertHeadingAst(ast, level, text) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'heading',
        depth: Math.min(Math.max(level, 2), 6),
        children: [{ type: 'text', value: text || 'Nouveau titre' }]
    });
}

function insertParagraphAst(ast, text) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: text || 'Nouveau texte' }]
    });
}

function insertBlockquoteAst(ast, text) {
    if (!ast || !ast.children) return;
    // Structure : Blockquote -> Paragraph -> Text
    ast.children.push({
        type: 'blockquote',
        children: [{
            type: 'paragraph',
            children: [{ type: 'text', value: text || 'Citation...' }]
        }]
    });
}

/**
 * Ajoute une liste à puces
 */
function insertListAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'list',
        ordered: false,
        children: [
            {
                type: 'listItem',
                children: [{
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'Élément 1' }]
                }]
            },
            {
                type: 'listItem',
                children: [{
                    type: 'paragraph',
                    children: [{ type: 'text', value: 'Élément 2' }]
                }]
            }
        ]
    });
}

/**
 * Ajoute un bloc de code
 */
function insertCodeBlockAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'code',
        lang: 'js',
        value: 'console.log("Hello");'
    });
}

// --- HELPERS ---
function insertParagraphsAst(ast, text) { /* Legacy support if needed */ }

module.exports = {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst,
    insertParagraphAst,
    insertParagraphsAst,
    insertBlockquoteAst,
    insertListAst,      // <--- Nouveau
    insertCodeBlockAst  // <--- Nouveau
};