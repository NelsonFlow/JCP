# Générateur de Profil Polygone — DIN 32712

Outil de calcul et génération de profils polygones selon la norme **DIN 32712 : 2012-03**.  
Compatible export DXF pour **ESPRIT CAM** (Fanuc).

Développé par **Nelson Flow**.

---

## Déploiement sur Vercel

### 1. Mettre le projet sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — DIN 32712 générateur"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/din32712-app.git
git push -u origin main
```

### 2. Déployer sur Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer **"Add New Project"**
3. Importer le repo GitHub `din32712-app`
4. Vercel détecte automatiquement Vite → cliquer **Deploy**
5. L'URL est générée automatiquement ✅

---

## Lancer en local (développement)

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
```

---

## Fonctionnalités

- Calcul selon formules cartésiennes DIN 32712
- Incrément angulaire 0.01° (36 000 points)
- Visualisation 2D du profil
- Export fichier DXF compatible ESPRIT CAM
- Support P3C / P4C / P5C / P6C
