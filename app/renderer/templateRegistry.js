module.exports = {
    page: {
        label: "Page simple",
        htmlTemplate: "page.html",

        frontMatter: {
            title: "",
            template: "page.html"
        },

        extra: {},

        body: "# {{title}}\n\nContenu ici..."
    },

    article: {
        label: "Article de blog",
        htmlTemplate: "article.html",

        frontMatter: {
            title: "",
            date: () => new Date().toISOString().split("T")[0],
            template: "article.html"
        },

        extra: {
            author: "Admin",
            description: ""
        },

        body: "# {{title}}\n\nÉcris ton article ici..."
    }
};
