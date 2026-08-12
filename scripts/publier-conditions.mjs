import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Fabrique les pages publiques des conditions, dans les deux langues.
 *
 * **Le texte n'est écrit qu'une fois**, dans `src/partage/conditions.ts`, et
 * les pages en sont déduites. Recopié à la main, il divergerait — et deux
 * versions d'un même engagement qui divergent, c'est pire que pas
 * d'engagement : on ne sait plus laquelle on a acceptée.
 *
 * La coque des pages est reprise de `docs/index.html`, pour la même raison.
 *
 *   node scripts/publier-conditions.mjs
 */
const PROJET = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Lit les conditions sans compiler le TypeScript.
 *
 * Le fichier ne contient que des données : on en extrait les littéraux plutôt
 * que d'ajouter un empaqueteur à un script qui écrit deux pages HTML. Le
 * format est vérifié — un fichier qu'on ne sait plus lire fait échouer le
 * script, il ne produit pas une page vide.
 */
function lireConditions() {
  const source = readFileSync(join(PROJET, 'src/partage/conditions.ts'), 'utf-8')

  const version = source.match(/VERSION_CONDITIONS = '([^']+)'/)?.[1]
  if (!version) throw new Error('VERSION_CONDITIONS introuvable dans conditions.ts')

  const bloc = source.slice(
    source.indexOf('export const CONDITIONS_UTILISATION'),
    source.indexOf('/** Ce qu\'on retient')
  )

  const sections = []
  const motifTitre = /titre: \{\s*fr: (['"])((?:[^\\]|\\.)*?)\1,\s*en: (['"])((?:[^\\]|\\.)*?)\3\s*\}/g
  const morceaux = bloc.split(/\{\s*\n\s*titre:/).slice(1)

  for (const morceau of morceaux) {
    motifTitre.lastIndex = 0
    const entete = new RegExp(motifTitre.source).exec('titre:' + morceau)
    if (!entete) continue

    const paragraphes = []
    const motifParagraphe =
      /\{\s*fr: (['"])((?:[^\\]|\\.)*?)\1,\s*en: (['"])((?:[^\\]|\\.)*?)\3\s*\}/g
    let trouve
    let premier = true
    while ((trouve = motifParagraphe.exec(morceau)) !== null) {
      // Le premier couple fr/en du morceau est le titre lui-même.
      if (premier) {
        premier = false
        continue
      }
      paragraphes.push({ fr: trouve[2], en: trouve[4] })
    }

    sections.push({ titre: { fr: entete[2], en: entete[4] }, paragraphes })
  }

  if (sections.length < 5) {
    throw new Error(
      `Seulement ${sections.length} sections lues dans conditions.ts — le format a changé.`
    )
  }

  const resume = source.slice(source.indexOf('RESUME_CONDITIONS = {'))
  const resumeFr = resume.match(/fr: (['"])((?:[^\\]|\\.)*?)\1/)?.[2]
  const resumeEn = resume.match(/en: (['"])((?:[^\\]|\\.)*?)\1/)?.[2]
  if (!resumeFr || !resumeEn) throw new Error('RESUME_CONDITIONS illisible')

  return { version, sections, resume: { fr: resumeFr, en: resumeEn } }
}

/** Les apostrophes typographiques du code passent telles quelles en HTML. */
function echapper(texte) {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("\\'", "'")
}

function corps(conditions, langue) {
  const fr = langue === 'fr'
  const sections = conditions.sections
    .map(
      (section) => `
    <h2 class="titre reveal">${echapper(fr ? section.titre.fr : section.titre.en)}</h2>
${section.paragraphes
  .map((p) => `    <p class="intro reveal">${echapper(fr ? p.fr : p.en)}</p>`)
  .join('\n')}`
    )
    .join('\n')

  return `<main>
  <section class="hero wrap">
    <p class="etat-ligne">${fr ? 'VERSION' : 'VERSION'} ${conditions.version}</p>
    <h1>${
      fr
        ? 'Conditions <span class="grad-text">d\'utilisation</span>.'
        : 'Terms <span class="grad-text">of use</span>.'
    }</h1>
    <p class="chapo">${echapper(fr ? conditions.resume.fr : conditions.resume.en)}</p>
    <p class="chapo">${
      fr
        ? 'Ce texte complète les <a href="https://resonlab.github.io/conditions.html">conditions générales de ResonLab</a>.'
        : 'This text adds to the <a href="https://resonlab.github.io/en/terms.html">general ResonLab terms</a>.'
    }</p>
  </section>

  <section class="wrap">${sections}
  </section>
</main>`
}

function fabriquer(conditions, source, cible, langue, titre, description) {
  const modele = readFileSync(join(PROJET, source), 'utf-8')
  const avant = modele.slice(0, modele.indexOf('<main>'))
  const apres = modele.slice(modele.indexOf('</main>') + '</main>'.length)

  let page = avant
    .replace(/<title>.*?<\/title>/, `<title>${titre}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)

  // Les ancres de la page d'accueil ne mènent nulle part ici.
  for (const ancre of ['#modules', '#dmx', '#principes', '#ce-quelle-fait', '#honnetete']) {
    page = page.replaceAll(`href="${ancre}"`, `href="index.html${ancre}"`)
  }

  // Le sélecteur de langue relie les deux conditions entre elles.
  page =
    langue === 'fr'
      ? page.replace('<a href="en/" class="langue" hreflang="en">EN</a>', '<a href="en/terms.html" class="langue" hreflang="en">EN</a>')
      : page.replace('<a href="../" class="langue" hreflang="fr">FR</a>', '<a href="../conditions.html" class="langue" hreflang="fr">FR</a>')

  const pied = apres.replaceAll('href="#', 'href="index.html#')
  writeFileSync(join(PROJET, cible), page + corps(conditions, langue) + pied, 'utf-8')
  console.log(`${cible} écrit`)
}

const conditions = lireConditions()

fabriquer(
  conditions,
  'docs/index.html',
  'docs/conditions.html',
  'fr',
  "Acustika — conditions d'utilisation",
  "Les conditions d'utilisation d'Acustika : ce que le calcul et le conseil de placement font, et ce qu'ils ne font pas."
)
fabriquer(
  conditions,
  'docs/en/index.html',
  'docs/en/terms.html',
  'en',
  'Acustika — terms of use',
  'The terms of use of Acustika: what the calculation and the placement advice do, and what they do not do.'
)

console.log(`${conditions.sections.length} sections, version ${conditions.version}`)
