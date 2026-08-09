# CONTEXTE — Acustika

> **À lire en premier si tu reprends ce projet, IA ou humain.**
> La vue d'ensemble des trois applications est dans [../LISEZ-MOI.md](../LISEZ-MOI.md).
> Ce fichier-ci ne concerne qu'Acustika.

**État : la physique est écrite et vérifiée, et la carte de couverture
s'affiche.** L'application Electron n'est pas encore commencée ; la carte vit
pour l'instant dans une page (`site/carte-couverture.html`) qui servira de base
à l'écran de l'application. Ce document décrit ce qui a été
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

## 2. Ce qui est atteignable, et ce qui ne l'est pas

**À dire franchement, une fois pour toutes : « comme EASE » n'est pas
atteignable seul.** EASE et les logiciels de modélisation d'enceintes du même
niveau représentent des décennies de travail par des équipes d'acousticiens :
lancer de rayons, géométrie 3D complète, modèles de réverbération, bases de
données d'enceintes mesurées.

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
