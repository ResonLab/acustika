import {
  SEUIL_OUVERTURE_DB,
  lireDonneesPolaires,
  ouvertureDepuisPoints,
  ressembleAUnBinaire
} from '../commun/polaire.js'

/**
 * La lecture de données polaires.
 *
 * Ce que ce module produit alimente la carte de couverture **et le conseil de
 * placement** : une ouverture mal déduite donne un placement faux avec l'aplomb
 * d'un vrai. D'où l'insistance, ici, sur ce que le module **refuse** de faire.
 */
let echecs = 0
function verifier(intitule, condition, detail = '') {
  if (!condition) echecs += 1
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${intitule}`)
  if (!condition && detail) console.log(`        ${detail}`)
}

function refuseAvec(intitule, action, extrait) {
  let message = null
  try {
    action()
  } catch (erreur) {
    message = erreur.message
  }
  verifier(
    intitule,
    message !== null && message.includes(extrait),
    message ?? 'aucune erreur levée'
  )
}

const proche = (obtenu, attendu, tolerance = 0.05) => Math.abs(obtenu - attendu) <= tolerance

console.log('=== L’ouverture se déduit par interpolation ===')

verifier('le seuil du métier est −6 dB', SEUIL_OUVERTURE_DB === -6)

// Le seuil est franchi exactement sur une mesure : l'ouverture vaut le double
// de cet angle. 45° à −6 dB donnent 90° d'ouverture, le cas d'école.
verifier(
  'un relevé qui atteint pile −6 dB à 45° donne 90°',
  ouvertureDepuisPoints([
    { angle: 0, niveauRelatif: 0 },
    { angle: 45, niveauRelatif: -6 }
  ]) === 90
)

// Entre deux relevés : −4 dB à 30°, −8 dB à 40°. Le seuil tombe à mi-chemin,
// donc 35°, soit 70° d'ouverture. Arrondir à la mesure la plus proche aurait
// donné 60 ou 80 — vingt degrés d'écart pour rien.
verifier(
  'le seuil entre deux relevés est interpolé',
  proche(
    ouvertureDepuisPoints([
      { angle: 0, niveauRelatif: 0 },
      { angle: 30, niveauRelatif: -4 },
      { angle: 40, niveauRelatif: -8 }
    ]),
    70
  ),
  String(
    ouvertureDepuisPoints([
      { angle: 0, niveauRelatif: 0 },
      { angle: 30, niveauRelatif: -4 },
      { angle: 40, niveauRelatif: -8 }
    ])
  )
)

// Certaines fiches donnent des niveaux absolus : le point dans l'axe sert de
// référence, quel qu'il soit.
verifier(
  'des niveaux absolus donnent la même ouverture que des niveaux relatifs',
  ouvertureDepuisPoints([
    { angle: 0, niveauRelatif: 104 },
    { angle: 45, niveauRelatif: 98 }
  ]) === 90
)

// Les relevés symétriques ne doivent pas fausser le résultat.
verifier(
  'les angles négatifs sont repliés sur les positifs',
  ouvertureDepuisPoints([
    { angle: -45, niveauRelatif: -6 },
    { angle: 0, niveauRelatif: 0 },
    { angle: 45, niveauRelatif: -6 }
  ]) === 90
)

// Inventer une ouverture serait pire que de dire qu'on ne sait pas.
verifier(
  'un relevé qui ne descend jamais de 6 dB ne conclut pas',
  ouvertureDepuisPoints([
    { angle: 0, niveauRelatif: 0 },
    { angle: 60, niveauRelatif: -3 }
  ]) === null
)
verifier('un seul point ne conclut pas', ouvertureDepuisPoints([{ angle: 0, niveauRelatif: 0 }]) === null)

console.log('\n=== Deux dispositions, reconnues toutes seules ===')

// Les angles en colonnes, les bandes en lignes.
const anglesEnColonnes = [
  'Hz,0,15,30,45,60',
  '1000,0,-1,-4,-6,-9',
  '2000,0,-2,-6,-10,-14'
].join('\n')

const lu = lireDonneesPolaires(anglesEnColonnes)
verifier('les deux bandes sont lues', lu.mesures.length === 2)
verifier('1000 Hz donne 90° d’ouverture', lu.ouverture[1000] === 90, String(lu.ouverture[1000]))
verifier('2000 Hz donne 60° d’ouverture', lu.ouverture[2000] === 60, String(lu.ouverture[2000]))

// L'inverse : les bandes en colonnes, les angles en lignes. Le même contenu
// doit donner le même résultat, sinon on demanderait à l'utilisateur de
// retourner son tableau — et il ne reviendrait pas.
const bandesEnColonnes = [
  'Angle,1000,2000',
  '0,0,0',
  '15,-1,-2',
  '30,-4,-6',
  '45,-6,-10',
  '60,-9,-14'
].join('\n')

const retourne = lireDonneesPolaires(bandesEnColonnes)
verifier(
  'la disposition inverse donne exactement le même résultat',
  JSON.stringify(retourne.ouverture) === JSON.stringify(lu.ouverture),
  `${JSON.stringify(retourne.ouverture)} vs ${JSON.stringify(lu.ouverture)}`
)

console.log('\n=== Ce que le lecteur accepte ===')

// Séparateurs, virgule décimale, unités collées, commentaires et lignes vides :
// c'est ce qu'on trouve dans un fichier réel, pas dans un fichier idéal.
const brouillon = [
  '# Export du visualiseur',
  'Angle;1000 Hz;2000 Hz',
  '',
  '0°;0,0;0,0',
  '45°;-6,0;-12,0'
].join('\n')

const souple = lireDonneesPolaires(brouillon)
verifier(
  'points-virgules, virgules décimales, unités et commentaires passent',
  souple.ouverture[1000] === 90,
  JSON.stringify(souple.ouverture)
)

const tabulations = ['Hz\t0\t45', '1000\t0\t-6'].join('\n')
verifier(
  'les tabulations passent aussi',
  lireDonneesPolaires(tabulations).ouverture[1000] === 90
)

console.log('\n=== Ce que le lecteur refuse ===')

// Le point qui compte le plus. Un CLF lu comme du texte donnerait des nombres
// au hasard, et ces nombres alimenteraient le conseil de placement.
const octetNul = String.fromCharCode(0)
verifier(
  'un contenu binaire est reconnu',
  ressembleAUnBinaire(`CF2${octetNul}${octetNul}${octetNul}donnees`)
)
verifier('un tableau de texte n’est pas pris pour un binaire', !ressembleAUnBinaire(anglesEnColonnes))

refuseAvec(
  'un fichier CLF est refusé, et le message dit quoi faire',
  () => lireDonneesPolaires(`CF2${octetNul}${octetNul}${octetNul}donnees binaires`),
  'Exportez les données'
)
refuseAvec(
  'le refus nomme le format en toutes lettres',
  () => lireDonneesPolaires(`CF1${octetNul}${octetNul}binaire`),
  '.cf1'
)

refuseAvec(
  'un fichier d’une seule ligne est refusé',
  () => lireDonneesPolaires('Angle,0,45'),
  'au moins deux lignes'
)
refuseAvec(
  'un en-tête sans nombres est refusé',
  () => lireDonneesPolaires('Angle,gauche,droite\n0,1,2'),
  'des nombres'
)

// Une bande dont le niveau ne descend jamais assez : elle est signalée, et les
// autres passent quand même. Un import tout ou rien ferait qu'on n'importerait
// jamais rien.
const partiel = lireDonneesPolaires(['Hz,0,45', '1000,0,-6', '125,0,-2'].join('\n'))
verifier('la bande exploitable est déduite', partiel.ouverture[1000] === 90)
verifier('la bande douteuse n’est pas inventée', partiel.ouverture[125] === undefined)
verifier(
  'et elle est signalée, avec sa fréquence',
  partiel.avertissements.length === 1 && partiel.avertissements[0].includes('125'),
  JSON.stringify(partiel.avertissements)
)

console.log(
  echecs === 0 ? '\nPOLAIRE : TOUS LES TESTS PASSENT' : `\n${echecs} TEST(S) EN ECHEC`
)
process.exitCode = echecs === 0 ? 0 : 1
