import { readFileSync, writeFileSync } from 'node:fs'
import type { Projet } from '../../partage/types'

/**
 * Un projet est un **fichier**, pas une ligne dans une base.
 *
 * C'est la différence assumée avec Ohmnia et Scenika : une simulation se
 * transmet, s'archive avec un dossier de chantier, se compare à une autre. Un
 * fichier fait tout cela sans qu'on écrive quoi que ce soit ; une base ne le
 * fait pas.
 *
 * Le format est du JSON lisible. Dans dix ans, on pourra encore l'ouvrir avec
 * un éditeur de texte et comprendre ce qu'il contient — ce qui n'est pas vrai
 * d'un format binaire propriétaire, exactement le reproche fait au GLL.
 */

/** Version du format. À incrémenter dès qu'un champ change de sens. */
export const VERSION_FORMAT = 1

/**
 * La salle d'un projet neuf.
 *
 * **Elle est décrite mais inactive.** Des matériaux par défaut donneraient une
 * réverbération inventée, et une carte fausse est pire qu'une carte incomplète :
 * elle a l'aplomb de la vraie. L'utilisateur coche « tenir compte de la salle »
 * quand il a saisi *ses* matériaux, pas avant.
 *
 * Le béton et le plâtre ne sont pas un choix neutre non plus — ce sont les
 * surfaces les moins absorbantes, donc le cas le plus défavorable. Si l'on se
 * trompe, mieux vaut se tromper du côté qui alerte.
 */
export function salleVide(): Projet['salle'] {
  return {
    hauteur: 5,
    sol: 'betonBrut',
    plafond: 'platre',
    murs: 'platre',
    spectateurs: 0,
    active: false
  }
}

export function projetVide(): Projet {
  return {
    nom: 'Nouveau projet',
    largeur: 20,
    profondeur: 30,
    zones: [],
    enceintes: [],
    bande: 1000,
    salle: salleVide(),
    version: VERSION_FORMAT
  }
}

function valider(projet: Projet): string | null {
  if (typeof projet !== 'object' || projet === null) return "Ce fichier n'est pas un projet."
  if (!Array.isArray(projet.zones) || !Array.isArray(projet.enceintes)) {
    return 'projetVide'
  }
  if (projet.version > VERSION_FORMAT) {
    return (
      `Ce projet a été enregistré par une version plus récente d'Acustika ` +
      `(format ${projet.version}, cette version lit jusqu'au ${VERSION_FORMAT}). ` +
      'Mettez à jour Acustika pour l’ouvrir sans risque de perdre des données.'
    )
  }
  return null
}

export function lireProjet(chemin: string): Projet {
  let brut: unknown
  try {
    brut = JSON.parse(readFileSync(chemin, 'utf-8'))
  } catch {
    throw new Error('projetIllisible')
  }

  const projet = brut as Projet
  const erreur = valider(projet)
  if (erreur) throw new Error(erreur)

  // Les champs ajoutés après coup reçoivent une valeur : un projet ancien
  // s'ouvre toujours, il ne se refuse jamais pour un champ manquant.
  //
  // **La salle est fusionnée à part, et il le faut.** Une fusion superficielle
  // remplace l'objet entier : un projet enregistré par une version qui ne
  // connaissait pas encore `spectateurs` aurait une salle sans ce champ, et le
  // calcul lirait `undefined` — soit une absorption NaN qui contamine tout,
  // silencieusement. Ce n'est pas une hypothèse : c'est ce que fait le spread.
  return {
    ...projetVide(),
    ...projet,
    salle: { ...salleVide()!, ...(projet.salle ?? {}) },
    version: VERSION_FORMAT
  }
}

export function ecrireProjet(chemin: string, projet: Projet): void {
  writeFileSync(chemin, JSON.stringify({ ...projet, version: VERSION_FORMAT }, null, 2), 'utf-8')
}
