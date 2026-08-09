import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { cheminBibliotheque } from '../contexte'
import { BANDES_OCTAVE } from '../../../commun/acoustique.js'
import type { ModeleEnceinte } from '../../partage/types'

/**
 * La bibliothèque d'enceintes — le « stock » où l'on choisit avant de placer.
 *
 * Rangée dans un simple JSON : elle appartient à l'application, pas aux
 * projets, et elle est assez petite pour qu'une base de données soit du luxe.
 * Un fichier lisible se répare à la main et se recopie d'un poste à l'autre.
 *
 * **Ces enceintes ne sont pas des modèles du commerce.** Ce sont des gabarits
 * génériques, des points de départ à corriger avec la fiche technique réelle —
 * même principe que les profils pays d'Ohmnia, qui disent eux aussi qu'ils sont
 * indicatifs. Annoncer une directivité de constructeur qu'on n'a pas mesurée
 * serait pire qu'utile : ça donnerait de faux placements avec l'air d'être sûr.
 */

function gabarit(
  nom: string,
  niveau1m: number,
  ouvertureAigu: number,
  source: string
): ModeleEnceinte {
  // L'ouverture s'élargit dans le grave : une enceinte devient quasi
  // omnidirectionnelle en bas du spectre. On modélise cet élargissement plutôt
  // que de répéter la valeur de l'aigu, qui serait franchement faux.
  const ouverture: Record<number, number> = {}
  for (const bande of BANDES_OCTAVE) {
    const octavesSous1k = Math.max(0, Math.log2(1000 / bande))
    ouverture[bande] = Math.min(360, Math.round(ouvertureAigu * (1 + 0.35 * octavesSous1k)))
  }
  return { id: randomUUID(), nom, marque: '', niveau1m, ouverture, source }
}

/** Quelques gabarits pour ne pas démarrer devant une liste vide. */
function bibliothequeParDefaut(): ModeleEnceinte[] {
  return [
    gabarit('Enceinte large 90°', 96, 90, 'Gabarit générique — à corriger'),
    gabarit('Enceinte serrée 60°', 99, 60, 'Gabarit générique — à corriger'),
    gabarit('Élément de line array 100°', 100, 100, 'Gabarit générique — à corriger'),
    gabarit('Rappel compact 110°', 92, 110, 'Gabarit générique — à corriger')
  ]
}

export function listerEnceintes(): ModeleEnceinte[] {
  const chemin = cheminBibliotheque()
  if (!existsSync(chemin)) {
    const defaut = bibliothequeParDefaut()
    writeFileSync(chemin, JSON.stringify(defaut, null, 2), 'utf-8')
    return defaut
  }

  try {
    const lues = JSON.parse(readFileSync(chemin, 'utf-8'))
    return Array.isArray(lues) ? (lues as ModeleEnceinte[]) : []
  } catch {
    // Un fichier abîmé ne doit pas empêcher l'application de démarrer : mieux
    // vaut une bibliothèque vide qu'un écran noir.
    return []
  }
}

function ecrire(enceintes: ModeleEnceinte[]): void {
  writeFileSync(cheminBibliotheque(), JSON.stringify(enceintes, null, 2), 'utf-8')
}

function valider(enceinte: Omit<ModeleEnceinte, 'id'>): string | null {
  if (!enceinte.nom.trim()) return 'Le nom est obligatoire.'
  if (!Number.isFinite(enceinte.niveau1m)) return 'Le niveau à 1 m doit être un nombre.'
  if (enceinte.niveau1m < 60 || enceinte.niveau1m > 150) {
    return 'Le niveau à 1 m doit être compris entre 60 et 150 dB.'
  }
  for (const bande of BANDES_OCTAVE) {
    const ouverture = enceinte.ouverture[bande]
    if (!Number.isFinite(ouverture) || ouverture <= 0 || ouverture > 360) {
      return `L'ouverture à ${bande} Hz doit être comprise entre 1 et 360 degrés.`
    }
  }
  return null
}

export function ajouterEnceinte(enceinte: Omit<ModeleEnceinte, 'id'>): ModeleEnceinte {
  const erreur = valider(enceinte)
  if (erreur) throw new Error(erreur)

  const ajoutee: ModeleEnceinte = { ...enceinte, id: randomUUID() }
  ecrire([...listerEnceintes(), ajoutee])
  return ajoutee
}

export function modifierEnceinte(enceinte: ModeleEnceinte): ModeleEnceinte {
  const erreur = valider(enceinte)
  if (erreur) throw new Error(erreur)

  const enceintes = listerEnceintes().map((e) => (e.id === enceinte.id ? enceinte : e))
  ecrire(enceintes)
  return enceinte
}

export function supprimerEnceinte(id: string): void {
  ecrire(listerEnceintes().filter((e) => e.id !== id))
}

/**
 * Importe des enceintes depuis un CSV.
 *
 * Le CSV est le filet prévu par CONTEXTE.md : quand aucun fichier CLF n'est
 * disponible, on saisit les données à la main. Format attendu, une enceinte par
 * ligne, séparateur point-virgule ou virgule :
 *
 *   nom;marque;niveau1m;125;250;500;1000;2000;4000;8000
 *
 * Les colonnes de bandes portent l'ouverture à −6 dB en degrés. Une ligne
 * d'en-tête est reconnue et ignorée.
 */
export function importerCsv(contenu: string): { ajoutees: number; erreurs: string[] } {
  const lignes = contenu
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')

  const erreurs: string[] = []
  const aAjouter: Omit<ModeleEnceinte, 'id'>[] = []

  for (const [index, ligne] of lignes.entries()) {
    const separateur = (ligne.match(/;/g)?.length ?? 0) >= (ligne.match(/,/g)?.length ?? 0) ? ';' : ','
    const champs = ligne.split(separateur).map((c) => c.trim())

    // Une ligne d'en-tête n'a pas de nombre en troisième colonne.
    if (index === 0 && !Number.isFinite(Number(champs[2]))) continue

    if (champs.length < 3 + BANDES_OCTAVE.length) {
      erreurs.push(`Ligne ${index + 1} : ${champs.length} colonnes au lieu de 10.`)
      continue
    }

    const ouverture: Record<number, number> = {}
    BANDES_OCTAVE.forEach((bande, position) => {
      ouverture[bande] = Number(champs[3 + position])
    })

    const enceinte = {
      nom: champs[0],
      marque: champs[1],
      niveau1m: Number(champs[2]),
      ouverture,
      source: 'Importé depuis un CSV'
    }

    const erreur = valider(enceinte)
    if (erreur) {
      erreurs.push(`Ligne ${index + 1} : ${erreur}`)
      continue
    }
    aAjouter.push(enceinte)
  }

  // Rien n'est écrit tant qu'on n'a pas tout lu : un import à moitié fait
  // laisserait une bibliothèque dans un état que personne ne comprend.
  const enceintes = listerEnceintes()
  for (const enceinte of aAjouter) enceintes.push({ ...enceinte, id: randomUUID() })
  if (aAjouter.length > 0) ecrire(enceintes)

  return { ajoutees: aAjouter.length, erreurs }
}
