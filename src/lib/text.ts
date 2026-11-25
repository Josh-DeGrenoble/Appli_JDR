// Petits outils de texte partagés.

/** Clé de recherche : sans accents, en minuscules, sans espaces autour (« Épée » → « epee »). */
export const searchKey = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
