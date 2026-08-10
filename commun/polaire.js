/**
 * Lecture de données polaires, et l'ouverture qui s'en déduit.
 *
 * **Ce qu'Acustika utilise, c'est l'ouverture à −6 dB par bande.** Une fiche
 * technique, elle, donne un tableau : des angles en lignes ou en colonnes, et
 * l'atténuation relevée à chacun. Ce module fait le pont entre les deux — et
 * c'est un vrai calcul, pas une recopie.
 *
 * **Pourquoi pas le format CLF directement.** CLF est un format binaire dont la
 * structure n'est pas publique. Écrire un lecteur en devinant produirait des
 * directivités fausses, qui alimenteraient la carte de couverture **et le
 * conseil de placement** : on obtiendrait des placements faux avec l'aplomb des
 * vrais. C'est exactement ce que ce projet s'interdit. Un fichier binaire est
 * donc **reconnu et refusé avec un message qui dit quoi faire**, plutôt que lu
 * de travers.
 *
 * Ce que ce module lit : le texte que produisent les visualiseurs et les fiches
 * techniques — colonnes séparées par des virgules, des points-virgules, des
 * tabulations ou des espaces.
 */

/**
 * @typedef {object} MesurePolaire
 * @property {number} bande Fréquence centrale de la bande, en hertz.
 * @property {{ angle: number, niveauRelatif: number }[]} points
 */

/**
 * @typedef {object} LecturePolaire
 * @property {Record<number, number>} ouverture Ouverture à −6 dB, par bande.
 * @property {MesurePolaire[]} mesures Ce qui a été lu, tel quel.
 * @property {string[]} avertissements Ce qui n'a pas pu être déduit.
 */

/** Le seuil qui définit l'ouverture. −6 dB est la convention du métier. */
export const SEUIL_OUVERTURE_DB = -6

/**
 * Reconnaît un fichier binaire.
 *
 * Un `.cf1` ou un `.cf2` lu comme du texte donnerait des nombres au hasard.
 * Mieux vaut le dire tout de suite : un octet nul ne se trouve jamais dans un
 * export texte, et suffit à trancher.
 *
 * @param {string} contenu
 * @returns {boolean}
 */
export function ressembleAUnBinaire(contenu) {
  const debut = contenu.slice(0, 2000)
  // L'octet nul, ecrit explicitement : glisse tel quel dans le code il
  // serait invisible a la relecture, et personne ne pourrait verifier
  // qu'il est bien la ni au bon endroit.
  const OCTET_NUL = String.fromCharCode(0)
  if (debut.includes(OCTET_NUL)) return true

  // Une proportion notable de caractères de contrôle trahit aussi un binaire.
  const controles = [...debut].filter((caractere) => {
    const code = caractere.charCodeAt(0)
    return code < 9 || (code > 13 && code < 32)
  }).length
  return controles > debut.length * 0.02
}

/** Découpe une ligne quel que soit le séparateur employé. */
function colonnes(ligne) {
  return ligne
    .trim()
    .split(/[;,\t]|\s{2,}|\s+/)
    .map((c) => c.trim())
    .filter((c) => c !== '')
}

/** Un nombre, en acceptant la virgule décimale des fiches françaises. */
function nombre(texte) {
  if (texte === undefined || texte === null) return null
  const valeur = Number(
    String(texte)
      .replace(',', '.')
      .replace('°', '')
      .replace(/dB/i, '')
      .replace(/Hz/i, '')
  )
  return Number.isFinite(valeur) ? valeur : null
}

/**
 * L'angle où le niveau descend de 6 dB, par interpolation entre deux mesures.
 *
 * **On interpole plutôt que de retenir la mesure la plus proche.** Une fiche
 * donne souvent des relevés tous les 10° : arrondir ferait varier l'ouverture
 * par bonds de 20°, ce qui déplacerait le conseil de placement pour une raison
 * qui n'existe pas.
 *
 * @param {{ angle: number, niveauRelatif: number }[]} points
 * @returns {number|null} L'ouverture totale, ou `null` si on ne peut pas conclure.
 */
export function ouvertureDepuisPoints(points) {
  // Les relevés sont souvent symétriques : on travaille en valeur absolue.
  const tries = points
    .map((p) => ({ angle: Math.abs(p.angle), niveauRelatif: p.niveauRelatif }))
    .sort((a, b) => a.angle - b.angle)

  if (tries.length < 2) return null

  // Le niveau dans l'axe sert de référence, même si la fiche ne l'a pas ramené
  // à zéro : certaines donnent des niveaux absolus.
  const reference = tries[0].niveauRelatif
  const relatifs = tries.map((p) => ({ ...p, niveauRelatif: p.niveauRelatif - reference }))

  for (let i = 1; i < relatifs.length; i += 1) {
    const avant = relatifs[i - 1]
    const apres = relatifs[i]
    if (apres.niveauRelatif > SEUIL_OUVERTURE_DB) continue

    // Le seuil est franchi entre `avant` et `apres` : on interpole.
    const ecart = avant.niveauRelatif - apres.niveauRelatif
    const part = ecart === 0 ? 0 : (avant.niveauRelatif - SEUIL_OUVERTURE_DB) / ecart
    const demiOuverture = avant.angle + (apres.angle - avant.angle) * part
    return Math.round(demiOuverture * 2 * 10) / 10
  }

  // Le niveau ne descend jamais de 6 dB dans les angles fournis : on ne peut
  // rien conclure, et inventer une ouverture serait pire que de le dire.
  return null
}

/**
 * Lit un tableau de données polaires.
 *
 * Deux dispositions sont acceptées, et elles sont reconnues toutes seules : les
 * angles en colonnes et les bandes en lignes, ou l'inverse. Demander à
 * l'utilisateur de retourner son tableau avant de l'importer, c'est le renvoyer
 * à un tableur — et il ne reviendra pas.
 *
 * @param {string} contenu
 * @returns {LecturePolaire}
 */
export function lireDonneesPolaires(contenu) {
  if (ressembleAUnBinaire(contenu)) {
    throw new Error(
      'Ce fichier est binaire, pas du texte. Les formats CLF (.cf1, .cf2) ne ' +
        'sont pas lus : leur structure n’est pas publique, et un lecteur qui ' +
        'devinerait produirait des directivités fausses. Exportez les données ' +
        'polaires en texte depuis votre visualiseur, ou saisissez-les à la main.'
    )
  }

  const lignes = contenu
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))

  if (lignes.length < 2) {
    throw new Error('Ce fichier ne contient pas de tableau : il faut au moins deux lignes.')
  }

  // La première case d'un tableau est souvent un libellé — « Angle », « Hz »,
  // « Frequency ». On la met de côté avant de lire des nombres.
  const entete = colonnes(lignes[0])
  const enteteNombres = entete.slice(1).map(nombre)
  if (enteteNombres.length === 0 || enteteNombres.some((v) => v === null)) {
    throw new Error(
      'La première ligne doit donner des nombres : soit des angles, soit des fréquences.'
    )
  }

  const corps = lignes.slice(1).map((ligne) => {
    const cases = colonnes(ligne)
    return { premiere: nombre(cases[0]), valeurs: cases.slice(1).map(nombre) }
  })

  // Les angles ne dépassent pas 180 ; les fréquences audibles montent bien
  // au-delà. C'est ce qui permet de reconnaître la disposition sans rien
  // demander à l'utilisateur.
  const anglesEnColonnes = enteteNombres.every((v) => Math.abs(v) <= 180)

  /** @type {MesurePolaire[]} */
  const mesures = []

  if (anglesEnColonnes) {
    for (const ligne of corps) {
      if (ligne.premiere === null) continue
      const points = []
      enteteNombres.forEach((angle, index) => {
        const niveau = ligne.valeurs[index]
        if (niveau !== null && niveau !== undefined) points.push({ angle, niveauRelatif: niveau })
      })
      if (points.length > 0) mesures.push({ bande: ligne.premiere, points })
    }
  } else {
    for (const [index, bande] of enteteNombres.entries()) {
      const points = []
      for (const ligne of corps) {
        if (ligne.premiere === null) continue
        const niveau = ligne.valeurs[index]
        if (niveau !== null && niveau !== undefined) {
          points.push({ angle: ligne.premiere, niveauRelatif: niveau })
        }
      }
      if (points.length > 0) mesures.push({ bande, points })
    }
  }

  if (mesures.length === 0) {
    throw new Error('Aucune mesure lisible dans ce fichier.')
  }

  /** @type {Record<number, number>} */
  const ouverture = {}
  const avertissements = []

  for (const mesure of mesures) {
    const angle = ouvertureDepuisPoints(mesure.points)
    if (angle === null) {
      avertissements.push(
        `${mesure.bande} Hz : le niveau ne descend jamais de 6 dB dans les angles fournis — ouverture non déduite.`
      )
      continue
    }
    ouverture[mesure.bande] = angle
  }

  return { ouverture, mesures, avertissements }
}
