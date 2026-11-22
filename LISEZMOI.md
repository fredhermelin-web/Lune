# Lune & Ciel

Mon petit observatoire personnel : la Lune, bientôt le Soleil et la carte du ciel.
Application web installable (PWA), en JavaScript pur, sans aucun outil de compilation.

## Lancer sur le PC

```powershell
python -E -P tools/serve.py
```

Puis ouvrir http://127.0.0.1:5173/ dans le navigateur.

## Installer sur le téléphone (Poco X7 Pro)

La position GPS et le mode hors ligne exigent une adresse **HTTPS**. Le plus simple, sans rien installer :

1. Créer un compte gratuit sur **Netlify** (ou Cloudflare Pages, « Direct Upload »).
2. Sur https://app.netlify.com/drop, glisser le dossier du projet (`F:\Lune Ap`).
3. Netlify donne une adresse du type `https://xxxx.netlify.app`. Elle n'est référencée nulle part.
4. L'ouvrir dans Chrome sur le téléphone, puis **⋮ → Ajouter à l'écran d'accueil → Installer**.

**Mise à jour :** modifier `VERSION` dans `sw.js`, puis glisser à nouveau le dossier sur Netlify.

**Aperçu rapide sans HTTPS :** même Wi-Fi que le PC, lancer
`$env:HOST='0.0.0.0'; python -E -P tools/serve.py`, puis ouvrir `http://<IP-du-PC>:5173/` sur le téléphone.
Dans ce mode, ni GPS ni hors ligne : la position de la maison est utilisée.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/state.js` | Horloge centrale (instant choisi, lieu, réglages), partagée par tous les écrans |
| `src/astro.js` | Calculs : phase, illumination, lever/coucher, libration, orientation réelle |
| `src/moon-renderer.js` | Rendu WebGL2 physique de la Lune (lunar-Lambert, ombres portées, lumière cendrée) |
| `src/timeline.js`, `src/curve.js`, `src/scrub.js` | Bandeau des jours, courbe du cycle, gestes avec élan |
| `src/panels.js` | Éphémérides et réglages (GPS, maison, orientation) |
| `textures/` | Cartes NASA converties (`tools/` contient les scripts de conversion) |

## Crédits

- Cartes de la Lune : NASA Scientific Visualization Studio, *CGI Moon Kit* (LRO · LROC WAC, LOLA).
- Calculs : [astronomy-engine](https://github.com/cosinekitty/astronomy), Don Cross, licence MIT (`vendor/astronomy.js`).
- Polices : EB Garamond et Inter (SIL Open Font License), via Fontsource.

*Ursine, le temps venra.*
