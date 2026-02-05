---
title: "Documentation Technique"
date: 2026-02-02
template: "page.html"
---

<p class="lead">L'application est une solution de bureau (Desktop) développée avec <strong>Electron.js</strong>. Elle permet de piloter le moteur Zola localement, sans nécessiter de serveur complexe ou de base de données.</p>

<hr class="spacer">

<div class="split-layout">
    <div>
        <h2>1. Le Moteur : Zola</h2>
        <p>Zola est un générateur de site statique (SSG) écrit en Rust. C'est le cœur du système que notre application pilote.</p>
        <p><strong>Son fonctionnement est linéaire :</strong></p>
        <ul>
            <li><strong>Entrée :</strong> Des fichiers Markdown (contenu), des fichiers YAML et des templates HTML.</li>
            <li><strong>Traitement :</strong> Compilation ultra-rapide.</li>
            <li><strong>Sortie :</strong> Un dossier <code>public/</code> contenant le site Web final (HTML/CSS/JS).</li>
        </ul>
    </div>
    <div>
        <img src="/images/schema-zola.png" alt="Schéma fonctionnement Zola" class="shadow-img">
    </div>
</div>

<hr class="spacer">

<h2 style="text-align:center; margin-bottom: 30px;">Démonstrations</h2>

<div class="video-grid">
    <div class="video-card">
        <h3>1. Ajouter un thème</h3>
        <video controls poster="/images/poster-video1.jpg">
            <source src="/projet-tutore/videos/video1.mp4" type="video/mp4">
        </video>
    </div>
    <div class="video-card">
        <h3>2. Créer un site</h3>
        <video controls>
            <source src="/projet-tutore/videos/video2.mp4" type="video/mp4">
        </video>
    </div>
    <div class="video-card">
        <h3>3. Modifier un site</h3>
        <video controls>
            <source src="/projet-tutore/videos/video3.mp4" type="video/mp4">
        </video>
    </div>
</div>

<hr class="spacer">

<div class="split-layout reverse-mobile">
    <div>
        <img src="/projet-tutore/images/schema-electron.png" alt="Architecture Electron" class="shadow-img">
    </div>
    <div>
        <h2>2. L'Application : Electron</h2>
        <p>L'architecture repose sur le modèle <strong>Main / Renderer</strong> d'Electron :</p>
        <ul>
            <li><strong>Le Renderer (Interface) :</strong> C'est la partie visible (HTML/JavaScript). Elle gère les formulaires et l'affichage via manipulation directe du DOM.</li>
            <li><strong>Le Main Process (Node.js) :</strong> C'est la partie "système". Elle a le droit de lire et écrire sur le disque dur de l'utilisateur pour modifier les fichiers <code>.md</code>.</li>
        </ul>
    </div>
</div>

<hr class="spacer">

<h2 style="text-align:center; margin-bottom: 30px;">Technologies utilisées</h2>

<div class="grid-3">
    <div class="card">
        <div class="tech-icon">⚛️</div> 
        <h3>Electron.js</h3>
        <p>Framework d'application de bureau. Gère le cycle de vie de l'application et l'accès au système de fichiers (File System).</p>
    </div>
    <div class="card">
        <div class="tech-icon">🎨</div> 
        <h3>JS / HTML5</h3>
        <p>Interface Utilisateur (GUI). Génération dynamique des formulaires et prévisualisation du Markdown.</p>
    </div>
    <div class="card">
        <div class="tech-icon">⚡</div> 
        <h3>Zola</h3>
        <p>Moteur externe exécuté par l'application pour construire le site (Build) et valider la configuration.</p>
    </div>
</div>

<hr class="spacer">

<div style="text-align:center; background-color: #f8f9fa; padding: 40px; border-radius: 8px; border: 1px solid #e9ecef; margin-top: 40px;">
    <h2 style="margin-top: 0; color: #2c3e50;">📥 Ressources Annexes</h2>
    <p style="margin-bottom: 25px;">Vous souhaitez consulter le rapport détaillé du projet ou les spécifications techniques complètes ?</p>
    <a href="/projet-tutore/documents/rapport_technique.pdf" download style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; transition: background 0.3s;">
        📄 Télécharger le Rapport (.docx)
    </a>
</div>