# 🎮 GamerQuizz

Quiz jeux vidéo multi-formats : **image qui se précise, son, citation, anecdote, date de sortie, devinette.** Solo avec combo/score, et bientôt des salons multijoueur. FR/EN.

🔗 **Jouer :** https://shuhya.github.io/gamerquizz/

## Structure

```
index.html          → page unique (HTML), ne contient plus de CSS/JS inline
css/style.css       → tout le style (thème Neon Arcade)
js/questions.js     → la banque de questions (59 questions) — MODIFIER ICI pour en ajouter
js/app.js           → le moteur de jeu (scoring, combo, timer) + SFX Web Audio
assets/img/         → captures d'écran des questions image
assets/snd/         → extraits audio des questions son (à venir)
```

## Ajouter une question
Dans `js/questions.js`, la constante `QUESTIONS` :
```js
{ id:'img24', format:'image', theme:'cultes', diff:'medium',
  asset:'assets/img/ma_capture.jpg', ic:'📸',
  text:'Indice…', opts:['A','Bonne réponse','C','D'], ans:1 },
```
- `format` : `image` | `sound` | `citation` | `anecdote` | `date` | `riddle`
- `diff` : `easy` | `medium` | `hard`
- `ans` : index (0-3) de la bonne réponse dans `opts` (l'ordre est mélangé à l'affichage)

## Fonctionnalités (v0.2)
- 59 questions : 36 texte + 23 image avec effet « se précise »
- Scoring « réponds tôt » + combo multiplicateur (×2, ×3…)
- Timer 12 s avec décompte, urgence rouge, tick-tick final
- SFX arcade générés en Web Audio (zéro fichier) : bonne réponse, erreur, combo, timeout, fanfare
- Flash vert/rouge plein écran, shake de carte, pop « COMBO ×N », vibration mobile
- Bouton mute, raccourcis clavier 1-4
- Rangs S → D à la fin de partie

## Roadmap
- [x] MVP solo v0.2
- [ ] Vague audio (23 MP3 10-15 s dans assets/snd/)
- [ ] Comptes + classement (Supabase)
- [ ] Salons multijoueur + tournois + mode Rétro CRT
- [ ] i18n EN

*Projet personnel — les captures et extraits appartiennent à leurs éditeurs respectifs.*
