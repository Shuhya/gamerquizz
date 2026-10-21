# 🎮 GamerQuizz

Quiz jeux vidéo multi-formats : **image qui se précise, son, citation, anecdote, date de sortie, devinette.** Solo avec combo/score, et bientôt des salons multijoueur. FR/EN.

## Jouer
Ouvrir `index.html` dans un navigateur — aucune installation. En ligne : GitHub Pages → Settings → Pages → branche `main` / root.

## Structure
- `index.html` — site complet (accueil, quiz, résultats)
- `assets/img/` — captures des questions image
- `assets/snd/` — extraits audio (à venir)

## Ajouter une question
Dans la constante `QUESTIONS` de `index.html` :
```js
{ id:'img24', format:'image', theme:'cultes', diff:'medium',
  asset:'assets/img/ma_capture.jpg', ic:'📸',
  text:'Indice…', opts:['A','Bonne réponse','C','D'], ans:1 },
```
`format` : image | sound | citation | anecdote | date | riddle · `diff` : easy | medium | hard

## Roadmap
- [x] MVP solo : 59 questions (36 texte + 23 image), filtres, combo, rangs
- [ ] Vague audio (23 MP3 10-15 s)
- [ ] Comptes + classement (Supabase)
- [ ] Salons multijoueur + tournois + mode Rétro CRT
