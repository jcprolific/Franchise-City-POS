export interface Testimonial {
  quote: string;
  name: string;
  location: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  { quote: 'Franchise City made it so easy to get started. Within 3 months, my La Lemon branch was already profitable!', name: 'Maria T.', location: 'Quezon City', initials: 'MT' },
  { quote: 'The support team is always there. Best decision I made was franchising cof/tea cafe.', name: 'James R.', location: 'Cebu', initials: 'JR' },
  { quote: 'I had zero business experience. Franchise City guided me through everything.', name: 'Ana L.', location: 'Davao', initials: 'AL' },
];
