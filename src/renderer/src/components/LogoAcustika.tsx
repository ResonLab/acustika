interface Props {
  taille?: number
}

/**
 * Logo Acustika : une enceinte vue de côté et le front d'onde qui s'en va,
 * inscrit dans l'écusson arrondi de la maison.
 *
 * **Il n'existait pas.** L'en-tête affichait une pastille de couleur et le nom
 * en gras — défaut signalé par l'utilisateur. C'est exactement ce qui manquait à
 * Scenika avant `LogoScenika`, et pour la même raison : ce n'était pas un
 * affichage cassé, c'était une pièce jamais écrite. Acustika était la dernière
 * des cinq à ne pas porter sa marque.
 *
 * **Le dessin est repris de `Identite/acustika.svg`, trait pour trait.** Il
 * n'est pas redessiné ici : les cinq marques partagent le même écusson, le même
 * trait sombre et les mêmes nœuds de circuit, et un dessin recopié de mémoire
 * aurait divergé au premier ajustement. Seuls le dégradé et le glyphe changent
 * d'une marque à l'autre — c'est ce qui fait qu'on les reconnaît comme une
 * famille.
 *
 * L'identifiant du dégradé est préfixé par le nom de la marque : deux SVG
 * affichés sur la même page qui déclareraient `fond` chacun de leur côté se
 * voleraient leur couleur, et le second prendrait celle du premier sans que
 * rien ne le signale.
 */
export default function LogoAcustika({ taille = 32 }: Props): React.JSX.Element {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="acustika-fond"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B58CFF" />
          <stop offset="1" stopColor="#6D4AE0" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#acustika-fond)" />

      {/* La source : l'enceinte, vue de côté. */}
      <path d="M18 26v12" stroke="#1B0B3D" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M18 27l7-5v20l-7-5" stroke="#1B0B3D" strokeWidth="4.2" strokeLinejoin="round" />

      {/* Le front d'onde qui se propage : trois arcs, de plus en plus larges. */}
      <path d="M31 25c3.5 4 3.5 10 0 14" stroke="#1B0B3D" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M38 20c6 7 6 17 0 24" stroke="#1B0B3D" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M45 15c8.5 10 8.5 24 0 34" stroke="#1B0B3D" strokeWidth="3.8" strokeLinecap="round" />

      {/* Signature de famille : les nœuds de circuit. */}
      <circle cx="12" cy="16" r="2.4" fill="#1B0B3D" />
      <path d="M12 16h4" stroke="#1B0B3D" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
