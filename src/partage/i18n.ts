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
  'biblio.importerPolaire': {
    fr: 'Importer des données polaires…',
    en: 'Import polar data…'
  },
  'biblio.polaireLu': {
    fr: 'Lu depuis {nom} : {bandes} bande(s). Vérifiez avant d’enregistrer.',
    en: 'Read from {nom}: {bandes} band(s). Check before saving.'
  },
  'biblio.polaireExplication': {
    fr: 'Un tableau texte : les angles en colonnes et les bandes en lignes, ou l’inverse — les deux sont reconnues. L’ouverture à −6 dB est déduite par interpolation entre vos relevés.',
    en: 'A text table: angles in columns and bands in rows, or the other way round — both are recognised. The coverage angle at −6 dB is derived by interpolating between your readings.'
  },
  'biblio.clfNonLu': {
    fr: 'Les fichiers CLF (.cf1, .cf2) ne sont pas lus : leur structure n’est pas publique, et un lecteur qui devinerait produirait des directivités fausses — donc des placements faux avec l’aplomb des vrais. Exportez les données polaires en texte depuis votre visualiseur.',
    en: 'CLF files (.cf1, .cf2) are not read: their structure is not public, and a reader that guessed would produce wrong directivity — hence wrong placements with the confidence of right ones. Export the polar data as text from your viewer.'
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
  // Refus de `commun/formes.js`. Le module rend une clé, pas une phrase : il
  // tourne aussi dans les tests et dans un navigateur, et ne sait pas quelle
  // langue la fenêtre affiche.
  'erreur.formes.dimensionsPositives': {
    fr: 'Les dimensions doivent être supérieures à zéro.',
    en: 'Dimensions must be greater than zero.'
  },
  'erreur.formes.rayonPositif': {
    fr: 'Le rayon doit être supérieur à zéro.',
    en: 'The radius must be greater than zero.'
  },
  'erreur.formes.troisSegments': {
    fr: 'Un arc demande au moins trois segments.',
    en: 'An arc needs at least three segments.'
  },
  'erreur.formes.ferAChevalTropCourt': {
    fr: 'Un fer à cheval doit être plus profond que la moitié de sa largeur : sinon l’arc du fond se replierait sur les côtés droits.',
    en: 'A horseshoe must be deeper than half its width: otherwise the back arc would fold onto the straight sides.'
  },
  'erreur.projetIllisible': {
    fr: "Ce fichier est illisible : il n'est pas au format d'un projet Acustika.",
    en: 'This file cannot be read: it is not in the Acustika project format.'
  },

  // --- Paramètres ---
  'param.langue': { fr: 'Langue', en: 'Language' },

  // --- Formes préfaites ---
  // Dessinée à la souris, une salle rectangulaire n'en est pas une : les côtés
  // ne sont pas parallèles et l'aire est fausse de quelques pour cent.
  'forme.poser': { fr: 'Forme préfaite', en: 'Preset shape' },
  'forme.rectangle': { fr: 'Rectangle', en: 'Rectangle' },
  'forme.carre': { fr: 'Carré', en: 'Square' },
  'forme.cercle': { fr: 'Cercle', en: 'Circle' },
  'forme.demiCercle': { fr: 'Demi-cercle', en: 'Half-circle' },
  'forme.eventail': { fr: 'Éventail', en: 'Fan' },
  'forme.ferACheval': { fr: 'Fer à cheval', en: 'Horseshoe' },
  'forme.largeur': { fr: 'Largeur (m)', en: 'Width (m)' },
  'forme.profondeur': { fr: 'Profondeur (m)', en: 'Depth (m)' },
  'forme.cote': { fr: 'Côté (m)', en: 'Side (m)' },
  'forme.rayon': { fr: 'Rayon (m)', en: 'Radius (m)' },
  'forme.largeurScene': { fr: 'Largeur côté scène (m)', en: 'Width at the stage (m)' },
  'forme.largeurFond': { fr: 'Largeur au fond (m)', en: 'Width at the back (m)' },
  'forme.ajouter': { fr: 'Poser la forme', en: 'Place the shape' },
  'forme.aire': { fr: 'Aire : {aire} m²', en: 'Area: {aire} m²' },
  'forme.explication': {
    fr: 'La forme est posée au centre du plan. Ses sommets restent déplaçables ensuite.',
    en: 'The shape is placed at the centre of the plan. Its vertices stay movable afterwards.'
  },

  // --- La salle : absorption et réverbération ---
  'salle.titre': { fr: 'La salle', en: 'The room' },
  'salle.active': { fr: 'Tenir compte de la salle', en: 'Account for the room' },
  'salle.inactive': {
    fr: 'Le calcul ne porte que sur le champ direct : la carte est la même dans une église et dans un studio traité. Décrivez la salle pour y ajouter la réverbération.',
    en: 'The calculation covers the direct field only: the map is the same in a church and in a treated studio. Describe the room to add reverberation.'
  },
  'salle.hauteur': { fr: 'Hauteur sous plafond (m)', en: 'Ceiling height (m)' },
  'salle.sol': { fr: 'Sol', en: 'Floor' },
  'salle.plafond': { fr: 'Plafond', en: 'Ceiling' },
  'salle.murs': { fr: 'Murs', en: 'Walls' },
  'salle.spectateurs': { fr: 'Spectateurs assis', en: 'Seated audience' },
  'salle.spectateursExplication': {
    fr: 'Le public absorbe : une salle pleine peut avoir deux fois l’absorption de la même salle vide. C’est la première cause d’écart entre une balance faite à vide et le résultat en représentation.',
    en: 'The audience absorbs: a full room can have twice the absorption of the same room empty. That is the main reason a soundcheck in an empty room does not match the show.'
  },
  'salle.volume': { fr: 'Volume : {volume} m³', en: 'Volume: {volume} m³' },
  'salle.aireAbsorption': { fr: 'Absorption : {aire} m² sabine', en: 'Absorption: {aire} m² sabine' },
  'salle.rt60': { fr: 'RT60 : {sabine} s (Sabine) · {eyring} s (Eyring)', en: 'RT60: {sabine} s (Sabine) · {eyring} s (Eyring)' },
  'salle.rt60Explication': {
    fr: 'Eyring est plus juste dès que la salle absorbe beaucoup ; Sabine surestime alors. Les deux sont affichés parce qu’un écart important entre eux signale une salle très absorbante, où le modèle statistique lui-même devient discutable.',
    en: 'Eyring is more accurate once the room absorbs a lot; Sabine then overestimates. Both are shown because a wide gap between them flags a very absorbent room, where the statistical model itself becomes questionable.'
  },
  'salle.distanceCritique': { fr: 'Distance critique : {distance} m', en: 'Critical distance: {distance} m' },
  'salle.distanceCritiqueExplication': {
    fr: 'Au-delà, le champ réverbéré domine le direct : monter le niveau n’améliore plus l’intelligibilité, il faut rapprocher une source. C’est la grandeur qui décide d’un renfort.',
    en: 'Beyond it the reverberant field dominates the direct one: raising the level no longer improves intelligibility, you need a closer source. This is the figure that decides on a fill.'
  },
  'salle.partHorsCritique': {
    fr: '{part} % du public est au-delà de la distance critique.',
    en: '{part}% of the audience is beyond the critical distance.'
  },
  'salle.partHorsCritiqueExplication': {
    fr: 'Pour ces places, la salle s’entend plus que la source. C’est la mesure qui compte ici — pas l’écart de niveau : le champ réverbéré étant uniforme, il aplatit l’écart et une salle très réverbérante affiche une couverture qui paraît parfaite.',
    en: 'For those seats the room is heard more than the source. This is the figure that matters here — not the level spread: the reverberant field is uniform, so it flattens the spread and a very reverberant room shows coverage that looks perfect.'
  },
  'salle.ecartTrompeur': {
    fr: 'La salle est prise en compte : l’écart ci-dessus est aplati par le champ réverbéré et ne mesure plus la qualité du placement. Le conseil, lui, continue de raisonner sur le champ direct — c’est le seul que le placement contrôle.',
    en: 'The room is accounted for: the spread above is flattened by the reverberant field and no longer measures placement quality. The advice still reasons on the direct field — the only one placement controls.'
  },
  'salle.modeleStatistique': {
    fr: 'Modèle statistique en champ diffus (Sabine, Eyring). Il suppose l’énergie réverbérée uniformément répartie — faux près des parois et dans un volume long et étroit. Il ne voit ni écho franc, ni mode propre : ce n’est pas du lancer de rayons.',
    en: 'Statistical diffuse-field model (Sabine, Eyring). It assumes reverberant energy is evenly spread — untrue near surfaces and in long narrow volumes. It sees neither distinct echoes nor room modes: this is not ray tracing.'
  },

  // --- Matériaux ---
  // Valeurs de tables publiées, pas des mesures : un même matériau varie
  // facilement de 30 % d'une source à l'autre selon la pose et le support.
  'materiau.betonBrut': { fr: 'Béton brut', en: 'Bare concrete' },
  'materiau.platre': { fr: 'Plâtre sur maçonnerie', en: 'Plaster on masonry' },
  'materiau.cloisonPlatre': { fr: 'Cloison plaque de plâtre', en: 'Plasterboard partition' },
  'materiau.vitrage': { fr: 'Vitrage', en: 'Glazing' },
  'materiau.parquet': { fr: 'Parquet bois', en: 'Wooden floor' },
  'materiau.moquette': { fr: 'Moquette', en: 'Carpet' },
  'materiau.rideauLourd': { fr: 'Rideau lourd plissé', en: 'Heavy pleated curtain' },
  'materiau.dallesMinerales': { fr: 'Dalles minérales', en: 'Mineral ceiling tiles' },
  'materiau.laine50': { fr: 'Absorbant 50 mm', en: 'Absorber, 50 mm' },
  'materiau.laine100': { fr: 'Absorbant 100 mm', en: 'Absorber, 100 mm' },
  'materiau.siegeVide': { fr: 'Siège rembourré vide', en: 'Empty padded seat' },
  'materiau.publicAssis': { fr: 'Spectateur assis', en: 'Seated listener' },
  'materiau.valeursIndicatives': {
    fr: 'Valeurs de tables publiées, pas des mesures. Un même matériau varie de 30 % d’une source à l’autre selon la pose et le support.',
    en: 'Published table values, not measurements. The same material varies by 30% between sources depending on mounting and backing.'
  },

  // Refus de `commun/salle.js`.
  'erreur.salle.materiauInconnu': {
    fr: 'Matériau inconnu : {id}.',
    en: 'Unknown material: {id}.'
  },
  'erreur.salle.volumePositif': {
    fr: 'Le volume doit être supérieur à zéro.',
    en: 'The volume must be greater than zero.'
  },
  'erreur.salle.surfacePositive': {
    fr: 'La surface des parois doit être supérieure à zéro.',
    en: 'The surface of the walls must be greater than zero.'
  },
  'erreur.salle.airePositive': {
    fr: 'L’aire au sol doit être supérieure à zéro.',
    en: 'The floor area must be greater than zero.'
  },
  'erreur.salle.hauteurPositive': {
    fr: 'La hauteur sous plafond doit être supérieure à zéro.',
    en: 'The ceiling height must be greater than zero.'
  },
  'erreur.salle.perimetrePositif': {
    fr: 'Le périmètre doit être supérieur à zéro.',
    en: 'The perimeter must be greater than zero.'
  },
  'erreur.salle.quantiteNegative': {
    fr: 'Une surface ou un nombre ne peut pas être négatif.',
    en: 'An area or a count cannot be negative.'
  },
  'erreur.salle.ouvertureHorsLimites': {
    fr: 'L’ouverture doit être comprise entre 0 et 360°.',
    en: 'The coverage angle must be between 0 and 360°.'
  },
  'erreur.salle.directivitePositive': {
    fr: 'Le facteur de directivité doit être supérieur à zéro.',
    en: 'The directivity factor must be greater than zero.'
  },

  // --- Conditions d'utilisation ---
  'conditions.titre': { fr: "Conditions d'utilisation", en: 'Terms of use' },
  'conditions.version': { fr: 'Version {version}', en: 'Version {version}' },
  'conditions.defilerJusquauBout': {
    fr: 'Faites défiler le texte jusqu’en bas pour continuer.',
    en: 'Scroll to the bottom of the text to continue.'
  },
  'conditions.jaiLu': {
    fr: 'J’ai lu et j’accepte ces conditions.',
    en: 'I have read and accept these terms.'
  },
  'conditions.accepter': { fr: 'Accepter et continuer', en: 'Accept and continue' },
  'conditions.lireSurLeSite': { fr: 'Lire sur le site', en: 'Read on the website' }
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
