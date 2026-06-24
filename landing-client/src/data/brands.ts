export interface Brand {
  slug: 'cof-tea' | 'la-lemon' | 'keki' | 'm3ow-m3ow';
  name: string;
  tagline: string;
  initials: string;
  swatch: string;
}

export const brands: Brand[] = [
  { slug: 'cof-tea',   name: 'cof/tea cafe',        tagline: "TARA! Let's Build Your Own Cafe!",            initials: 'c/t', swatch: '#f7eec9' },
  { slug: 'la-lemon',  name: 'La Lemon',            tagline: 'When life gives you lemon, squeeze it with La Lemon.', initials: 'LL', swatch: '#e6f0cf' },
  { slug: 'keki',      name: 'KēKi Japanese Cake',  tagline: 'Delight in every bite.',                      initials: 'Kē',  swatch: '#fbdfe6' },
  { slug: 'm3ow-m3ow', name: 'm3ow m3ow',           tagline: 'A big scoop of happiness.',                   initials: 'm3',  swatch: '#f7eec9' },
];
