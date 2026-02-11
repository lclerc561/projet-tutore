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
            incrementListMarker: false,
            handlers: {
                html: (h, node) => node.value // Pour garder la vidéo HTML intacte
            }
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
    ast.children.push({
        type: 'blockquote',
        children: [{
            type: 'paragraph',
            children: [{ type: 'text', value: text || 'Citation...' }]
        }]
    });
}

function insertListAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'list',
        ordered: false,
        children: [
            { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Item 1' }] }] },
            { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Item 2' }] }] }
        ]
    });
}

function insertCodeBlockAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'code',
        lang: 'js',
        value: 'console.log("Hello");'
    });
}

// --- MEDIA (CORRIGÉ) ---

/**
 * Ajoute une image DANS un paragraphe (Standard Markdown)
 * Correction du bug de formatage
 */
function insertImageAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'paragraph', // L'image doit être dans un paragraphe
        children: [{
            type: 'image',
            url: '', 
            alt: 'Description image',
            title: null
        }]
    });
}

/**
 * Ajoute une vidéo (Bloc HTML)
 */
function insertVideoAst(ast) {
    if (!ast || !ast.children) return;
    ast.children.push({
        type: 'html',
        value: '<video controls src="" width="100%"></video>'
    });
}

module.exports = {
    parseMarkdownToAst,
    astToMarkdown,
    insertHeadingAst,
    insertParagraphAst,
    insertBlockquoteAst,
    insertListAst,
    insertCodeBlockAst,
    insertImageAst, 
    insertVideoAst
};