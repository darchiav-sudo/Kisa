/** Server-side launch catalog mirrors the mobile app catalogs for ranking responses. */

export type LaunchSummary = {
  id: string;
  mode: 'money' | 'business';
  rank: number;
  isPrimary: boolean;
  title: string;
  kicker: string;
  summary: string;
  locationLabel: string;
};

export const moneyLaunches: LaunchSummary[] = [
  {
    id: 'leaf-cleanup-ne-philly',
    mode: 'money',
    rank: 1,
    isPrimary: true,
    title: 'FRONT YARD LEAF RESET → $49',
    kicker: '$200 → local service · no spend before signal',
    summary: 'Prove demand first. Book a lead, then buy only the small starter kit.',
    locationLabel: 'Northeast Philadelphia',
  },
  {
    id: 'philly-free-resell',
    mode: 'money',
    rank: 2,
    isPrimary: false,
    title: '$0 → FIRST RESELL',
    kicker: 'Free local item → resell',
    summary: 'Claim a free item, clean it, flip same day.',
    locationLabel: 'Philadelphia',
  },
  {
    id: 'philly-connect-earn',
    mode: 'money',
    rank: 3,
    isPrimary: false,
    title: 'CONNECT & EARN',
    kicker: 'Referral · customer ↔ provider',
    summary: 'Match a neighbor need with a trusted provider.',
    locationLabel: 'Northeast Philadelphia',
  },
  {
    id: 'philly-box-flip',
    mode: 'money',
    rank: 4,
    isPrimary: false,
    title: 'FREE BOXES → $25 BUNDLE',
    kicker: 'Zero-cost microbusiness',
    summary: 'Collect free moving boxes and sell a clean bundle.',
    locationLabel: 'Northeast Philadelphia',
  },
  {
    id: 'philly-10-photos',
    mode: 'money',
    rank: 5,
    isPrimary: false,
    title: '10 PHOTOS → $49',
    kicker: 'Phone-only microservice',
    summary: 'Offer 10 smartphone product photos for local sellers.',
    locationLabel: 'Northeast Philadelphia',
  },
];

export const businessLaunches: LaunchSummary[] = [
  {
    id: 'books-48h-drop-tbilisi',
    mode: 'business',
    rank: 1,
    isPrimary: true,
    title: '48H BOOK DROP',
    kicker: 'Sell what you already have · 0 GEL ads',
    summary: 'One scarce 2-book bundle for 49₾ via your audience.',
    locationLabel: 'Tbilisi, Georgia',
  },
  {
    id: 'books-micro-affiliates',
    mode: 'business',
    rank: 2,
    isPrimary: false,
    title: '20 MICRO-AFFILIATES',
    kicker: 'Pay only after a sale',
    summary: 'Pitch creators a commission only on paid orders.',
    locationLabel: 'Tbilisi · remote',
  },
  {
    id: 'books-mymarket',
    mode: 'business',
    rank: 3,
    isPrimary: false,
    title: 'MYMARKET LISTING',
    kicker: 'Catch existing demand',
    summary: 'List the bundle on MyMarket with direct chat.',
    locationLabel: 'Tbilisi',
  },
  {
    id: 'books-bookstore-partners',
    mode: 'business',
    rank: 4,
    isPrimary: false,
    title: 'BOOKSTORE PARTNERS',
    kicker: 'Meet buyers where they already are',
    summary: 'Tiny test lots for independent bookstores.',
    locationLabel: 'Tbilisi',
  },
];
