/**
 * Traductions de l'application.
 *
 * **Repris tel quel d'Ohmnia et de Scenika**, délibérément : trois mécanismes
 * de traduction différents dans la même maison, ce serait trois façons
 * d'oublier une chaîne.
 *
 * Fonctionnement : `t('cle')` renvoie le texte dans la langue courante, en
 * remplaçant `{nom}` par `valeurs.nom`. `npm run typecheck` rejette une clé
 * inconnue.
 *
 * **Le repli ne va que de l'anglais vers le français**, jamais l'inverse : une
 * clé sans anglais reste lisible, et une clé sans français est un oubli que la
 * suite `tests/traductions.mjs` signale au lieu de le masquer.
 */

export type Langue = 'fr' | 'en'

type Traduction = { fr: string; en: string }

const TEXTES = {
  // --- Cadre de l'application ---
  'app.projetNonEnregistre': { fr: 'Projet non enregistré', en: 'Unsaved project' },
  'app.plan': { fr: 'Plan', en: 'Plan' },
  'app.bibliotheque': { fr: 'Bibliothèque', en: 'Library' },
  'app.nouveau': { fr: 'Nouveau', en: 'New' },
  'app.ouvrir': { fr: 'Ouvrir…', en: 'Open…' },
  'app.enregistrer': { fr: 'Enregistrer', en: 'Save' },
  'app.enregistrerSous': { fr: 'Enregistrer sous…', en: 'Save as…' },
  'app.enregistre': { fr: 'Enregistré : {nom}', en: 'Saved: {nom}' },
  'app.abandonner': {
    fr: 'Le projet en cours a des modifications non enregistrées. Continuer ?',
    en: 'The current project has unsaved changes. Continue?'
  },

  // --- Actions communes ---
  'action.annuler': { fr: 'Annuler', en: 'Cancel' },
  'action.supprimer': { fr: 'Supprimer', en: 'Delete' },
  'action.modifier': { fr: 'Modifier', en: 'Edit' },
  'action.enregistrer': { fr: 'Enregistrer', en: 'Save' },

  // --- Plan ---
  'plan.deplacer': { fr: 'Déplacer', en: 'Move' },
  'plan.dessinerZone': { fr: 'Dessiner une zone', en: 'Draw a zone' },
  'plan.poserEnceinte': { fr: 'Poser une enceinte', en: 'Place a loudspeaker' },
  'plan.fermerZone': { fr: 'Fermer la zone ({points} pts)', en: 'Close the zone ({points} pts)' },
  'plan.couverture': { fr: 'Couverture', en: 'Coverage' },
  'plan.ecartSalle': { fr: 'écart sur toute la salle', en: 'spread across the whole room' },
  'plan.ecartExplication': {
    fr: "C'est le chiffre qui compte : une salle bien couverte n'est pas une salle forte, c'est une salle où tout le monde entend la même chose.",
    en: 'This is the number that matters: a well-covered room is not a loud room, it is a room where everyone hears the same thing.'
  },
  'plan.zone': { fr: 'Zone', en: 'Zone' },
  'plan.zoneNumerotee': { fr: 'Zone {numero}', en: 'Zone {numero}' },
  'plan.moyenne': { fr: 'Moy.', en: 'Mean' },
  'plan.ecart': { fr: 'Écart', en: 'Spread' },
  'plan.riendAfficher': {
    fr: 'Dessinez une zone et posez une enceinte : la couverture apparaîtra ici.',
    en: 'Draw a zone and place a loudspeaker: the coverage will appear here.'
  },
  'plan.enceinteChoisie': { fr: 'Enceinte choisie', en: 'Selected loudspeaker' },
  'plan.hauteur': { fr: 'Hauteur (m)', en: 'Height (m)' },
  'plan.gain': { fr: 'Gain (dB)', en: 'Gain (dB)' },
  'plan.retirerEnceinte': { fr: 'Retirer cette enceinte', en: 'Remove this loudspeaker' },
  'plan.zones': { fr: 'Zones', en: 'Zones' },
  'plan.pente': { fr: 'Pente (%)', en: 'Rake (%)' },
  'plan.choisirEnceinte': {
    fr: "Choisissez d'abord une enceinte dans la bibliothèque.",
    en: 'Choose a loudspeaker from the library first.'
  },
  'plan.zoneTroisPoints': {
    fr: 'Une zone demande au moins trois points.',
    en: 'A zone needs at least three points.'
  },

  // --- Conseil de placement ---
  'conseil.titre': { fr: 'Conseil de placement', en: 'Placement advice' },
  'conseil.chercher': { fr: 'Chercher un meilleur placement', en: 'Look for a better placement' },
  'conseil.enCours': { fr: 'Recherche en cours…', en: 'Searching…' },
  'conseil.essais': {
    fr: '{essais} placements essayés',
    en: '{essais} placements tried'
  },
  'conseil.rienDeMieux': {
    fr: 'Le placement actuel est déjà le meilleur des {essais} essayés. Rien à changer.',
    en: 'The current placement is already the best of the {essais} tried. Nothing to change.'
  },
  'conseil.gain': {
    fr: 'L’écart tomberait de {avant} dB à {apres} dB.',
    en: 'The spread would fall from {avant} dB to {apres} dB.'
  },
  'conseil.pourquoi': { fr: 'Pourquoi', en: 'Why' },
  'conseil.effetHauteur': {
    fr: 'Monter les enceintes de {depuis} m à {vers} m',
    en: 'Raising the loudspeakers from {depuis} m to {vers} m'
  },
  'conseil.effetHauteurBaisse': {
    fr: 'Descendre les enceintes de {depuis} m à {vers} m',
    en: 'Lowering the loudspeakers from {depuis} m to {vers} m'
  },
  'conseil.effetEcartement': {
    fr: 'Écarter les enceintes de {depuis} m à {vers} m',
    en: 'Widening the spacing from {depuis} m to {vers} m'
  },
  'conseil.effetEcartementResserre': {
    fr: 'Resserrer les enceintes de {depuis} m à {vers} m',
    en: 'Narrowing the spacing from {depuis} m to {vers} m'
  },
  'conseil.effetVisee': {
    fr: 'Viser plus loin, à {vers} m au lieu de {depuis} m',
    en: 'Aiming further, at {vers} m instead of {depuis} m'
  },
  'conseil.effetViseeProche': {
    fr: 'Viser plus près, à {vers} m au lieu de {depuis} m',
    en: 'Aiming closer, at {vers} m instead of {depuis} m'
  },
  'conseil.apporte': { fr: 'à soi seul : {gain} dB', en: 'on its own: {gain} dB' },
  'conseil.appliquer': { fr: 'Appliquer ce placement', en: 'Apply this placement' },
  'conseil.reserve': {
    fr: 'Une proposition, jamais une certitude : la salle réelle ne ressemble jamais au modèle. Ni murs, ni public, ni mobilier ne sont calculés.',
    en: 'A proposal, never a certainty: the real room never looks like the model. Walls, audience and furniture are not computed.'
  },
  'conseil.critere': {
    fr: 'Le critère est l’écart de niveau sur toute la salle : une salle bien couverte n’est pas une salle forte, c’est une salle où tout le monde entend la même chose.',
    en: 'The criterion is the level spread across the whole room: a well-covered room is not a loud room, it is a room where everyone hears the same thing.'
  },

  // --- Échelle et lecture sous le curseur ---
  'echelle.titre': { fr: 'Échelle', en: 'Scale' },
  'echelle.relatif': {
    fr: 'Les couleurs sont relatives au point le plus fort de la salle : {haut} dB.',
    en: 'Colours are relative to the loudest point in the room: {haut} dB.'
  },
  'curseur.niveau': { fr: '{niveau} dB à ({x} m, {y} m)', en: '{niveau} dB at ({x} m, {y} m)' },
  'curseur.horsZone': {
    fr: 'Hors des zones d’écoute — rien n’est calculé là.',
    en: 'Outside the listening zones — nothing is computed there.'
  },

  // --- Vue en coupe ---
  'coupe.titre': { fr: 'Vue en coupe', en: 'Section view' },
  'coupe.montrer': { fr: 'Voir de profil', en: 'View from the side' },
  'coupe.cacher': { fr: 'Masquer la coupe', en: 'Hide the section' },
  'coupe.explication': {
    fr: 'Un piqué se juge de profil. Vue du dessus, une enceinte accrochée à 4 m qui vise le fond ressemble exactement à une enceinte posée à 1 m qui vise ses pieds : c’est la même flèche.',
    en: 'A downtilt is judged from the side. Seen from above, a loudspeaker flown at 4 m aiming at the back looks exactly like one at 1 m aiming at its feet: it is the same arrow.'
  },
  'coupe.abscisse': { fr: 'Coupe à x = {x} m', en: 'Section at x = {x} m' },
  'coupe.pique': { fr: '{nom} — piqué {angle}°', en: '{nom} — downtilt {angle}°' },
  'coupe.releve': { fr: '{nom} — relevé de {angle}°', en: '{nom} — tilted up {angle}°' },
  'coupe.sol': { fr: 'sol', en: 'floor' },
  'coupe.oreilles': { fr: 'oreilles', en: 'ears' },

  // --- Retards d'alignement ---
  'retard.titre': { fr: 'Retards d’alignement', en: 'Alignment delays' },
  'retard.calculer': { fr: 'Aligner les rappels', en: 'Align the fills' },
  'retard.explication': {
    fr: 'La première enceinte sert de façade. Les autres attendent le son qu’elle met à les atteindre, plus {marge} ms : c’est cette marge qui garde la localisation sur la scène.',
    en: 'The first loudspeaker is the main system. The others wait for the sound to reach them, plus {marge} ms: that margin is what keeps the localisation on stage.'
  },
  'retard.facade': { fr: 'façade', en: 'main' },
  'retard.ligne': {
    fr: '{nom} — {distance} m de la façade → {retard} ms',
    en: '{nom} — {distance} m from the main → {retard} ms'
  },
  'retard.applique': { fr: 'Retards appliqués.', en: 'Delays applied.' },
  'retard.reserve': {
    fr: 'Un alignement parfait partout n’existe pas : un spectateur placé entre la façade et le rappel entendra autre chose. C’est une contrainte physique, pas une limite de l’outil.',
    en: 'A perfect alignment everywhere does not exist: a listener standing between the main and the fill will hear something else. That is physics, not a limit of the tool.'
  },

  // --- Bibliothèque ---
  'biblio.nouvelle': { fr: '+ Nouvelle enceinte', en: '+ New loudspeaker' },
  'biblio.importerCsv': { fr: 'Importer un CSV…', en: 'Import a CSV…' },
  'biblio.titreNouvelle': { fr: 'Nouvelle enceinte', en: 'New loudspeaker' },
  'biblio.avertissementFort': {
    fr: 'Les enceintes livrées sont des gabarits génériques',
    en: 'The loudspeakers shipped are generic templates'
  },
  'biblio.avertissementSuite': {
    fr: ", pas des modèles du commerce. Corrigez le niveau et les ouvertures avec la fiche technique réelle : une directivité inventée donne un placement faux avec l'air d'être sûr. Le format ouvert visé est le ",
    en: ', not products off the shelf. Correct the level and the coverage angles from the real data sheet: an invented directivity gives a wrong placement with the air of being certain. The open format aimed for is '
  },
  'biblio.avertissementFin': {
    fr: ' ; en attendant, le CSV permet la saisie.',
    en: '; in the meantime, CSV allows manual entry.'
  },
  'biblio.nom': { fr: 'Nom', en: 'Name' },
  'biblio.marque': { fr: 'Marque', en: 'Brand' },
  'biblio.niveau1m': { fr: 'Niveau 1 m', en: 'Level at 1 m' },
  'biblio.provenance': { fr: 'Provenance', en: 'Source' },
  'biblio.provenanceDonnees': { fr: 'Provenance des données', en: 'Source of the data' },
  'biblio.ouverture': { fr: 'Ouverture à −6 dB, par bande', en: 'Coverage at −6 dB, per band' },
  'biblio.vide': { fr: 'La bibliothèque est vide.', en: 'The library is empty.' },
  'biblio.importees': {
    fr: '{nombre} enceinte(s) importée(s).',
    en: '{nombre} loudspeaker(s) imported.'
  },

  // --- Refus du processus principal ---
  // Il ne renvoie qu'une clé : il ne sait pas quelle langue la fenêtre affiche.
  'erreur.nomVide': { fr: 'Le nom est obligatoire.', en: 'A name is required.' },
  'erreur.niveauNonNombre': {
    fr: 'Le niveau à 1 m doit être un nombre.',
    en: 'The level at 1 m must be a number.'
  },
  'erreur.niveauHorsLimites': {
    fr: 'Le niveau à 1 m doit être compris entre 60 et 150 dB.',
    en: 'The level at 1 m must be between 60 and 150 dB.'
  },
  'erreur.projetVide': {
    fr: "Ce fichier ne contient ni zones ni enceintes : ce n'est pas un projet Acustika.",
    en: 'This file contains neither zones nor loudspeakers: it is not an Acustika project.'
  },
  'erreur.ligne': { fr: 'Ligne {ligne} : {detail}', en: 'Line {ligne}: {detail}' },
  'erreur.projetIllisible': {
    fr: "Ce fichier est illisible : il n'est pas au format d'un projet Acustika.",
    en: 'This file cannot be read: it is not in the Acustika project format.'
  },

  // --- Paramètres ---
  'param.langue': { fr: 'Langue', en: 'Language' }
} satisfies Record<string, Traduction>

export type CleTraduction = keyof typeof TEXTES

let langueCourante: Langue = 'fr'

export function definirLangue(langue: Langue): void {
  langueCourante = langue
}

export function langue(): Langue {
  return langueCourante
}

/** Traduit une clé, en remplaçant `{nom}` par `valeurs.nom`. */
export function t(cle: CleTraduction, valeurs?: Record<string, string | number>): string {
  const entree = TEXTES[cle]
  if (!entree) return cle
  const texte = langueCourante === 'en' ? entree.en || entree.fr : entree.fr
  if (!valeurs) return texte
  return texte.replace(/\{(\w+)\}/g, (entier, nom) =>
    nom in valeurs ? String(valeurs[nom]) : entier
  )
}

/**
 * Traduit une erreur remontée par le processus principal.
 *
 * Il n'envoie qu'une clé — il ne sait pas quelle langue cette fenêtre affiche.
 * Une clé sans traduction s'affiche telle quelle, en toutes lettres : c'est
 * laid, donc remarqué, donc corrigé. Un message français figé passerait
 * inaperçu à l'inverse.
 */
export function traduireErreur(brut: string): string {
  let cle = brut
  let valeurs: Record<string, string | number> | undefined

  // Quand le message cite une valeur — le numéro d'une ligne de CSV, par
  // exemple — la clé et la valeur voyagent ensemble en JSON.
  if (brut.startsWith('{')) {
    try {
      const decode = JSON.parse(brut) as { cle: string; detail?: string } & Record<string, string>
      cle = decode.cle
      valeurs = decode.detail
        ? { ...decode, detail: traduireErreur(decode.detail) }
        : decode
    } catch {
      // Ce n'était pas du JSON : on affichera le texte brut.
    }
  }

  const complete = `erreur.${cle}` as CleTraduction
  const traduit = t(complete, valeurs)
  return traduit === complete ? brut : traduit
}

export const LANGUES: { code: Langue; nom: string }[] = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' }
]
