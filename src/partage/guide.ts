/**
 * Le guide de prise en main — **comment on s'en sert**.
 *
 * Le site dit ce que fait Acustika et ce qu'elle ne fait pas. Il ne dit nulle
 * part par où l'on commence. Quelqu'un qui télécharge se retrouve devant un
 * plan vide sans savoir quoi cliquer, et **c'est là qu'on perd les gens**.
 *
 * Le texte vit ici, dans les deux langues, et **nulle part ailleurs** :
 * `scripts/publier-guide.mjs` en déduit les deux pages, `scripts/guide-pdf.mjs`
 * en tire le PDF joint aux releases.
 *
 * **Ce guide a une charge en plus des autres.** Acustika produit des cartes de
 * couleurs et des placements recommandés — deux choses très convaincantes même
 * quand elles sont fausses. Chaque étape doit donc dire ce que le chiffre
 * affiché prouve, et ce qu'il ne prouve pas.
 */

export interface EtapeGuide {
  titre: { fr: string; en: string }
  texte: { fr: string; en: string }
  /** Ce qui coince à cette étape, et qu'on ne devine pas. */
  piege?: { fr: string; en: string }
}

export interface SectionGuide {
  titre: { fr: string; en: string }
  intro: { fr: string; en: string }
  etapes: EtapeGuide[]
}

export const GUIDE: SectionGuide[] = [
  {
    titre: { fr: '1. Remplir la bibliothèque', en: '1. Fill the library' },
    intro: {
      fr: 'On commence toujours par là. On ne pose pas une enceinte qui n’existe pas : sans modèle en bibliothèque, le plan n’a rien à vous proposer.',
      en: 'Always start here. You cannot place a loudspeaker that does not exist: with no model in the library, the plan has nothing to offer you.'
    },
    etapes: [
      {
        titre: { fr: 'Saisir une enceinte', en: 'Enter a loudspeaker' },
        texte: {
          fr: 'Onglet Bibliothèque. Son nom, sa marque, son niveau à un mètre dans l’axe — celui des fiches techniques — et son ouverture à −6 dB, **bande par bande**.',
          en: 'Library tab. Its name, its brand, its level at one metre on axis — the figure from the datasheet — and its coverage angle at −6 dB, **band by band**.'
        },
        piege: {
          fr: 'L’ouverture dépend de la fréquence. Une enceinte est très directive dans l’aigu et presque omnidirectionnelle dans le grave : une valeur unique donnerait de mauvais conseils, et c’est pour cela que le champ est par bande.',
          en: 'Coverage depends on frequency. A loudspeaker is very directional in the treble and nearly omnidirectional in the bass: a single figure would give bad advice, which is why the field is per band.'
        }
      },
      {
        titre: { fr: 'Importer des données polaires', en: 'Import polar data' },
        texte: {
          fr: 'Plutôt que de tout saisir : exportez un tableau texte depuis votre visualiseur, angles en colonnes ou en lignes — les deux dispositions sont reconnues. L’ouverture à −6 dB est déduite par interpolation entre vos relevés.',
          en: 'Rather than typing everything: export a text table from your viewer, angles in columns or in rows — both layouts are recognised. The −6 dB coverage is derived by interpolating between your readings.'
        },
        piege: {
          fr: 'Les fichiers CLF binaires (.cf1, .cf2) ne sont pas lus, et ne le seront pas. Leur structure n’est pas publique : un lecteur qui devinerait produirait des directivités fausses, donc des placements faux **avec l’aplomb des vrais**.',
          en: 'Binary CLF files (.cf1, .cf2) are not read, and will not be. Their structure is not public: a reader that guessed would produce wrong directivity, hence wrong placements **with the confidence of right ones**.'
        }
      }
    ]
  },
  {
    titre: { fr: '2. Dessiner la salle', en: '2. Draw the room' },
    intro: {
      fr: 'Une zone d’écoute est un contour, une altitude et une pente. C’est ce qui remplace la « salle rectangulaire » des outils simplistes.',
      en: 'A listening zone is an outline, an elevation and a rake. That is what replaces the "rectangular room" of simplistic tools.'
    },
    etapes: [
      {
        titre: { fr: 'Poser une forme préfaite', en: 'Place a preset shape' },
        texte: {
          fr: 'Onglet Plan, bouton Forme préfaite. Rectangle, carré, cercle, demi-cercle, éventail, fer à cheval : vous saisissez les cotes, la forme se pose au centre et reste déplaçable.',
          en: 'Plan tab, Preset shape button. Rectangle, square, circle, half-circle, fan, horseshoe: you enter the dimensions, the shape lands at the centre and stays movable.'
        },
        piege: {
          fr: 'Un rectangle dessiné point par point à la souris n’en est pas un : les côtés ne sont pas parallèles, l’aire est fausse de quelques pour cent, et **toute la réverbération hérite de cette approximation**. Si votre salle est une forme simple, posez-la ; ne la dessinez pas.',
          en: 'A rectangle drawn point by point with the mouse is not one: the sides are not parallel, the area is off by a few percent, and **all the reverberation inherits that approximation**. If your room is a simple shape, place it; do not draw it.'
        }
      },
      {
        titre: { fr: 'Les gradins et les balcons', en: 'Raked seating and balconies' },
        texte: {
          fr: 'Chaque zone porte son altitude et sa pente en pourcent. Un balcon est une seconde zone, plus haute. Les oreilles montent avec le sol.',
          en: 'Each zone carries its elevation and its rake in percent. A balcony is a second zone, higher up. Ears rise with the floor.'
        },
        piege: {
          fr: 'L’écart affiché est celui de **toute la salle**, pas la moyenne des écarts par zone. Un parterre régulier avec un balcon 12 dB en dessous n’est pas une salle bien couverte, même si chaque zone prise isolément l’est.',
          en: 'The spread shown is that of **the whole room**, not the average of per-zone spreads. An even stalls area with a balcony 12 dB below is not a well-covered room, even if each zone taken alone is.'
        }
      }
    ]
  },
  {
    titre: { fr: '3. Poser les enceintes', en: '3. Place the loudspeakers' },
    intro: {
      fr: 'Un placement se juge à l’œil et se corrige au doigt. La carte se recalcule à chaque geste.',
      en: 'A placement is judged by eye and corrected by hand. The map recalculates with every move.'
    },
    etapes: [
      {
        titre: { fr: 'Poser, orienter, régler', en: 'Place, aim, adjust' },
        texte: {
          fr: 'Clic pour poser, glisser pour déplacer. Un second point donne la visée : c’est lui qui définit l’axe. Puis la hauteur d’accrochage, le gain et le retard.',
          en: 'Click to place, drag to move. A second point sets the aim: that is what defines the axis. Then the trim height, the gain and the delay.'
        },
        piege: {
          fr: 'Vue du dessus, une enceinte accrochée à 4 m qui vise le fond ressemble exactement à une enceinte posée à 1 m qui vise ses pieds : c’est la même flèche. **Un piqué se juge de profil** — ouvrez la vue en coupe.',
          en: 'Seen from above, a box flown at 4 m aiming at the back looks exactly like one at 1 m aiming at its feet: it is the same arrow. **A downtilt is judged from the side** — open the section view.'
        }
      },
      {
        titre: { fr: 'Aligner les rappels', en: 'Align the delays' },
        texte: {
          fr: 'Onglet Retards. Acustika calcule ce qu’il faut appliquer pour qu’un rappel arrive **après** la façade, marge de localisation comprise.',
          en: 'Delays tab. Acustika computes what to apply so a fill arrives **after** the main system, localisation margin included.'
        },
        piege: {
          fr: 'La marge n’est pas décorative : l’oreille localise la source qui arrive en premier. Sans elle, l’auditeur entend le renfort et non la scène — exactement ce qu’on cherche à éviter en posant un rappel.',
          en: 'The margin is not decorative: the ear localises whichever source arrives first. Without it the listener hears the fill and not the stage — precisely what a fill is meant to avoid.'
        }
      }
    ]
  },
  {
    titre: { fr: '4. Décrire la salle, et non seulement le vide', en: '4. Describe the room, not just empty space' },
    intro: {
      fr: 'L’étape que tout le monde saute, et celle qui change le plus les résultats. Sans elle, la même carte sort pour une église et pour un studio traité.',
      en: 'The step everyone skips, and the one that changes results the most. Without it, the same map comes out for a church and for a treated studio.'
    },
    etapes: [
      {
        titre: { fr: 'Matériaux, hauteur, public', en: 'Materials, height, audience' },
        texte: {
          fr: 'Panneau La salle. Cochez « tenir compte de la salle », saisissez la hauteur sous plafond, les matériaux du sol, du plafond et des murs, et le nombre de spectateurs assis.',
          en: 'The room panel. Tick "account for the room", enter the ceiling height, the materials of floor, ceiling and walls, and the number of seated listeners.'
        },
        piege: {
          fr: 'Le public absorbe, et beaucoup : une salle pleine peut avoir deux fois l’absorption de la même salle vide. C’est la première raison pour laquelle une balance faite à vide ne ressemble pas au résultat en représentation.',
          en: 'The audience absorbs, and a lot: a full room can have twice the absorption of the same room empty. That is the main reason a soundcheck in an empty room does not match the show.'
        }
      },
      {
        titre: { fr: 'Lire la distance critique', en: 'Read the critical distance' },
        texte: {
          fr: 'C’est le chiffre le plus utile de tout le panneau. Au-delà, le champ réverbéré domine le direct : monter le niveau n’améliore plus l’intelligibilité, il faut rapprocher une source ou traiter la salle.',
          en: 'This is the most useful figure in the whole panel. Beyond it the reverberant field dominates the direct one: raising the level no longer improves intelligibility, you must bring a source closer or treat the room.'
        },
        piege: {
          fr: 'Dès que la salle est prise en compte, **l’écart de niveau devient trompeur**. Le champ réverbéré est uniforme : il aplatit les écarts. Une salle à 3,5 s de réverbération affiche un écart d’un décibel — ce qui ressemble à une couverture parfaite — avec près de la totalité du public au-delà de la distance critique. Fiez-vous à la part du public hors distance critique, pas à l’écart.',
          en: 'As soon as the room is accounted for, **the level spread becomes misleading**. The reverberant field is uniform: it flattens the spread. A room with 3.5 s reverberation shows a one-decibel spread — which looks like perfect coverage — with nearly the whole audience beyond the critical distance. Trust the share of the audience past the critical distance, not the spread.'
        }
      }
    ]
  },
  {
    titre: { fr: '5. Demander conseil, et savoir ce qu’il vaut', en: '5. Ask for advice, and know what it is worth' },
    intro: {
      fr: 'Acustika propose un placement et explique pourquoi. C’est ce qui la distingue — et c’est aussi ce qu’il faut lire avec le plus de prudence.',
      en: 'Acustika suggests a placement and explains why. That is what sets it apart — and it is also what needs reading most carefully.'
    },
    etapes: [
      {
        titre: { fr: 'Lancer la recherche', en: 'Run the search' },
        texte: {
          fr: 'Bouton Chercher un meilleur placement. L’application essaie plusieurs centaines de hauteurs, écartements et visées, et retient celle dont la couverture calculée est la plus régulière. Elle dit ensuite ce que chaque réglage apporte à lui seul.',
          en: 'Look for a better placement button. The application tries several hundred heights, spacings and aims, and keeps the one whose calculated coverage is most even. It then says what each adjustment contributes on its own.'
        },
        piege: {
          fr: 'Le conseil raisonne sur le **champ direct seul**, même quand la salle est décrite. C’est délibéré : le champ réverbéré aplatissant les écarts, un conseil qui l’inclurait préférerait la cathédrale au studio, avec l’air d’avoir raison. Ce qu’un placement contrôle, c’est le direct.',
          en: 'The advice reasons on the **direct field alone**, even when the room is described. This is deliberate: since the reverberant field flattens spreads, advice including it would prefer the cathedral to the studio, and look right doing so. What a placement controls is the direct field.'
        }
      },
      {
        titre: { fr: 'Ce que la carte ne prouve pas', en: 'What the map does not prove' },
        texte: {
          fr: 'Acustika calcule un champ direct et un champ diffus statistique. Elle ignore les réflexions individuelles, la diffusion et le déphasage entre sources.',
          en: 'Acustika computes a direct field and a statistical diffuse field. It ignores individual reflections, diffusion and phase interaction between sources.'
        },
        piege: {
          fr: 'Elle ne voit pas un écho de fond de salle, qui peut détruire l’intelligibilité sans changer ni le RT60 ni la distance critique. Le STI affiché est une estimation par la formule de Peutz, pas le calcul par réponse impulsionnelle d’EASE. Le conseil reste une proposition : la salle réelle ne ressemble jamais au modèle, et cela ne se corrige pas en ajoutant des décimales.',
          en: 'It cannot see a back-wall echo, which can destroy intelligibility without changing either RT60 or the critical distance. The STI shown is an estimate from the Peutz formula, not the impulse-response calculation EASE performs. The advice stays a proposal: the real room never matches the model, and no amount of decimal places fixes that.'
        }
      }
    ]
  }
]

/** Ce qu'on retient, en tête du guide. */
export const RESUME_GUIDE = {
  fr: 'Bibliothèque, salle dessinée, enceintes posées, salle décrite, puis conseil. Cet ordre-là, et pas un autre : c’est celui dans lequel l’application ne refuse rien — et où les chiffres veulent dire quelque chose.',
  en: 'Library, room drawn, loudspeakers placed, room described, then advice. That order and no other: it is the one in which the application refuses nothing — and in which the numbers mean something.'
}
