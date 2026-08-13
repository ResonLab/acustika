# Acustika

Simulation acoustique pour la sonorisation : on décrit une salle et des
enceintes, l'application calcule et affiche la **couverture sonore**.

Application desktop (Electron), 100 % locale, à documents. Une application de la
maison [ResonLab](https://github.com/ResonLab).

## Ce qui fonctionne aujourd'hui

- **Zones dessinées à la souris**, forme quelconque, plusieurs par projet.
- **Pentes** réglables par zone : gradins, parterre incliné.
- **Bibliothèque d'enceintes** : on choisit un modèle avant de le poser.
  L'ouverture se règle **bande par bande**.
- **Poser et orienter** : clic pour poser, glisser pour déplacer, second point
  pour la visée.
- **Carte de couverture** recalculée à chaque geste, chiffres par zone.
- **Projets** en fichier `.acustika` (JSON lisible), import CSV d'enceintes.

## Ce qu'elle ne fait pas, et qu'il ne faut pas laisser croire

Elle calcule un **champ direct** : ni réflexions sur les parois, ni
réverbération, ni déphasage entre sources. Deux enceintes y ajoutent 3 dB là où,
en vrai, elles peuvent s'ajouter jusqu'à 6 dB ou s'annuler.

Elle sert à **comparer des placements**, pas à promettre un résultat. Une carte
de couleurs est très convaincante même quand elle est fausse : c'est pourquoi
chaque formule est vérifiée contre des valeurs connues à la main avant d'être
affichée, et pourquoi l'interface dit à l'écran ce qu'elle ignore.

**« Comme EASE » n'est pas atteignable seul** : lancer de rayons, réverbération,
bases d'enceintes mesurées, c'est des décennies de travail par des équipes
d'acousticiens. Ce qui l'est : la géométrie, les zones, les pentes, la
bibliothèque, l'import ouvert — et le conseil de placement.

## Le chiffre qui compte

L'**écart** entre le point le plus fort et le plus faible de la salle. Une
bonne couverture n'est pas une couverture forte, c'est une couverture
régulière. Et c'est l'écart de **toute la salle**, pas la moyenne des écarts :
une salle dont le parterre est régulier et le balcon 12 dB en dessous n'est pas
bien couverte.

## Les données d'enceintes

Pas de **GLL** : format fermé, sans spécification publique. La cible est
**CLF** (ouvert), puis **SOFA** (norme AES69), avec l'import **CSV** comme
filet. Les enceintes livrées sont des gabarits génériques à corriger avec la
fiche technique réelle — une directivité inventée donne un placement faux avec
l'air d'être sûr.

## Démarrer

```bash
npm install
npm run verifier   # typecheck + 2 suites
npm run dev
```

## Les applications de la maison

Cinq programmes, cinq publics, une seule façon de travailler : vos données
restent sur votre machine.

- [Ohmnia](https://github.com/ResonLab/ohmnia) — gestion pour indépendant : facturation, devis, suivi du temps, inventaire
- [Scenika](https://github.com/ResonLab/scenika) — parc son et lumière, locations, puissance, adressage DMX
- **Acustika** — simulation acoustique : couverture d'enceintes dans une salle *(vous y êtes)*
- [Lumika](https://github.com/ResonLab/lumika) — plan de feu de théâtre : perches, patch, feuille imprimable
- [Nexika](https://github.com/ResonLab/nexika) — le serveur multi-postes, commun à Ohmnia et Scenika

Tout est présenté sur [resonlab.github.io](https://resonlab.github.io).

## Licence

MIT.
