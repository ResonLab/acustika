# CONTEXTE — Acustika

> **À lire en premier si tu reprends ce projet, IA ou humain.**
> La vue d'ensemble des trois applications est dans [../LISEZ-MOI.md](../LISEZ-MOI.md).
> Ce fichier-ci ne concerne qu'Acustika.

**État au 12 août 2026 — complète, bilingue, avec conditions d'utilisation.** Un
plan où l'on dessine ses zones, où l'on pose ses enceintes et où la couverture se
recalcule ; une vue en coupe ; des retards d'alignement ; **et le conseil de
placement, qui explique pourquoi**.

**La 0.2.0 est publiée** pour Windows et Linux — `.exe`, AppImage et `.deb` —
et c'est elle que téléchargent les visiteurs. S'y ajoutent depuis : les formes
préfaites, le moteur de salle (RT60, distance critique, champ réverbéré) et
l'estimation d'intelligibilité.

```bash
cd Acustika && npm install && npm run dev
cd Acustika && npm run verifier   # typecheck + 8 suites
```

Ce que l'application sait faire aujourd'hui :

| | |
|---|---|
| **Dessiner des zones** | à la souris, point par point, forme quelconque |
| **Pentes** | réglables par zone, en % |
| **Bibliothèque d'enceintes** | choisir un modèle avant de le poser ; ouverture réglable **bande par bande** |
| **Poser et orienter** | clic pour poser, glisser pour déplacer, second point pour la visée |
| **Carte de couverture** | recalculée à chaque geste, échelle de 24 dB |
| **Chiffres par zone** | moyenne et écart, plus l'écart de toute la salle |
| **Projet** | fichier `.acustika` en JSON lisible, ouvrir / enregistrer |
| **Import CSV** | une enceinte par ligne, ouverture par bande |
| **Import de données polaires** | un tableau texte ; l'ouverture à −6 dB est déduite par interpolation |
| **Vue en coupe** | le profil du sol, les oreilles, les enceintes et leur piqué |
| **Retards d'alignement** | les rappels attendent la façade, marge de localisation comprise |
| **Conseil de placement** | 315 placements essayés, et **l'explication de ce que chaque réglage apporte** |
| **Échelle et curseur** | légende fidèle à la carte, niveau lu sous la souris |
| **Formes préfaites** | rectangle, carré, cercle, demi-cercle, éventail, fer à cheval — exactes par construction |
| **La salle** | matériaux par bande, RT60 Sabine et Eyring, **distance critique**, champ réverbéré |
| **Intelligibilité** | STI estimé par la formule de Peutz, le pire point et la part du public sous 0,50 |
| **Français et anglais** | 175 clés, sélecteur dans la barre |
| **Conditions d'utilisation** | écran d'acceptation bloquant, pages publiques déduites du texte source |

Le projet est un **fichier**, pas une ligne de base : une simulation se
transmet, s'archive avec un dossier de chantier, se compare. En JSON lisible —
dans dix ans on l'ouvrira encore avec un éditeur de texte, ce qui est
exactement le reproche fait au GLL. Ce document décrit ce qui a été
décidé, ce qui est réaliste, et surtout ce qui ne l'est pas.

```bash
cd Acustika && npm test     # aucune installation nécessaire
```

`commun/acoustique.js` ne dépend de rien. **Écrit en JavaScript avec les types
en JSDoc**, comme le calcul DMX de Scenika et pour la même raison : il doit
tourner dans un navigateur, dans Node et dans l'application. Une formule qui a
besoin d'être compilée pour atteindre l'un des trois finit dupliquée.

C'est l'étape 2 de la section 7 qui est faite — délibérément avant l'étape 1
(trouver des fichiers CLF), parce qu'elle n'en dépend pas et qu'elle demande,
elle, des fichiers réels que personne n'a encore sous la main.

Ce qui est calculé et **vérifié contre des valeurs connues à la main** :
célérité selon la température, retard de propagation (2,9 ms/m), atténuation en
distance (−6 dB par doublement), somme énergétique de sources (+3 dB pour deux
sources égales, pas +6), atténuation angulaire, niveau en un point, retard
d'appoint avec la marge qui garde la localisation sur la scène.

**Le piège de la division par zéro est traité** : un point de calcul exactement
sur une enceinte est ramené à 10 cm. Sans cela, une seule case infinie ferait
basculer toute l'échelle de couleurs de la carte.

S'y ajoute `calculerCarte()` : la grille de niveaux sur un plan horizontal,
avec minimum, maximum, moyenne et surtout **écart**. C'est l'écart qui décidera
du conseil de placement — une bonne couverture n'est pas une couverture forte,
c'est une couverture régulière. Un test le montre déjà : reculer une enceinte
trop proche du premier rang fait tomber l'écart de 21,6 à 10,9 dB.

**Le calcul vit dans le module, jamais dans la page qui l'affiche.** Une carte
de couleurs est très convaincante même quand elle est fausse : la seule
protection est que le calcul soit au même endroit que ses vérifications.

**Ce que le module ne fait pas, et qu'il ne faut pas laisser croire** : ni
réflexions, ni réverbération, ni déphasage entre sources. Il calcule un champ
direct. L'addition suppose des sources décorrélées ; deux sources cohérentes
peuvent en réalité s'ajouter jusqu'à +6 dB ou s'annuler. **La page le dit
explicitement à l'écran**, et l'application devra continuer de le dire.

---


## Le guide de prise en main

**Le site disait ce que fait l'application et ce qu'elle ne fait pas. Il ne
disait nulle part par où commencer.** Quelqu'un qui télécharge se retrouve
devant une application vide sans savoir quoi cliquer, et c'est là qu'on perd
les gens — pas à la page d'accueil.

`src/partage/guide.ts` porte le texte dans les deux langues et **nulle part ailleurs** :
`scripts/publier-guide.mjs` en déduit `docs/guide.html` et `docs/en/guide.html`,
`scripts/guide-pdf.mjs` en tire les deux PDF joints aux releases. Un guide
recopié à la main divergerait au premier correctif — et c'est le document qu'on
emporte, donc celui qu'on croit.

**L'ordre des étapes n'est pas décoratif** : c'est celui dans lequel
l'application ne refuse rien. `tests/coherence-guide.mjs` le vérifie, en plus de
refuser qu'une page diverge de la source, qu'une traduction soit vide, ou qu'une
étape perde son **piège**. Les pièges sont la moitié de la valeur : ce sont les
choses qu'on ne devine pas et qui coûtent une soirée.

```bash
npm run guide:publier   # les deux pages
npm run guide:pdf       # les deux PDF, dans release/
```

**Trois défauts de ce mécanisme, trouvés en le portant d'une application à
l'autre**, et corrigés dans les quatre dépôts :

· un seuil de longueur prenait « Receipts » et « Backups » — des titres anglais
  parfaitement traduits — pour des traductions vides. On teste désormais le
  vide, pas la longueur. **Un faux échec use un contrôle aussi sûrement qu'un
  faux succès** ;
· le caractère `&` s'écrit `&amp;` en HTML : le contrôle annonçait un texte
  disparu alors que la page était juste ;
· une liste figée d'ancres à réécrire laissait des ancres mortes sur le guide,
  les sections d'une page d'accueil ne portant pas les mêmes noms d'une
  application à l'autre. Toutes les ancres renvoient maintenant à l'accueil.

**Le PDF a révélé un bug qui traînait dans la maison depuis des semaines** :
« `fabriquer-icones.mjs` échoue au-delà de la première image ». Ce n'est ni le
chemin ni le fichier temporaire — **créer une seconde `BrowserWindow` après
avoir travaillé dans la première fait échouer son chargement** sur `ERR_FAILED`.
Une seule fenêtre réutilisée, et les deux PDF sortent. *Une hypothèse a été
suivie puis abandonnée, et elle est notée dans le code : `loadFile` produit bien
sous Windows une adresse mêlant `file:///` et des antislashs. C'est vrai, c'est
corrigé, et ça n'a rien changé.*

---

## 1. Ce que c'est

Un outil de **simulation acoustique** pour la sonorisation : on décrit une salle
et des enceintes, l'application calcule et affiche la couverture sonore.

**Et elle conseille.** C'est ce qui la distingue : elle ne se contente pas
d'afficher une carte, elle propose **où placer les enceintes** et comment les
orienter — hauteur, angle, écartement, retards à appliquer.

**Le conseil s'ajoute à la simulation, il ne la remplace pas.** La carte pour
comprendre, la réponse pour agir. On ne peut d'ailleurs pas conseiller un
placement sans savoir le mesurer d'abord.

---

## 1 bis. Ce que l'utilisateur a demandé, en toutes lettres

Demandé le 9 août 2026, et à tenir :

| Attendu | Où ça en est |
|---|---|
| **Une bibliothèque d'enceintes** (« un stock »), pas une saisie à chaque fois | **fait** |
| **Des zones d'écoute dessinées librement**, et plusieurs par projet | **fait** |
| **Des surfaces en pente** (gradins, parterre incliné) | **fait** |
| **Pas de GLL** — un format ouvert à la place, et du **CSV** | **fait** pour le texte ; le CLF binaire reste ouvert, voir §4 |
| « exactement comme EASE » pour le reste | **non, et ce sera toujours non** — voir §2 |

**Le format ouvert cherché s'appelle CLF** (Common Loudspeaker Format). C'est
celui de la section 3, décidé avant cette demande. **SOFA** (norme AES69) est la
seconde piste. Le CSV reste le filet : quand aucun fichier n'est disponible, on
saisit les données polaires à la main.

Conséquence de forme, à ne pas rater : une salle rectangulaire décrite par deux
dimensions ne suffit plus. Il fallait un modèle où **une salle contient des
zones, chaque zone ayant son contour et sa pente**. C'est fait côté calcul :
`couvertureZone()` n'énumère que les points **dans** le contour et place chacun
à la hauteur que lui donne la pente. Le calcul de niveau, lui, n'a pas bougé —
c'est toujours `niveauTotal`, déjà vérifié.

Une forme en L le montre : le creux est bien exclu, là où un simple rectangle
englobant l'aurait accepté. Des gradins de 8 m à 15 % montent de 1,20 m, et les
oreilles montent avec le sol.

**`couvertureSalle()` rend l'écart de toute la salle, pas la moyenne des
écarts.** Une salle dont le parterre est régulier et le balcon 12 dB en dessous
n'est pas bien couverte, même si chaque zone prise isolément l'est. C'est cette
mesure-là qui devra guider le conseil de placement.

**Tout ce qui a été demandé en toutes lettres est livré**, sauf la lecture du
CLF **binaire** — et le refus de le deviner est motivé au §4.

---

## 2. Ce qui est atteignable, et ce qui ne l'est pas

**À dire franchement, et ça reste vrai après la demande ci-dessus : « comme
EASE » n'est pas atteignable seul.** EASE et les logiciels de modélisation d'enceintes du même
niveau représentent des décennies de travail par des équipes d'acousticiens :
lancer de rayons, géométrie 3D complète, modèles de réverbération, bases de
données d'enceintes mesurées.

**Ce qui est demandé et qui est atteignable** : la bibliothèque d'enceintes,
les zones dessinées librement, les pentes, l'import CLF et CSV. Ce sont des
fonctionnalités de saisie et de géométrie — du travail, pas de la recherche.

**Ce qui ne l'est pas** : le lancer de rayons, les réflexions individuelles, les
bases de données d'enceintes mesurées du marché. Promettre
cela reviendrait à livrer des cartes fausses avec l'aplomb des vraies.

**Ce qui est atteignable, et déjà utile :**

- une salle simple, rectangulaire, décrite par ses dimensions ;
- des enceintes placées à la main, avec leur directivité ;
- le calcul de la pression sonore en chaque point : atténuation en distance et
  atténuation angulaire ;
- une **carte de couverture en couleurs**, qui montre les trous et les
  excès ;
- le **calcul des retards** pour aligner un renfort sur le système principal ;
- puis le conseil de placement (section 4).

C'est un outil honnête qui rend service dès la première version. Ce n'est pas
un simulateur complet, et la documentation ne doit jamais laisser croire le
contraire.

---

## Ce qui reste à faire — au 9 août 2026

Par ordre de valeur. Les trois premiers points sont communs aux applications de
la maison : **regarder comment Ohmnia les a résolus avant de recommencer**.

### 1. Le site de l'application — **fait**

En ligne sur <https://resonlab.github.io/acustika/>, en français et en anglais
(`docs/en/`). **Le CSS est repris tel quel de celui de Scenika, seule la palette
change** : un correctif de mise en forme ne doit pas s'appliquer à un seul site.
La clé de thème `resonlab-theme` est commune à toute la maison.

Une section entière dit **ce que la simulation ne fait pas** — ni réflexions, ni
réverbération, ni déphasage, ni lancer de rayons. Ce n'est pas une note en bas de
page : une carte de couleurs est très convaincante même quand elle est fausse.

**`site/` est devenu `docs/`** : GitHub Pages ne sert que la racine du dépôt ou
`docs/`.

**Le piège, déjà payé sur Scenika, à ne pas réintroduire.** `carte-couverture.html`
importait `../commun/acoustique.js`. Servie par Pages depuis `docs/`, la page
remontait au-dessus de la racine servie : elle se serait affichée normalement et
**la carte aurait été morte**. En local, rien ne l'aurait montré. L'import vise
maintenant `./commun/acoustique.js`, et `npm run site:preparer` y dépose une
copie, **ignorée par git** — la physique vit à un seul endroit.
`.github/workflows/site.yml` refait la copie à chaque publication, après avoir
passé `tests/coherence-site.mjs`.

**La page anglaise est fabriquée depuis la française par substitutions
explicites**, CSS et JavaScript inchangés. `tests/coherence-site.mjs` compare les
structures et **refuse que le CSS diverge**. Vérifié en le cassant : une carte
ajoutée d'un seul côté fait échouer la suite.

*Non vérifié : la carte n'a pas été exécutée dans un navigateur sur l'adresse
publique — le domaine est bloqué depuis l'outil de navigation. Ce qui est
vérifié : les pages répondent en 200 et le module servi est identique octet pour
octet à `commun/acoustique.js`.*

### 2. Français et anglais — **fait, site et application**

Le site est bilingue (point 1), et l'application aussi : `src/partage/i18n.ts`,
101 clés, sélecteur de langue dans la barre. La langue est **propre au poste**
(localStorage) — un projet transmis à un confrère ne lui impose pas la langue
de celui qui l'a créé.

**Le mécanisme est celui d'Ohmnia et de Scenika**, repris tel quel : un objet
`TEXTES`, une clé préfixée par écran, et `npm run typecheck` qui rejette une clé
inconnue. Trois mécanismes différents dans la même maison, ce seraient trois
façons d'oublier une chaîne.

Les refus du processus principal ne sont pas des phrases mais **des clés** — il
ne sait pas quelle langue la fenêtre affiche. Quand le message cite une valeur,
la clé et la valeur voyagent **en JSON** (`traduireErreur`).

`tests/traductions.mjs` refuse une clé sans anglais **ni** français, une clé
déclarée jamais employée, et du texte français accentué en dur dans un écran.

### 3. Empaquetage Windows et Linux

`.exe` (NSIS), AppImage et `.deb`. **Ohmnia a déjà tout** : `electron-builder.yml`
et `.github/workflows/construire.yml`, qui construit les deux systèmes et dépose
une release en brouillon sur une étiquette `v*`. Les recopier en changeant
`appId`, `productName`, l'icône et le mainteneur.

Deux pièges déjà payés sur Ohmnia :

- **electron-builder ne sait pas produire un paquet Linux depuis Windows.** Il
  faut GitHub Actions (ou WSL).
- **Le `.deb` exige `fakeroot`**, absent des runners Ubuntu 24.04 : le workflow
  l'installe explicitement, sinon la construction échoue en quelques secondes
  alors que l'AppImage passe.

L'icône doit être un PNG d'au moins 256×256 dans `build/icon.png`. Les PNG de la
maison sont dans `Identite/png/`.

### 4. Propre à Acustika — **fait, sauf le CLF binaire**

**✔ Le conseil de placement** — ce qui distingue vraiment Acustika, et qui
manquait. `conseillerPlacement()` essaie 315 placements en faisant varier
hauteur, écartement et distance de visée.

**Le critère est unique et explicite** : l'écart de niveau sur toute la salle.
Pas la moyenne, pas le niveau maximal.

**Il explique pourquoi.** Pour chaque réglage, on mesure ce qu'il apporte
**seul**, en ne changeant que lui. Sans cela le résultat est un nombre tombé du
ciel, et personne ne fait confiance à un nombre tombé du ciel : l'outil ne
servirait à rien.

**Il ne réinvente pas des positions, il transforme celles de l'utilisateur** —
un placement qui ignore où il a jugé possible d'accrocher serait inapplicable.
Et il s'applique par le **même** transformateur que celui de l'évaluation :
appliquer autrement donnerait un placement différent de celui qui a été mesuré,
et l'écart annoncé deviendrait un mensonge. Un test le vérifie.

**✔ Les retards d'alignement.** `retardDAppoint()` était écrit et éprouvé mais
branché sur rien. `retardsDAlignement()` prend la première enceinte pour façade
et fait attendre les autres, marge de localisation de 10 ms comprise. La
distance est celle des **trois dimensions** — un mètre de dénivelé compte, et
c'est ce qui a fait échouer mon premier test : le test avait tort.

**✔ La vue en coupe.** Un piqué se juge de profil : vue du dessus, une enceinte
à 4 m qui vise le fond ressemble à une enceinte à 1 m qui vise ses pieds.
L'échelle verticale est celle de l'horizontale — étirer la hauteur rendrait le
dessin lisible et les angles faux. **Elle prélève au milieu des mailles, comme
la carte** : aux bornes, le dernier point tombait sur le contour de la zone et
en sortait au jeu près des flottants, laissant un trou au fond de la salle.

**✔ L'échelle de couleurs et le niveau sous le curseur.** La légende reprend
**exactement** les couleurs de la carte, et un test compare les deux listes
couleur par couleur — un premier jet mettait un dégradé différent dans le CSS.
Le niveau est **lu dans la grille affichée**, jamais recalculé : deux calculs
pour le même point finiraient par se contredire d'un dixième de décibel.

**✔ L'import de données polaires** (`commun/polaire.js`). Ce qu'Acustika
utilise, c'est l'ouverture à −6 dB par bande ; une fiche technique donne un
tableau d'angles et d'atténuations. Le module fait le pont **par
interpolation** : arrondir à la mesure la plus proche ferait varier l'ouverture
par bonds de 20°. Les deux dispositions — angles en colonnes ou en lignes — sont
reconnues toutes seules.

**✔ Les conditions d'utilisation.** `src/partage/conditions.ts` porte le texte
**en français et en anglais**, et **nulle part ailleurs** :
`scripts/publier-conditions.mjs` en déduit `docs/conditions.html` et
`docs/en/terms.html`. Recopié à la main, il divergerait — et deux versions d'un
même engagement qui divergent, c'est pire que pas d'engagement.

**Le risque couvert n'est pas électrique, comme dans Scenika, mais celui du
conseil.** Le point 2 est la raison d'être du texte : Acustika calcule un champ
direct — ni réflexions, ni réverbération, ni déphasage — et le conseil de
placement est une proposition fondée sur un modèle simplifié, jamais une
certitude. Une carte de couleurs est très convaincante même quand elle est
fausse, et un placement recommandé avec une explication articulée l'est encore
plus.

**L'écran bloque l'application**, la case ne s'active qu'après défilement
complet, et l'acceptation est liée à `VERSION_CONDITIONS` : incrémenter la
version fait relire. L'accord vit dans le **navigateur du poste**.

**Un texte qui tient sans défiler compte comme lu** — et c'est un bug réel,
trouvé en lançant l'application, pas en la relisant. Sans cette règle, l'écran
devient un piège dont on ne sort plus : il n'y a rien à faire défiler, `onScroll`
ne se déclenche jamais, la case reste grise pour toujours et **l'application ne
démarre plus du tout**. Cela arrive sur un très grand écran, et cela arrivait
systématiquement dès que la feuille de style ne s'appliquait pas. Le composant
mesure donc la hauteur au montage. **Une porte dont la clé est à l'intérieur ne
se relit pas, elle s'ouvre.**

`tests/coherence-conditions.mjs` compare les deux pages au texte source,
vérifie la version, et refuse que les mises en garde disparaissent. **Éprouvé
en le cassant onze fois** — dont les trois sabotages qui comptent vraiment :
diluer une mise en garde dans la source *et* régénérer les pages, de sorte que
la comparaison source ↔ pages reste satisfaite. Seul le contrôle des mises en
garde peut voir ce cas-là, et il le voit. Les tournures surveillées **évitent
toute apostrophe** : c'est exactement ce qui avait rendu le contrôle de Scenika
incapable d'échouer.

`.github/workflows/site.yml` refuse de publier si cette suite échoue.

*Réserve : ce texte est clair et honnête, il n'est pas validé par un juriste.*

### La salle — écrit le 12 août 2026

**C'est ce qui manquait le plus pour se rapprocher d'EASE.** Jusque-là Acustika
calculait un champ direct et rien d'autre : **la même carte sortait pour une
église et pour un studio traité**, alors que ce sont deux salles opposées.

`commun/salle.js` ajoute le champ diffus : douze matériaux avec leurs
coefficients par bande, aire d'absorption, **RT60 Sabine et Eyring**, constante
de salle, facteur de directivité, **distance critique**, et le niveau réverbéré
qui en découle. Les surfaces se déduisent du contour des zones — sol, plafond,
murs — et le public se compte **à l'unité, pas au mètre carré** : un spectateur
n'a pas de surface au sol, il a une absorption propre, et une salle pleine peut
avoir deux fois l'absorption de la même salle vide.

**Le champ réverbéré entre dans le calcul par un seul point** :
`niveauTotal(..., niveauReverbereDb)` dans `acoustique.js`. Carte, coupe,
statistiques et conseil passent tous par là. L'ajouter dans un seul d'entre eux
aurait donné une carte et un conseil qui se contredisent — le pire cas, parce
que l'utilisateur croirait l'un ou l'autre sans savoir lequel.

#### Le piège trouvé en le mesurant, et qui renverse tout

**L'écart de niveau devient trompeur dès que la salle est prise en compte.** Le
champ réverbéré est uniforme : ajouté à la carte, il écrase les écarts. Mesuré
sur une salle de 20 × 30 × 8 m, une enceinte 90° :

| Salle | RT60 | Écart de niveau | Public au-delà de rc |
|---|---|---|---|
| béton nu | 3,55 s | **1,3 dB** — semble parfait | **98 %** |
| traitée | 0,18 s | **12,8 dB** — semble mauvais | **0 %** |

Les deux mesures pointent **en sens opposé**. Le conseil de placement retenant
le placement dont l'écart est le plus faible, le brancher sur l'écart réverbéré
lui aurait fait préférer la cathédrale — avec l'air d'avoir raison.

Deux règles en découlent, et `tests/salle.mjs` les protège :

1. **Le conseil raisonne sur le champ direct seul.** C'est le seul qu'un
   placement contrôle ; la réverbération se corrige en traitant la salle ou en
   rapprochant une source.
2. **La mesure honnête est la part du public au-delà de la distance critique**,
   affichée à côté de l'écart, avec la mise en garde que l'écart ne mesure plus
   la qualité du placement.

#### Ce que ce modèle n'est pas

Champ diffus **statistique** : il suppose l'énergie réverbérée uniformément
répartie, ce qui est faux près des parois et dans un volume long et étroit. Il
ne voit ni écho franc, ni mode propre du grave, ni diffusion. **Ce n'est pas du
lancer de rayons**, et le module le dit en tête.

Le facteur de directivité est **approché par un cône**, `Q = 2 / (1 − cos(θ/2))`,
faute de mieux : Acustika ne connaît des enceintes que leur ouverture par bande.
Ce Q est donc optimiste, donc le champ réverbéré réel est un peu plus fort que
calculé. C'est écrit dans le code.

Les coefficients d'absorption sont des **valeurs de tables publiées, pas des
mesures** : un même matériau varie de 30 % d'une source à l'autre selon la pose
et le support. L'écran le dit.

**La salle est décrite mais inactive dans un projet neuf.** Des matériaux par
défaut donneraient une réverbération inventée, et une carte fausse est pire
qu'une carte incomplète : elle a l'aplomb de la vraie.

### Les formes préfaites — écrit le 12 août 2026

Rectangle, carré, cercle, demi-cercle, éventail et fer à cheval, dans
`commun/formes.js`. **Un rectangle dessiné point par point n'en est pas un** :
les côtés ne sont pas parallèles, l'aire est fausse de quelques pour cent, et
toute la couverture — et maintenant toute la réverbération — hérite de cette
approximation.

La table `FORMES` est la seule source : l'interface la parcourt pour construire
ses boutons et ses champs, donc aucune liste ne peut diverger des fonctions.

**Deux erreurs attrapées par des valeurs calculées à part**, et non reprises du
code : le déficit d'aire d'un polygone inscrit vaut `2π²/3n²` et non `π²/3n²`
— j'avais écrit la moitié du vrai dans mon propre commentaire ; et le contrôle
des traductions réclamait la suppression de douze clés vivantes, parce qu'il ne
lisait que `src/` alors que les libellés des formes sont nommés dans `commun/`.
**Suivre son conseil aurait cassé l'écran.**

### L'intelligibilité — écrit le 12 août 2026

**Ce document disait « STI hors d'atteinte ». Ce n'est plus exact, et il fallait
le corriger plutôt que de le laisser mentir.**

Ce qui était hors d'atteinte, et le reste : le STI d'EASE, calculé à partir de
réponses impulsionnelles obtenues par lancer de rayons. Ce qui ne l'est plus,
depuis que le moteur de salle donne RT60, volume et directivité : **l'estimation
de Peutz**, en forme fermée.

```
%ALcons = 200 · d² · RT60² / (V · Q)          puis   STI = 0,9482 − 0,1845 · ln(%ALcons)
```

C'est le calcul qu'un acousticien fait au dos d'une enveloppe, utile depuis
1971. La conversion vers le STI est vérifiée contre une table publiée : 2 % vaut
0,82, 10 % vaut 0,52, 15 % vaut 0,45.

**Deux plafonds, et les deux comptent.** Au-delà de 3,16 fois la distance
critique, la formule sature à `9 · RT60` : le champ réverbéré domine tellement
qu'éloigner l'auditeur n'y change plus rien. Et le même plafond vaut **en deçà**,
dans une salle petite et très réverbérante où la formule brute le dépasse et
cesse d'avoir un sens. Ce second cas n'était couvert par aucun test au premier
jet — le sabotage « retirer le `Math.min` » passait. Le cas qui discrimine est
maintenant écrit : V = 1000, RT 3 s, Q 6,83, rc 5 m, à 12 m — brut 37,95 %,
plafonné 27 %.

**Ce qu'on affiche est le pire point, pas une moyenne.** Personne n'est assis à
la moyenne, et ce qu'on veut savoir est si quelqu'un ne comprendra pas. Avec la
part du public sous STI 0,50.

Mesuré sur la salle de référence, une enceinte 90° :

| Salle | RT60 | STI le pire | Public sous 0,50 |
|---|---|---|---|
| béton nu | 3,55 s | **0,31** — médiocre | **69 %** |
| traitée | 0,18 s | 1,00 — excellent | 0 % |

**La réserve est affichée à l'écran, et elle doit le rester** : ce n'est ni une
mesure, ni un calcul par réponse impulsionnelle. Le modèle ignore les réflexions
individuelles, donc **il ne voit pas un écho de fond de salle** — qui peut
détruire l'intelligibilité sans changer ni le RT60 ni la distance critique.

Six sabotages sur le calcul, tous attrapés.

### Le CLF binaire — la seule chose qui reste

**Deux vrais fichiers sont dans `tests/fichiers/`** : `cls-3300.CF1` et
`Coax8.CF2`, fournis le 10 août 2026. C'est ce qui manquait pour travailler
autrement qu'en devinant.

**Ce qui est établi** en les analysant :

- L'en-tête porte `v1.0e` à l'offset 20, puis un marqueur `AD BA`.
- **Le premier octet distingue les deux formats** : `0x40` pour CF1, `0x41`
  pour CF2.
- Les métadonnées sont en clair : fabricant, modèle, « Column Loudspeaker »,
  les dates, « Anechoic to 40ms », « Normalized to 1 meter ».
- De longues suites de flottants little-endian **ressemblent vraiment à des
  dB** : `-10,1 · -8,8 · -8,4 · -9,5 · -11,0 · -12,3…`, une progression douce,
  pas du bruit.

**Ce qui manque** : la carte qui dit *quelle suite correspond à quelle bande et
à quel angle*. Chaînes et tableaux s'entremêlent comme les champs d'une
structure C.

**Ne pas écrire ce lecteur au jugé.** La chaîne est : fichier → directivité →
carte de couverture → **conseil de placement**. Un octet mal interprété, et
Acustika conseille un placement faux avec une explication parfaitement
articulée. `commun/polaire.js` **reconnaît et refuse** un binaire, avec un
message qui dit quoi faire.

#### Les ancres de CLF Viewer — 15 août 2026

**L'utilisateur a ouvert `cls-3300.CF1` dans CLF Viewer et fourni la capture.**
C'est le premier point d'appui certain de tout ce travail : des valeurs lues
dans l'outil de référence, et non déduites du binaire.

Trois suites de la table électro-acoustique se retrouvent **exactement** dans le
fichier, en flottants little-endian :

| | Offset |
|---|---|
| Sensibilité — 64,8 · 69,4 · 74,6 · 80,7 · 83,4 · 85,4 · 85,9 · 86,0 dB | `0x1248` |
| Impédance — 6,2 · 6,4 · 6,8 · 7,5 · 9,7 · 12,9 · 9,6 · 7,7 Ω | `0x1270` |
| Q axial — 1,1 · 1,2 · 1,5 · 4,1 · 8,6 · 22,8 · 36,2 · 20,7 | `0x1338` |

**Et une correction de fond : le fichier porte huit bandes, de 125 Hz à
16 kHz** — la colonne 63 Hz est vide à l'écran. Toutes les tentatives
précédentes en supposaient dix.

L'écran donne aussi les largeurs à −6 dB, horizontales
(360 · 360 · 360 · 206 · 191 · 92 · 63 · 71) et verticales
(360 · 360 · 360 · 86 · 44 · 21 · 8 · 46), et le rayonnement : **fullsphere**.
Ce sont les mesures qui permettront de valider — ou de réfuter — un candidat.

#### Ce qui a été tenté le 15 août 2026, et qui a échoué

`scripts/analyser-clf.mjs` relève, de façon reproductible, ce que les deux
fichiers réels laissent voir : en-tête, octet de format, version, marqueur,
métadonnées, et les plages de flottants qui se comportent comme des décibels.
**Il ne produit aucune donnée d'enceinte** : c'est un instrument de mesure, pas
un lecteur.

**Une hypothèse séduisante a été formée puis réfutée, et c'est le résultat le
plus utile de la tentative.** L'arithmétique tombait juste : CF2 offrait de quoi
loger 30 bandes de 72 × 37 au pas de 5°, CF1 une dizaine de bandes de 36 × 19 au
pas de 10°. Exactement le genre de coïncidence qui donne envie d'écrire le
lecteur.

Elle est fausse, pour deux raisons que seule l'épreuve montre :

· **un ballon a une propriété que l'arithmétique ignore** — aux deux pôles, tous
  les azimuts décrivent le même point, donc leurs valeurs doivent être
  identiques. Le test donne des écarts de **40 dB** là où il faudrait zéro ;
· **le grand bloc de CF2 est entièrement composé de zéros.** La factorisation
  comptait du remplissage. Un long remplissage passe tous les critères — ce sont
  des flottants finis, dans la plage des décibels — et se factorise
  magnifiquement. Le script affiche désormais la **part de zéros** de chaque
  plage, et signale au-delà de 50 % qu'il s'agit de place réservée.

**Sans ce contrôle, le lecteur aurait été écrit** — et il aurait rendu des
directivités fausses avec l'aplomb des vraies. C'est précisément le scénario que
le refus de `commun/polaire.js` existe pour éviter, et il tient : passé le vrai
`cls-3300.CF1`, il répond « Ce fichier est binaire… Exportez les données
polaires en texte depuis votre visualiseur, ou saisissez-les à la main. »

Ce qui manque reste ce qui manquait : **l'ordre**. Quelle bande vient en
premier, l'azimut avant l'élévation ou l'inverse, et où se trouve le zéro
angulaire. Trois inconnues qu'aucune arithmétique ne tranche, et dont chacune
produit une carte crédible et fausse.

#### Une seconde hypothèse, réfutée le même jour

Muni des largeurs lues à l'écran, on peut chercher le ballon qui les **reproduit**
plutôt que celui dont la taille tombe juste. Un candidat est sorti : 24 × 13 au
pas de 15°, élévation variant le plus vite, à `0x3ba4`. Il reproduisait **sept
largeurs horizontales sur huit** à quatre degrés près.

Il est faux, et deux contrôles indépendants le disent :

· les largeurs **verticales** — que la recherche n'avait pas servi à trouver —
  sont fausses de **113° en moyenne** ;
· dans six bandes sur huit, la valeur **sur l'axe n'est pas le maximum** du
  ballon, ce qu'aucune enceinte ne fait.

**Et la coïncidence s'explique.** Trois des huit largeurs de référence valent
360° : n'importe quelle courbe large les satisfait. Le « sept sur huit » n'était
donc que « quatre valeurs non triviales sur cinq », cherchées parmi 240 000
combinaisons d'offset, de géométrie et d'ordre. À ce compte-là, le hasard produit
ce genre de correspondance.

**C'est la deuxième fois dans la même journée qu'un découpage plausible tombe
devant une vérification indépendante.** La leçon n'est pas qu'il faut chercher
mieux : c'est qu'un ajustement qui n'a pas été contredit par une mesure **qu'il
n'a pas servi à produire** ne prouve rien.

**Ce qui manque encore** : le format ne se déduit pas de huit valeurs par bande
et de deux largeurs. Il faudrait soit un fichier `.CIF` en texte, soit — plus
court — relever dans CLF Viewer **quelques valeurs du ballon lui-même**, pas de
la table : par exemple, à 4 kHz, l'atténuation à 30°, 60° et 90° horizontaux.
Trois points de la courbe polaire suffiraient à trancher l'ordre et le zéro
angulaire, là où les largeurs ne donnent qu'un seuil.

**Deux pistes, par ordre de sûreté :**

1. **Les fichiers `.CIF`** — CLF Authoring travaille à partir d'eux et les
   compile en CF1/CF2. **Ils sont en texte** : lisibles sans rien deviner. C'est
   le chemin à privilégier.
2. **Vérifier contre CLF Viewer** : ouvrir `cls-3300.CF1` et relever deux ou
   trois valeurs à l'écran — « à 1 kHz, −6 dB vers 45° ». Cela transforme une
   hypothèse de lecture en certitude, au lieu de la supposer.

Les deux outils sont téléchargeables gratuitement sur `clfgroup.org`.

### Ce qui n'est pas fait, et qui ne le sera pas ainsi

**« Comme EASE » reste hors d'atteinte** : lancer de rayons, géométrie 3D
complète, bases d'enceintes mesurées. Voir §2.

**La marche suivante, elle, est atteignable : l'acoustique statistique.**
Aujourd'hui Acustika calcule un champ direct, comme si la salle n'avait pas de
murs. Or au-delà de la distance critique, c'est le champ réverbéré qui domine :
le niveau cesse de baisser de 6 dB par doublement et se stabilise. **Un
placement jugé sur le seul champ direct paraît donc bien pire au fond qu'il ne
l'est, et l'écart — qui décide du conseil — est faux.**

Ce qu'il faudrait : Sabine, Eyring au-delà de 0,2 d'absorption moyenne, la
constante de salle, la distance critique, et l'addition en énergie du direct et
du réverbéré. Des formules de manuel, vérifiables à la main. **Ce n'est pas du
lancer de rayons** : le modèle ignorerait la forme de la salle et la position
des absorbants, et se tromperait dans un couloir ou sous un balcon profond.
C'est ce qu'un acousticien calcule avant d'ouvrir EASE — et cela suffirait à ne
plus raisonner en plein air.

---

## 3. Les données d'enceintes : pas de GLL

**GLL est un format fermé d'AFMG**, l'éditeur d'EASE. Pas de spécification
publique : il se lit via leurs propres outils et un SDK sous licence. Écrire un
lecteur demanderait leur accord, ou du rétro-ingénierie qui se heurte en général
aux conditions d'utilisation.

*Réserve : les conditions de licence exactes d'AFMG n'ont pas été vérifiées. Si
ce point devient décisif, leur écrire — c'est une question à dix minutes.*

**Les formats à utiliser à la place :**

| Format | Pourquoi |
|---|---|
| **CLF** — *Common Loudspeaker Format* | Créé précisément comme alternative ouverte. Documenté, visualiseur gratuit, des fabricants publient dedans. **À privilégier.** |
| **SOFA** — norme AES69 | Ouverte, basée sur HDF5, très bien documentée, bibliothèques libres. Surtout connue pour les HRTF, décrit aussi la directivité d'enceintes. |
| **Saisie manuelle** | Repli qui marche toujours : beaucoup de fabricants publient leurs diagrammes polaires en texte ou en CSV dans leurs fiches techniques. Quelques angles et quelques bandes de fréquence suffisent à une carte utile. |

---

## 4. Le conseil de placement, par étapes

Ne pas tout construire d'un coup. Chaque étape est utilisable seule.

**Étape 1 — mesurer.** Couverture et pression sonore pour un placement donné,
saisi par l'utilisateur. Sans cette base, rien d'autre n'est possible.

**Étape 2 — conseiller.** L'application essaie plusieurs placements et retient
celui dont la couverture est la plus régulière. Commencer simple : faire varier
la hauteur, l'angle et l'écartement dans des plages raisonnables, et garder le
meilleur selon un critère unique et explicite — par exemple le plus faible écart
de niveau entre le point le plus fort et le point le plus faible de la zone
public.

**Étape 3 — expliquer.** Dire **pourquoi** ce placement est meilleur. Sans
explication, personne ne fera confiance au résultat, et l'outil ne servira à
rien.

**Le conseil reste une proposition, jamais une certitude.** La salle réelle ne
ressemble jamais au modèle : matériaux, public, mobilier, formes non
rectangulaires. L'interface doit le dire, comme Ohmnia dit qu'elle ne rend pas
conforme.

---

## 5. Décisions prises

- **Nom** : Acustika. **Dégradé** : `#B58CFF` → `#6D4AE0` (violet).
  Logo dans [../Identite/acustika.svg](../Identite/acustika.svg).
- **Pas de serveur multi-postes**, volontairement. Acustika travaille sur des
  fichiers de projet — une salle, des enceintes, un calcul — et non sur des
  données d'entreprise partagées. Deux personnes ne modifient pas une simulation
  en même temps. Lui greffer un serveur ajouterait de la complexité sans
  répondre à un besoin réel.
- **Application à documents**, donc : un projet = un fichier, qu'on ouvre,
  enregistre et envoie. Modèle différent d'Ohmnia et Scenika, qui ont une base
  de données permanente.
- **Les principes de la maison s'appliquent** : code simple à relire, aucune
  connexion, tout en français.

---

## 6. La physique minimale, et ses pièges

**Ce qui est simple**
L'atténuation en distance : le niveau baisse d'environ 6 dB chaque fois que la
distance double. Le retard : environ 343 mètres par seconde dans l'air, donc
2,9 ms par mètre. Ces deux formules suffisent à un premier outil utile.

**Ce qui l'est moins, et qu'il ne faut pas bâcler**
La directivité dépend de la fréquence : une enceinte est très directive dans
l'aigu et quasi omnidirectionnelle dans le grave. **Un calcul à une seule
fréquence est trompeur** et donnera de mauvais conseils. Prévoir des bandes
d'octave dès le départ, même peu nombreuses.

L'addition de deux enceintes n'est pas une addition de décibels. Deux sources
identiques peuvent s'ajouter ou s'annuler selon leur déphasage. Traiter le cas
honnêtement, ou afficher clairement qu'on ne le traite pas.

**La règle d'Ohmnia s'applique ici plus qu'ailleurs : une formule = un seul
endroit, et toute division protégée contre zéro.** Une distance nulle — un point
de calcul exactement sur une enceinte — fait exploser le calcul.

---

## 7. Par où commencer

1. **Trouver deux ou trois fichiers CLF réels** et vérifier qu'on sait les lire.
   Tout le reste en dépend : sans données d'enceintes, pas de simulation.
2. **Écrire le calcul de pression sonore en un point**, isolé, testable, avec
   des cas connus à la main pour le vérifier.
3. **Afficher une carte** pour une salle rectangulaire et une seule enceinte.
4. Seulement ensuite : plusieurs enceintes, puis les retards, puis le conseil.

**Vérifier les calculs contre des valeurs connues avant d'afficher quoi que ce
soit.** Une carte de couleurs est très convaincante, même quand elle est fausse.
