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

export function projetVide(): Projet {
  return {
    nom: 'Nouveau projet',
    largeur: 20,
    profondeur: 30,
    zones: [],
    enceintes: [],
    bande: 1000,
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
  return { ...projetVide(), ...projet, version: VERSION_FORMAT }
}

export function ecrireProjet(chemin: string, projet: Projet): void {
  writeFileSync(chemin, JSON.stringify({ ...projet, version: VERSION_FORMAT }, null, 2), 'utf-8')
}
