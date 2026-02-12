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
    },

    docs: {
        label: "Page de documentation",
        htmlTemplate: "docs.html",
        zola_section: "docs",

        frontMatter: {
            title: "",
            template: "docs.html"
        },

        extra: {
            summary: ""
        },

        body: "# {{title}}\n\nDescription…\n\n## Sections\n\n…"
    },

    teamMember: {
        label: "Profil équipe",
        htmlTemplate: "team.html",
        zola_section: "team",

        frontMatter: {
            title: "",
            template: "team.html"
        },

        extra: {
            role: "",
            photo: "/images/avatar.jpg",
            email: ""
        },

        body: `# {{title}}

        Présentation du membre...`
    },

    productAdvanced: {
        label: "Produit avancé",
        htmlTemplate: "product.html",
        zola_section: "products",

        frontMatter: {
            title: "",
            template: "product.html"
        },

        extra: {
            price: "0.00",
            currency: "EUR",
            sku: "",
            stock: "0",
            featured: false
        },

        body: `# {{title}}

        ## Description

        Détails du produit...

        ## Caractéristiques

        - ...`
    },

    faq: {
        label: "FAQ",
        htmlTemplate: "faq.html",
        zola_section: "",

        frontMatter: {
            title: "",
            template: "faq.html"
        },

        extra: {},

        body: `# {{title}}

        ## Question 1

        Réponse...

        ## Question 2

        Réponse...`
    },

    event: {
        label: "Événement",
        htmlTemplate: "event.html",
        zola_section: "events",

        frontMatter: {
            title: "",
            date: () => new Date().toISOString().split("T")[0],
            template: "event.html"
        },

        extra: {
            location: "",
            registration_link: ""
        },

        body: `# {{title}}

        ## Description

        ...

        ## Informations pratiques

        ...`
    },

    portfolio: {
        label: "Projet Portfolio",
        htmlTemplate: "portfolio.html",
        zola_section: "projects",

        frontMatter: {
            title: "",
            template: "portfolio.html"
        },

        extra: {
            github: "",
            demo: "",
            tech_stack: ""
        },

        body: `# {{title}}

    ## Présentation

    ...

    ## Technologies

    ...`
}




};
