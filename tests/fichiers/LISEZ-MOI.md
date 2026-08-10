# Fichiers CLF d'essai

Deux vrais fichiers, fournis le 10 août 2026. Ils existent pour une seule
raison : **ne pas écrire le lecteur CLF en devinant.**

| Fichier | Format | Ce qu'il contient |
|---|---|---|
| `cls-3300.CF1` | CF1 — 34 812 octets | ETC / CES Audio « CLS-3300 », Column Loudspeaker |
| `Coax8.CF2` | CF2 — 334 040 octets | une enceinte coaxiale |

## Ce qui a été établi en les lisant

- `v1.0e` à l'offset 20, puis un marqueur `AD BA`.
- **Le premier octet distingue les deux formats** : `0x40` pour CF1, `0x41`
  pour CF2.
- Les métadonnées sont en clair : fabricant, modèle, type, dates,
  « Anechoic to 40ms », « Normalized to 1 meter ».
- De longues suites de flottants little-endian ressemblent à des dB :
  `-10,1 · -8,8 · -8,4 · -9,5 · -11,0 · -12,3…` — progression douce, pas du bruit.

## Ce qui manque, et pourquoi on s'arrête là

La carte qui dit **quelle suite correspond à quelle bande et à quel angle**.
Chaînes et tableaux s'entremêlent comme les champs d'une structure C.

La chaîne est : fichier → directivité → carte de couverture → **conseil de
placement**. Un octet mal interprété, et Acustika conseille un placement faux
avec une explication parfaitement articulée. `commun/polaire.js` refuse donc un
binaire plutôt que de le lire de travers.

## Comment débloquer

1. **Des fichiers `.CIF`** — CLF Authoring travaille à partir d'eux et les
   compile en CF1/CF2. **Ils sont en texte** : lisibles sans rien deviner.
2. **Vérifier contre CLF Viewer** : ouvrir `cls-3300.CF1` et relever deux ou
   trois valeurs — « à 1 kHz, −6 dB vers 45° ». Cela transforme une hypothèse de
   lecture en certitude.

Les deux outils sont gratuits sur <https://clfgroup.org>.
