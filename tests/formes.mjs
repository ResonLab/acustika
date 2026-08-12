import {
  aire,
  carre,
  cercle,
  demiCercle,
  eventail,
  ferACheval,
  FORMES,
  perimetre,
  rectangle
} from '../commun/formes.js'
import { pointDansPolygone } from '../commun/acoustique.js'

/**
 * Les formes préfaites.
 *
 * Le point de ces tests n'est pas que le code s'exécute : c'est que les
 * contours **valent ce qu'ils prétendent valoir**. Une forme dont l'aire est
 * fausse de 3 % donne une réverbération fausse de 3 %, et personne ne le verra
 * jamais sur une carte de couleurs.
 *
 * Chaque valeur attendue est calculable de tête ou à la calculatrice, et écrite
 * ici en clair. Comparer une fonction à elle-même ne prouve rien.
 */

let echecs = 0
const ok = (message) => console.log(`  OK   ${message}`)
const echec = (message) => {
  console.log(`  ÉCHEC : ${message}`)
  echecs += 1
}

function verifier(condition, message) {
  if (condition) ok(message)
  else echec(message)
}

/** Comparaison à une tolérance relative — les arcs sont approchés. */
function proche(obtenu, attendu, tolerance, message) {
  const ecart = Math.abs(obtenu - attendu)
  const admis = Math.abs(attendu) * tolerance
  if (ecart <= admis) {
    ok(`${message} — ${obtenu.toFixed(3)} ≈ ${attendu.toFixed(3)}`)
  } else {
    echec(`${message} — obtenu ${obtenu.toFixed(3)}, attendu ${attendu.toFixed(3)}`)
  }
}

const CENTRE = { x: 0, y: 0 }

console.log('\n=== Le rectangle est exact ===')

const r = rectangle(CENTRE, 12, 18)
verifier(r.length === 4, 'un rectangle a quatre sommets')
proche(aire(r), 12 * 18, 0, "l'aire vaut largeur × profondeur")
proche(perimetre(r), 2 * (12 + 18), 0, 'le périmètre vaut 2 × (l + p)')

// Le centre est bien le centre géométrique, pas un coin : c'est ce qui permet
// de poser une forme au milieu du plan sans la recaler ensuite.
const moyenneX = r.reduce((s, p) => s + p.x, 0) / r.length
const moyenneY = r.reduce((s, p) => s + p.y, 0) / r.length
verifier(moyenneX === 0 && moyenneY === 0, 'le centre demandé est le centre du contour')

// Un rectangle 12 × 18 posé en (0,0) va de -6 à +6 et de -9 à +9.
verifier(pointDansPolygone(r, { x: 5.9, y: 8.9 }), 'un point juste dedans est dedans')
verifier(!pointDansPolygone(r, { x: 6.1, y: 0 }), 'un point juste dehors est dehors')

console.log('\n=== Le carré est le rectangle à côtés égaux ===')

const c = carre(CENTRE, 10)
proche(aire(c), 100, 0, "l'aire d'un carré de 10 m vaut 100 m²")
verifier(
  JSON.stringify(c) === JSON.stringify(rectangle(CENTRE, 10, 10)),
  'le carré est exactement le rectangle de mêmes côtés'
)

console.log('\n=== Le cercle approche pi·r² par en dessous ===')

const cer = cercle(CENTRE, 8)
const airePi = Math.PI * 64
// Polygone inscrit : son aire est forcément inférieure à celle du disque.
verifier(aire(cer) < airePi, "l'aire du polygone inscrit est sous celle du disque")
proche(aire(cer), airePi, 0.003, "l'aire reste à 0,3 % de pi·r² — deficit 2pi²/3n²")
proche(perimetre(cer), 2 * Math.PI * 8, 0.002, 'le périmètre reste à 0,2 % de 2·pi·r')

// Tous les sommets sont sur le cercle : c'est la définition du circonscrit.
const rayonsJustes = cer.every((p) => Math.abs(Math.hypot(p.x, p.y) - 8) < 0.002)
verifier(rayonsJustes, 'tous les sommets sont sur le cercle de rayon 8')

console.log('\n=== Le demi-cercle vaut la moitié, diamètre côté scène ===')

const demi = demiCercle(CENTRE, 10)
proche(aire(demi), (Math.PI * 100) / 2, 0.003, "l'aire vaut la moitié d'un disque de rayon 10")

// Le diamètre est en bas (y = 0), l'arc monte : aucun point sous l'axe.
verifier(
  demi.every((p) => p.y >= -0.001),
  "l'arc monte vers les +y, la scène reste au sud"
)
verifier(pointDansPolygone(demi, { x: 0, y: 5 }), 'un point au milieu de l’arc est dedans')
verifier(!pointDansPolygone(demi, { x: 0, y: -5 }), 'un point sous le diamètre est dehors')

console.log('\n=== L’éventail est bien un trapèze ===')

const ev = eventail(CENTRE, 10, 18, 20)
// Aire d'un trapèze : (petite base + grande base) / 2 × hauteur.
proche(aire(ev), ((10 + 18) / 2) * 20, 0, "l'aire vaut (b + B) / 2 × h")
verifier(ev.length === 4, 'un éventail a quatre sommets')

// Le fond est plus large que la scène : c'est tout l'intérêt de la forme.
const largeurAuFond = Math.abs(ev[2].x - ev[3].x)
const largeurALaScene = Math.abs(ev[1].x - ev[0].x)
verifier(largeurAuFond > largeurALaScene, 'le fond est plus large que la scène')

console.log('\n=== Le fer à cheval : deux côtés droits, un arc au fond ===')

const fer = ferACheval(CENTRE, 14, 20)
// Aire attendue : le rectangle droit (14 × (20 - 7)) plus le demi-disque r = 7.
const aireAttendue = 14 * (20 - 7) + (Math.PI * 49) / 2
proche(aire(fer), aireAttendue, 0.002, "l'aire vaut le rectangle plus le demi-disque")
verifier(
  pointDansPolygone(fer, { x: 0, y: 0 }),
  'le centre de la salle est dans le fer à cheval'
)

// Une profondeur inférieure au rayon replierait le contour sur lui-même.
let refuse = false
try {
  ferACheval(CENTRE, 20, 6)
} catch {
  refuse = true
}
verifier(refuse, 'un fer à cheval plus court que son rayon est refusé, pas replié')

console.log('\n=== Les dimensions absurdes sont refusées, pas calculées ===')

for (const [nom, appel] of [
  ['largeur nulle', () => rectangle(CENTRE, 0, 10)],
  ['profondeur négative', () => rectangle(CENTRE, 10, -4)],
  ['rayon nul', () => cercle(CENTRE, 0)],
  ['rayon négatif', () => demiCercle(CENTRE, -3)],
  ['éventail à fond nul', () => eventail(CENTRE, 10, 0, 20)],
  ['cercle à deux segments', () => cercle(CENTRE, 5, 2)]
]) {
  let leve = false
  try {
    appel()
  } catch {
    leve = true
  }
  verifier(leve, `${nom} : refusé`)
}

console.log('\n=== La table FORMES décrit exactement les fonctions ===')

// Sans ce contrôle, une forme pourrait exister dans la table sans construire
// quoi que ce soit — l'interface afficherait un bouton mort.
for (const forme of FORMES) {
  const parametres = Object.fromEntries(forme.parametres.map((p) => [p.nom, p.defaut]))
  let contour = null
  try {
    contour = forme.construire(CENTRE, parametres)
  } catch (e) {
    echec(`${forme.id} : ses valeurs par défaut ne construisent rien (${e.message})`)
    continue
  }
  const valide = Array.isArray(contour) && contour.length >= 3 && aire(contour) > 0
  verifier(valide, `${forme.id} : ses valeurs par défaut donnent une zone d'aire non nulle`)

  const cles = forme.cle.startsWith('forme.') && forme.parametres.every((p) => p.cle.startsWith('forme.'))
  verifier(cles, `${forme.id} : libellés donnés en clés de traduction, pas en phrases`)
}

const identifiants = new Set(FORMES.map((f) => f.id))
verifier(identifiants.size === FORMES.length, 'aucun identifiant de forme en double')

console.log(
  echecs === 0 ? '\nFORMES : TOUS LES TESTS PASSENT' : `\nFORMES : ${echecs} ÉCHEC(S)`
)
process.exit(echecs === 0 ? 0 : 1)
