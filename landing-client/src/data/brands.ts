export interface Brand {
  slug: 'cof-tea' | 'la-lemon' | 'keki' | 'm3ow-m3ow';
  name: string;
  tagline: string;
  logo: string;
}

export const brands: Brand[] = [
  { slug: 'cof-tea',   name: 'cof/tea cafe',        tagline: "TARA! Let's Build Your Own Cafe!",                    logo: '/brands/coftea.png' },
  { slug: 'la-lemon',  name: 'La Lemon',            tagline: 'When life gives you lemon, squeeze it with La Lemon.', logo: '/brands/la-lemon.png' },
  { slug: 'keki',      name: 'KēKi Japanese Cake',  tagline: 'Delight in every bite.',                              logo: '/brands/keki.png' },
  { slug: 'm3ow-m3ow', name: 'm3ow m3ow',           tagline: 'A big scoop of happiness.',                           logo: '/brands/m3ow-m3ow.png' },
];
