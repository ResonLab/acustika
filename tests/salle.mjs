import {
  aireAbsorption,
  analyserSalle,
  coefficient,
  constanteSalle,
  distanceCritique,
  facteurDirectivite,
  indiceDirectivite,
  MATERIAUX,
  niveauReverbere,
  puissanceDepuisNiveau1m,
  rt60Eyring,
  rt60Sabine,
  surfaceTotale,
  surfacesDepuisContour,
  pourcentAlcons,
  stiDepuisAlcons,
  jugementSti,
  BANDES
} from '../commun/salle.js'

/**
 * Le moteur de salle.
 *
 * **Chaque valeur attendue est calculée à part**, à la main ou à la
 * calculatrice, et écrite ici en clair avec son raisonnement. C'est la seule
 * façon d'attraper une formule fausse : comparer une fonction à elle-même ne
 * prouve que sa stabilité.
 *
 * On vérifie aussi des **relations** qui doivent tenir quelles que soient les
 * valeurs — Eyring sous Sabine, la distance critique qui grandit avec la
 * directivité, le champ réverbéré qui s'effondre quand la salle absorbe. Une
 * inversion de signe passe les valeurs ponctuelles et casse les relations.
 */

let echecs = 0
const ok = (m) => console.log(`  OK   ${m}`)
const echec = (m) => {
  console.log(`  ÉCHEC : ${m}`)
  echecs += 1
}
const verifier = (c, m) => (c ? ok(m) : echec(m))

function proche(obtenu, attendu, tolerance, message) {
  const admis = Math.abs(attendu) * tolerance
  if (Math.abs(obtenu - attendu) <= admis) {
    ok(`${message} — ${obtenu.toFixed(4)} ≈ ${attendu.toFixed(4)}`)
  } else {
    echec(`${message} — obtenu ${obtenu.toFixed(4)}, attendu ${attendu.toFixed(4)}`)
  }
}

/* ── Une salle de référence, calculable de tête ──────────────────────────── */
// 20 m × 10 m × 5 m. Volume 1000 m³. Sol 200, plafond 200, murs (60 × 5) = 300.
// Surface totale des parois : 700 m².
const VOLUME = 1000
const SOL = 200
const MURS = 300

console.log('\n=== L’aire d’absorption est une simple somme pondérée ===')

// Béton partout à 500 Hz : alpha = 0,02. A = 700 × 0,02 = 14 m² sabine.
const toutBeton = [
  { materiauId: 'betonBrut', aire: SOL },
  { materiauId: 'betonBrut', aire: SOL },
  { materiauId: 'betonBrut', aire: MURS }
]
proche(aireAbsorption(toutBeton, 500), 700 * 0.02, 0, 'béton partout : A = 700 × 0,02')
proche(surfaceTotale(toutBeton), 700, 0, 'la surface des parois vaut 700 m²')

// Mélange : sol moquette (0,14 à 500 Hz), plafond dalles (0,60), murs béton (0,02).
// A = 200×0,14 + 200×0,60 + 300×0,02 = 28 + 120 + 6 = 154.
const melange = [
  { materiauId: 'moquette', aire: SOL },
  { materiauId: 'dallesMinerales', aire: SOL },
  { materiauId: 'betonBrut', aire: MURS }
]
proche(aireAbsorption(melange, 500), 28 + 120 + 6, 0, 'mélange : A = 28 + 120 + 6')

console.log('\n=== Le public se compte à l’unité, pas au mètre carré ===')

// 100 spectateurs à 0,42 m² sabine chacun à 500 Hz = 42 m² sabine.
// Un spectateur n'a pas de surface au sol : le compter en m² serait un
// contresens, et sous-estimerait beaucoup l'absorption d'une salle pleine.
const avecPublic = [...melange, { materiauId: 'publicAssis', nombre: 100 }]
proche(aireAbsorption(avecPublic, 500), 154 + 42, 0, '100 spectateurs ajoutent 42 m² sabine')
proche(
  surfaceTotale(avecPublic),
  700,
  0,
  'le public n’entre pas dans la surface des parois'
)

console.log('\n=== Sabine : la formule qui se vérifie de tête ===')

// RT60 = 0,161 × 1000 / 100 = 1,61 s.
proche(rt60Sabine(1000, 100), 1.61, 0, 'V = 1000, A = 100 → 1,61 s')
// Doubler l'absorption divise le temps par deux : c'est toute la formule.
proche(rt60Sabine(1000, 200), 0.805, 0, 'doubler A divise le temps par deux')

verifier(rt60Sabine(1000, 0) === Infinity, 'une salle sans absorption ne finit jamais de résonner')

console.log('\n=== Eyring : toujours sous Sabine, et nul à l’absorption totale ===')

// V=1000, S=600, A=100 → alpha = 0,16667.
// RT = 0,161×1000 / (−600 × ln(0,83333)) = 161 / (600 × 0,182322) = 161 / 109,393
const eyringAttendu = 161 / (600 * 0.1823216)
proche(rt60Eyring(1000, 600, 100), eyringAttendu, 0.0001, 'V=1000 S=600 A=100 → Eyring')

// La relation qui doit tenir partout, pas seulement sur cet exemple.
let relationTient = true
for (const a of [10, 50, 100, 200, 400, 590]) {
  if (rt60Eyring(1000, 600, a) > rt60Sabine(1000, a) + 1e-9) relationTient = false
}
verifier(relationTient, 'Eyring reste sous Sabine pour toute absorption')

// Absorption totale : Sabine se trompe, Eyring a raison.
//
// Sabine reste bloqué sur 0,161 × 1000 / 600 = 0,268 s dans une salle qui
// n'a plus aucune réflexion — c'est le défaut connu de la formule.
//
// Eyring, lui, ne rend pas exactement zéro mais 0,029 s, et **ce plancher est
// voulu** : le module plafonne alpha à 0,9999 pour que le logarithme ne diverge
// pas. Le temps rendu vaut alors 161 / (600 × ln(10⁴)) = 161 / 5526. Une
// absorption vraiment totale n'existe pas ; ce qui compte est qu'Eyring
// s'effondre d'un ordre de grandeur là où Sabine ne bouge pas.
const sabineTotale = rt60Sabine(1000, 600)
const eyringTotale = rt60Eyring(1000, 600, 600)
proche(sabineTotale, 0.161 * (1000 / 600), 0.0001, 'Sabine reste bloqué sur 0,268 s')
proche(eyringTotale, 161 / (600 * Math.log(1e4)), 0.001, 'Eyring tombe au plancher du plafonnement')
verifier(
  eyringTotale < sabineTotale / 5,
  `à absorption totale Eyring vaut ${eyringTotale.toFixed(3)} s contre ${sabineTotale.toFixed(3)} s pour Sabine`
)

console.log('\n=== La constante de salle pilote le champ réverbéré ===')

// S = 600, A = 100 → alpha = 1/6. R = 600 × (1/6) / (5/6) = 100 / 0,83333 = 120.
proche(constanteSalle(600, 100), 120, 0.0001, 'S=600 A=100 → R = 120')

// Salle parfaitement absorbante : plus de champ réverbéré du tout.
verifier(constanteSalle(600, 600) === Infinity, 'absorption totale → R infini, donc plein air')
verifier(niveauReverbere(100, 90, Infinity) === -Infinity, 'R infini → aucun champ réverbéré')

console.log('\n=== La directivité : un cône, et c’est dit ===')

// Q = 2 / (1 − cos(45°)) = 2 / (1 − 0,7071068) = 2 / 0,2928932 = 6,8284
proche(facteurDirectivite(90), 2 / (1 - Math.cos(Math.PI / 4)), 0, 'ouverture 90° → Q = 6,83')
proche(indiceDirectivite(90), 10 * Math.log10(6.8284271), 0.0001, 'DI = 10·log10(Q) = 8,34 dB')

// Une source omnidirectionnelle a Q = 1. Ouverture 360° exclue, mais 359,99 tend vers 1.
proche(facteurDirectivite(359.9), 1, 0.001, 'ouverture quasi totale → Q ≈ 1')

// Plus serré = plus directif. La relation, pas un point.
let croissante = true
for (let a = 20; a < 180; a += 10) {
  if (facteurDirectivite(a) <= facteurDirectivite(a + 10)) croissante = false
}
verifier(croissante, 'Q augmente quand l’ouverture se resserre')

console.log('\n=== Distance critique : la grandeur la plus utile ===')

// rc = sqrt(Q·R / 16pi) avec Q = 6,8284 et R = 120
// = sqrt(819,41 / 50,2655) = sqrt(16,301) = 4,0375 m
const rcAttendu = Math.sqrt((6.8284271 * 120) / (16 * Math.PI))
proche(distanceCritique(6.8284271, 120), rcAttendu, 0.0001, 'Q=6,83 R=120 → rc = 4,04 m')
proche(distanceCritique(6.8284271, 120), 4.0375, 0.001, 'et cela vaut bien 4,04 m')

// Doubler R multiplie rc par racine de 2 : la loi en racine, pas linéaire.
proche(
  distanceCritique(6.8284271, 240) / distanceCritique(6.8284271, 120),
  Math.SQRT2,
  0.0001,
  'doubler R multiplie rc par √2'
)

verifier(distanceCritique(6.83, 0) === 0, 'sans champ réverbéré la notion n’a pas de sens : 0')

console.log('\n=== Une enceinte directive envoie moins d’énergie dans la salle ===')

// Lw = L1m + 10·log10(4pi) − DI. 10·log10(4pi) = 10,992 dB.
const constante4pi = 10 * Math.log10(4 * Math.PI)
proche(
  puissanceDepuisNiveau1m(100, 90),
  100 + constante4pi - 10 * Math.log10(6.8284271),
  0.0001,
  'Lw = L1m + 10,99 − DI'
)

// Deux enceintes au même niveau à 1 m : la plus serrée excite moins la salle.
// C'est le cœur du sujet — sans cette conversion, elles se vaudraient.
const large = niveauReverbere(100, 120, 120)
const serree = niveauReverbere(100, 40, 120)
verifier(
  serree < large - 3,
  `à niveau égal à 1 m, une 40° excite la salle ${(large - serree).toFixed(1)} dB de moins qu’une 120°`
)

console.log('\n=== Une salle traitée fait chuter le champ réverbéré ===')

// Même salle, murs béton puis laine de 100 mm. Le niveau réverbéré doit
// s'effondrer, et la distance critique s'éloigner d'autant.
const nue = analyserSalle(VOLUME, toutBeton, 1000, 90)
const traitee = analyserSalle(
  VOLUME,
  [
    { materiauId: 'betonBrut', aire: SOL },
    { materiauId: 'laine100', aire: SOL },
    { materiauId: 'laine100', aire: MURS }
  ],
  1000,
  90
)

verifier(
  traitee.rt60Sabine < nue.rt60Sabine / 5,
  `RT60 : ${nue.rt60Sabine.toFixed(2)} s nue → ${traitee.rt60Sabine.toFixed(2)} s traitée`
)
verifier(
  traitee.distanceCritique > nue.distanceCritique * 2,
  `distance critique : ${nue.distanceCritique.toFixed(2)} m → ${traitee.distanceCritique.toFixed(2)} m`
)
verifier(
  niveauReverbere(100, 90, traitee.constanteSalle) < niveauReverbere(100, 90, nue.constanteSalle),
  'le champ réverbéré baisse quand on traite la salle'
)

console.log('\n=== Les surfaces déduites d’un contour ===')

// Contour de 200 m² et 60 m de périmètre, hauteur 5 m : murs = 300 m².
const deduites = surfacesDepuisContour(SOL, 60, 5, {
  sol: 'parquet',
  plafond: 'platre',
  murs: 'platre'
})
proche(surfaceTotale(deduites), 200 + 200 + 300, 0, 'sol + plafond + murs = 700 m²')

console.log('\n=== Les saisies absurdes sont refusées, pas calculées ===')

for (const [nom, appel] of [
  ['volume nul', () => rt60Sabine(0, 100)],
  ['volume négatif', () => rt60Eyring(-5, 600, 100)],
  ['surface nulle', () => constanteSalle(0, 100)],
  ['ouverture nulle', () => facteurDirectivite(0)],
  ['ouverture de 360°', () => facteurDirectivite(360)],
  ['ouverture négative', () => facteurDirectivite(-30)],
  ['matériau inconnu', () => aireAbsorption([{ materiauId: 'granit', aire: 10 }], 500)],
  ['quantité négative', () => aireAbsorption([{ materiauId: 'betonBrut', aire: -5 }], 500)],
  ['hauteur nulle', () => surfacesDepuisContour(200, 60, 0, { sol: 'platre', plafond: 'platre', murs: 'platre' })]
]) {
  let leve = false
  try {
    appel()
  } catch {
    leve = true
  }
  verifier(leve, `${nom} : refusé`)
}

console.log('\n=== La table des matériaux se tient ===')

for (const materiau of MATERIAUX) {
  const bandesManquantes = BANDES.filter((b) => materiau.alpha[b] === undefined)
  verifier(bandesManquantes.length === 0, `${materiau.id} : les sept bandes sont renseignées`)

  // Un coefficient d'absorption est une fraction d'énergie : hors de [0, 1] il
  // n'a aucun sens physique, et au-dessus de 1 il ferait diverger Eyring.
  const valeurs = BANDES.map((b) => materiau.alpha[b])
  verifier(
    valeurs.every((v) => v >= 0 && v <= 1),
    `${materiau.id} : tous les coefficients sont dans [0, 1]`
  )
  verifier(
    materiau.cle.startsWith('materiau.'),
    `${materiau.id} : libellé donné en clé de traduction`
  )
  verifier(
    materiau.parUnite === 'surface' || materiau.parUnite === 'objet',
    `${materiau.id} : unité déclarée`
  )
}

const ids = new Set(MATERIAUX.map((m) => m.id))
verifier(ids.size === MATERIAUX.length, 'aucun identifiant de matériau en double')

// Une bande absente rend la valeur voisine, jamais zéro : zéro voudrait dire
// « parfaitement réfléchissant », une affirmation forte et fausse.
proche(coefficient('moquette', 63), 0.02, 0, 'bande inconnue → la voisine, pas zéro')

console.log('\n=== Le piege : l’ecart de niveau ment dans une salle reverberante ===')

// **C'est la decouverte la plus importante de ce module, et elle est
// contre-intuitive.** Le champ reverbere est uniforme : ajoute a la carte, il
// ecrase les ecarts. Une salle epouvantable affiche donc une couverture qui
// parait parfaite.
//
// Mesure sur une salle de 20 x 30 x 8 m avec une seule enceinte 90 degres :
//   . beton nu -> RT60 3,6 s . ecart 1,3 dB  . 98 % du public hors rc
//   . traitee  -> RT60 0,2 s . ecart 12,8 dB . 0 % du public hors rc
//
// Les deux mesures pointent en sens **oppose**. Si le conseil de placement
// optimisait l'ecart reverbere, il prefererait la cathedrale - et il aurait
// l'air d'avoir raison. D'ou deux regles que ce test protege :
//   1. le conseil raisonne sur le champ direct seul ;
//   2. la part du public au-dela de la distance critique est la mesure honnete.
{
  const aireSalle = 600
  const perimetreSalle = 100
  const hauteurSalle = 8
  const volumeSalle = aireSalle * hauteurSalle

  const surfacesNues = [
    ...surfacesDepuisContour(aireSalle, perimetreSalle, hauteurSalle, {
      sol: 'betonBrut',
      plafond: 'platre',
      murs: 'platre'
    }),
    { materiauId: 'publicAssis', nombre: 300 }
  ]
  const surfacesTraitees = [
    ...surfacesDepuisContour(aireSalle, perimetreSalle, hauteurSalle, {
      sol: 'moquette',
      plafond: 'laine100',
      murs: 'laine100'
    }),
    { materiauId: 'publicAssis', nombre: 300 }
  ]

  const nueA = analyserSalle(volumeSalle, surfacesNues, 1000, 90)
  const traiteeA = analyserSalle(volumeSalle, surfacesTraitees, 1000, 90)

  verifier(
    nueA.rt60Eyring > 2 && traiteeA.rt60Eyring < 0.5,
    `RT60 : ${nueA.rt60Eyring.toFixed(2)} s nue contre ${traiteeA.rt60Eyring.toFixed(2)} s traitee`
  )

  // La salle nue a une distance critique si courte que presque personne n'est
  // dedans ; la traitee couvre toute la profondeur. C'est ce renversement que
  // l'ecart de niveau est incapable de montrer.
  verifier(
    nueA.distanceCritique < 8 && traiteeA.distanceCritique > 25,
    `distance critique : ${nueA.distanceCritique.toFixed(1)} m nue contre ${traiteeA.distanceCritique.toFixed(1)} m traitee`
  )

  const revNue = niveauReverbere(100, 90, nueA.constanteSalle)
  const revTraitee = niveauReverbere(100, 90, traiteeA.constanteSalle)
  verifier(
    revNue > revTraitee + 10,
    `champ reverbere : ${revNue.toFixed(1)} dB nue contre ${revTraitee.toFixed(1)} dB traitee`
  )
}

console.log('=== L intelligibilite : Peutz, et ce que ca vaut ===')

// **La conversion %ALcons -> STI se verifie contre une table publiee.** Ce
// sont des correspondances connues, pas des valeurs reprises du code : 2 %
// vaut 0,82, 10 % vaut 0,52, 15 % vaut 0,45.
proche(stiDepuisAlcons(2), 0.82, 0.01, '2 % d articulation perdue -> STI 0,82')
proche(stiDepuisAlcons(10), 0.52, 0.02, '10 % -> STI 0,52')
proche(stiDepuisAlcons(15), 0.45, 0.02, '15 % -> STI 0,45')

// Plus la perte est grande, plus le STI baisse. La relation, pas un point.
let decroissant = true
for (let a = 1; a < 30; a += 1) {
  if (stiDepuisAlcons(a) <= stiDepuisAlcons(a + 1)) decroissant = false
}
verifier(decroissant, 'le STI baisse quand la perte d articulation monte')

// Une salle sans reverberation n articule rien de travers.
verifier(pourcentAlcons(10, 0, 3000, 6.83, 5) === 0, 'sans reverberation, aucune perte')
verifier(stiDepuisAlcons(0) === 1, 'aucune perte -> STI parfait')

// %ALcons = 200 . d2 . RT2 / (V . Q). A 10 m, RT 1,5 s, V 3000, Q 6,83 :
// 200 x 100 x 2,25 / (3000 x 6,83) = 45000 / 20490 = 2,196 %
proche(pourcentAlcons(10, 1.5, 3000, 6.83, 5), 45000 / 20490, 0.001, 'la formule de Peutz')

// **La saturation au-dela de 3,16 fois la distance critique.** Sans elle, la
// formule donnerait des valeurs absurdes au fond d une grande salle : le champ
// reverbere y domine tellement qu eloigner l auditeur n y change plus rien.
const rc = 5
const auDela = pourcentAlcons(3.16 * rc + 1, 1.5, 3000, 6.83, rc)
const bienAuDela = pourcentAlcons(60, 1.5, 3000, 6.83, rc)
proche(auDela, 9 * 1.5, 0.001, 'au-dela de 3,16 rc la formule sature a 9 x RT60')
verifier(auDela === bienAuDela, 's eloigner encore ne change plus rien')

// **Le plafond vaut aussi en deca de la saturation**, et ce cas-ci est choisi
// pour le prouver. Dans une salle petite et tres reverberante, la formule brute
// depasse 9 x RT60 avant meme d atteindre 3,16 rc — elle cesse alors d avoir un
// sens, et rendre sa valeur brute laisserait croire a une degradation que le
// modele ne sait pas decrire.
//
// V = 1000, RT60 = 3 s, Q = 6,83, rc = 5 m donc saturation a 15,8 m. A 12 m :
//   brut  = 200 x 144 x 9 / (1000 x 6,83) = 37,95 %
//   plafond = 9 x 3 = 27 %
// Sans le plafond, le test passerait a 37,95 et personne ne le verrait.
proche(pourcentAlcons(12, 3, 1000, 6.83, 5), 27, 0.001, 'le plafond mord avant la saturation')
verifier(
  pourcentAlcons(12, 3, 1000, 6.83, 5) < (200 * 144 * 9) / (1000 * 6.83) - 1,
  'la valeur brute aurait ete bien plus haute'
)

// Doubler la distance quadruple la perte, tant qu on reste sous la saturation.
proche(
  pourcentAlcons(8, 1.2, 8000, 6.83, 12) / pourcentAlcons(4, 1.2, 8000, 6.83, 12),
  4,
  0.001,
  'doubler la distance quadruple la perte'
)

// Une salle traitee rend intelligible ce qui ne l etait pas.
const nueSti = stiDepuisAlcons(pourcentAlcons(20, 3.5, 3000, 6.83, 4))
const traiteeSti = stiDepuisAlcons(pourcentAlcons(20, 0.6, 3000, 6.83, 20))
verifier(
  traiteeSti > nueSti + 0.2,
  `STI a 20 m : ${nueSti.toFixed(2)} en salle nue contre ${traiteeSti.toFixed(2)} traitee`
)

// Les seuils sont ceux de la CEI 60268-16, et le module rend une cle.
verifier(jugementSti(0.8) === 'sti.excellent', 'STI 0,80 : excellent')
verifier(jugementSti(0.65) === 'sti.bon', 'STI 0,65 : bon')
verifier(jugementSti(0.5) === 'sti.acceptable', 'STI 0,50 : acceptable')
verifier(jugementSti(0.35) === 'sti.mediocre', 'STI 0,35 : mediocre')
verifier(jugementSti(0.2) === 'sti.mauvais', 'STI 0,20 : mauvais')
verifier(
  jugementSti(0.5).startsWith('sti.'),
  'le jugement est une cle, pas une phrase : le module ignore la langue affichee'
)

for (const [nom, appel] of [
  ['distance negative', () => pourcentAlcons(-1, 1.5, 3000, 6.83, 5)],
  ['volume nul', () => pourcentAlcons(10, 1.5, 0, 6.83, 5)],
  ['directivite nulle', () => pourcentAlcons(10, 1.5, 3000, 0, 5)],
  ['alcons negatif', () => stiDepuisAlcons(-1)]
]) {
  let leve = false
  try { appel() } catch { leve = true }
  verifier(leve, `${nom} : refuse`)
}

console.log(echecs === 0 ? '\nSALLE : TOUS LES TESTS PASSENT' : `\nSALLE : ${echecs} ÉCHEC(S)`)
process.exit(echecs === 0 ? 0 : 1)
