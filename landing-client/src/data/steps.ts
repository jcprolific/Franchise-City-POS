export interface Step {
  number: number;
  title: string;
  description: string;
}

export const steps: Step[] = [
  { number: 1, title: 'Choose Your Brand',  description: 'Browse our portfolio and pick the brand that matches your vision and budget.' },
  { number: 2, title: 'Apply Online',       description: 'Fill out our franchise inquiry form and our team will reach out within 24–48 hours.' },
  { number: 3, title: 'Launch Your Store',  description: 'We handle training, setup support, and supply chain so you can open with confidence.' },
];
