// renderer/githubManager.js
const fs = require('fs');
const path = require('path');

const WORKFLOW_CONTENT = `name: Build and Deploy Zola

on:
  push:
    branches:
      - main
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install and Build Zola
        uses: shalzz/zola-deploy-action@v0.19.2
        env:
          # Le token est fourni automatiquement par GitHub
          PAGES_BRANCH: gh-pages
          BUILD_DIR: .
          TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

module.exports = {
    /**
     * Vérifie si GitHub Pages est déjà configuré
     */
    isConfigured: function(projectDir) {
        const workflowPath = path.join(projectDir, '.github', 'workflows', 'zola.yml');
        return fs.existsSync(workflowPath);
    },

    /**
     * Crée le fichier zola.yml nécessaire pour GitHub Pages
     */
    setupPages: function(projectDir, logCallback) {
        if (!projectDir) return;

        try {
            const githubDir = path.join(projectDir, '.github');
            const workflowsDir = path.join(githubDir, 'workflows');
            const filePath = path.join(workflowsDir, 'zola.yml');

            // 1. Créer les dossiers .github/workflows s'ils n'existent pas
            if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir);
            if (!fs.existsSync(workflowsDir)) fs.mkdirSync(workflowsDir);

            // 2. Écrire le fichier YAML
            fs.writeFileSync(filePath, WORKFLOW_CONTENT, 'utf8');
            
            logCallback("✅ Configuration GitHub Pages créée (.github/workflows/zola.yml)", false);
            return true;
        } catch (e) {
            console.error(e);
            logCallback("❌ Erreur lors de la création du fichier Workflow", true);
            return false;
        }
    }
};