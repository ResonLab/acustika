/**
 * Conditions d'utilisation d'Acustika.
 *
 * **À incrémenter à chaque modification du texte** : l'écran d'acceptation
 * réapparaît alors, et l'utilisateur relit ce qu'il accepte. Sans ce numéro, on
 * changerait les conditions dans le dos de quelqu'un qui les a déjà acceptées.
 *
 * Le texte est ici, dans les deux langues, et **nulle part ailleurs** :
 * `tests/coherence-conditions.mjs` compare la page publique à ce fichier, et
 * `npm run verifier` échoue si l'un des deux bouge sans l'autre. Deux versions
 * d'un même engagement qui divergent, c'est pire que pas d'engagement.
 *
 * **Le risque couvert ici n'est pas électrique, comme dans Scenika, mais celui
 * du conseil.** Acustika ne se contente pas d'afficher une carte : elle propose
 * un placement. Une carte de couleurs est très convaincante même quand elle est
 * fausse, et c'est encore plus vrai d'un placement recommandé avec une
 * explication qui a l'air de tenir debout.
 *
 * Ce qu'Acustika ajoute aux conditions générales de la maison :
 * <https://resonlab.github.io/conditions.html>
 */

export const VERSION_CONDITIONS = '1.0'

/** La page publique, ouverte par le bouton « Lire sur le site ». */
export const URL_CONDITIONS = 'https://resonlab.github.io/acustika/conditions.html'
export const URL_CONDITIONS_EN = 'https://resonlab.github.io/acustika/en/terms.html'

export interface SectionConditions {
  titre: { fr: string; en: string }
  paragraphes: { fr: string; en: string }[]
}

export const CONDITIONS_UTILISATION: SectionConditions[] = [
  {
    titre: { fr: "1. Ce qu'est Acustika", en: '1. What Acustika is' },
    paragraphes: [
      {
        fr: "Acustika simule la couverture sonore d'une salle : vous décrivez une salle et des enceintes, l'application calcule et affiche la pression sonore, une vue en coupe, des retards d'alignement, et propose des placements.",
        en: 'Acustika simulates the sound coverage of a room: you describe a room and loudspeakers, the application calculates and displays sound pressure, a section view, alignment delays, and suggests placements.'
      },
      {
        fr: "Vos données restent sur votre machine. Un projet est un fichier que vous ouvrez, enregistrez et transmettez vous-même ; rien n'en sort.",
        en: 'Your data stays on your machine. A project is a file you open, save and share yourself; nothing leaves it.'
      }
    ]
  },
  {
    titre: {
      fr: "2. Ni le calcul ni le conseil ne remplacent une étude acoustique",
      en: '2. Neither the calculation nor the advice replace an acoustic study'
    },
    paragraphes: [
      {
        fr: "C'est le point le plus important de ce document. Acustika calcule un champ direct : elle ignore les réflexions, la réverbération et le déphasage entre sources. Elle additionne les niveaux en énergie, en supposant des sources décorrélées — deux sources cohérentes peuvent en réalité s'ajouter jusqu'à +6 dB ou s'annuler.",
        en: 'This is the most important point in this document. Acustika calculates a direct field: it ignores reflections, reverberation and phase interaction between sources. It adds levels in energy, assuming uncorrelated sources — two coherent sources can in reality add up to +6 dB or cancel out.'
      },
      {
        fr: "Une carte de couverture en couleurs est très convaincante, même quand elle est fausse. Le conseil de placement essaie plusieurs positions et retient celle dont la couverture calculée est la plus régulière selon un critère explicite — ce n'est pas une certitude, c'est une proposition fondée sur un modèle simplifié.",
        en: 'A colour coverage map is very convincing, even when it is wrong. The placement advice tries several positions and keeps the one whose calculated coverage is most even according to an explicit criterion — it is not a certainty, it is a proposal based on a simplified model.'
      },
      {
        fr: "La salle réelle ne ressemble jamais exactement au modèle : matériaux, public, mobilier, formes non rectangulaires, réflexions sur les parois. Le conseil ne tient compte d'aucun de ces éléments.",
        en: 'The real room never exactly matches the model: materials, audience, furniture, non-rectangular shapes, reflections off the walls. The advice takes none of these into account.'
      },
      {
        fr: "Un placement mal évalué peut donner une couverture inégale, un système mal aligné dans le temps, ou une fausse impression de résultat. Le dimensionnement et la validation d'une installation en salle relèvent d'une personne qualifiée, et la responsabilité de votre installation reste entièrement la vôtre.",
        en: 'A poorly evaluated placement can result in uneven coverage, a system misaligned in time, or a false sense of the outcome. Sizing and validating an installation in a room is the work of a qualified person, and responsibility for your installation remains entirely yours.'
      }
    ]
  },
  {
    titre: {
      fr: "3. Les retards d'alignement sont une base de départ",
      en: '3. Alignment delays are a starting point'
    },
    paragraphes: [
      {
        fr: "Les retards calculés supposent la vitesse du son dans l'air à la température saisie, et une marge de localisation fixe. Ils ne tiennent pas compte du vent, de l'humidité, ni des variations de température dans le volume de la salle.",
        en: 'The calculated delays assume the speed of sound in air at the entered temperature, and a fixed localisation margin. They do not account for wind, humidity, or temperature variation across the volume of the room.'
      },
      {
        fr: "Vérifiez l'alignement à l'oreille et, si possible, à l'analyseur avant la représentation. Un système mal aligné se juge sur place, jamais dans un tableau de chiffres.",
        en: 'Check the alignment by ear and, where possible, with an analyser before the show. A misaligned system is judged on site, never in a table of numbers.'
      }
    ]
  },
  {
    titre: { fr: '4. Vos données et vos sauvegardes', en: '4. Your data and your backups' },
    paragraphes: [
      {
        fr: "Acustika n'effectue pas de sauvegarde automatique. Un projet vit dans un fichier `.acustika` sur votre machine, que vous seul gérez.",
        en: 'Acustika performs no automatic backup. A project lives in an `.acustika` file on your machine, which only you manage.'
      },
      {
        fr: "Une panne de disque, un vol ou une erreur de manipulation peuvent le détruire. Copiez-le régulièrement ailleurs, et vérifiez de temps en temps que la copie s'ouvre.",
        en: 'A disk failure, a theft or a slip of the hand can destroy it. Copy it elsewhere regularly, and check now and then that the copy opens.'
      }
    ]
  },
  {
    titre: { fr: '5. Absence de garantie', en: '5. No warranty' },
    paragraphes: [
      {
        fr: "Acustika est fournie telle quelle, sans garantie de fonctionnement ininterrompu ni d'absence d'erreur. Un logiciel peut contenir des défauts, y compris dans des calculs ou dans le conseil de placement.",
        en: 'Acustika is provided as is, with no warranty of uninterrupted operation or freedom from error. Software can contain defects, including in calculations or in the placement advice.'
      },
      {
        fr: "Ne vous reposez pas aveuglément sur une carte affichée, sur un placement proposé, ni sur un retard calculé.",
        en: 'Do not rely blindly on a displayed map, on a proposed placement, or on a calculated delay.'
      }
    ]
  },
  {
    titre: { fr: '6. Limitation de responsabilité', en: '6. Limitation of liability' },
    paragraphes: [
      {
        fr: "Dans les limites permises par la loi, l'éditeur ne répond pas des dommages découlant de l'utilisation d'Acustika : perte de données, couverture sonore insuffisante, système mal aligné, dommage matériel ou corporel.",
        en: 'To the extent permitted by law, the publisher is not liable for damages arising from the use of Acustika: loss of data, insufficient sound coverage, a misaligned system, or damage to property or persons.'
      },
      {
        fr: "Cette limitation ne s'applique pas en cas de faute grave ou intentionnelle, ni dans les situations où la loi impose une responsabilité qui ne peut être écartée. Selon votre pays, certaines de ces exclusions peuvent être sans effet à votre égard.",
        en: 'This limitation does not apply in cases of gross negligence or intent, nor where the law imposes liability that cannot be excluded. Depending on your country, some of these exclusions may have no effect on you.'
      }
    ]
  },
  {
    titre: { fr: '7. Acceptation', en: '7. Acceptance' },
    paragraphes: [
      {
        fr: "En utilisant Acustika, vous reconnaissez avoir lu ces conditions et accepté que la validation acoustique de votre installation relève de votre seule responsabilité.",
        en: 'By using Acustika you acknowledge that you have read these terms and accepted that the acoustic validation of your installation is your responsibility alone.'
      },
      {
        fr: "Si vous n'acceptez pas ces conditions, n'utilisez pas l'application.",
        en: 'If you do not accept these terms, do not use the application.'
      }
    ]
  }
]

/** Ce qu'on retient, affiché en pied de l'écran d'acceptation. */
export const RESUME_CONDITIONS = {
  fr: "En résumé : vos données restent chez vous, et la carte comme le conseil de placement sont des aides à la préparation — jamais un remplacement d'une étude acoustique. La validation en salle relève d'une personne qualifiée.",
  en: 'In short: your data stays with you, and both the map and the placement advice are preparation aids — never a substitute for an acoustic study. Validation in the room is the work of a qualified person.'
}
