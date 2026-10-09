import type { IconName } from '@/src/components/ui';

export type Option = { label: string; icon?: IconName; emoji?: string; value?: string };
export type OptionGroup = { title?: string; options: Option[] };

export const START: Option[] = [
  { icon: 'rocket', label: 'Start a new business for me', value: 'new' },
  { icon: 'storefront', label: 'Help me sell what I already have', value: 'existing' },
];

export const PRODUCT: OptionGroup[] = [
  {
    options: [
      { icon: 'color-wand', label: 'Handmade things' },
      { icon: 'pizza', label: 'Food & baked goods' },
      { icon: 'shirt', label: 'Clothes & accessories' },
      { icon: 'book', label: 'Books & used items' },
      { icon: 'construct', label: 'A service I do' },
      { icon: 'desktop', label: 'Something digital' },
      { icon: 'brush', label: 'Beauty & cosmetics' },
      { icon: 'leaf', label: 'Plants & flowers' },
      { icon: 'gift', label: 'Gifts & decor' },
      { icon: 'phone-portrait', label: 'Electronics' },
    ],
  },
];

export function budgetOptions(inGeorgia: boolean): Option[] {
  const m = (n: number) => (inGeorgia ? `${n}₾` : `$${n}`);
  return [
    { icon: 'hand-left', label: 'Nothing — start from zero' },
    { icon: 'cash', label: `Up to ${m(50)}` },
    { icon: 'wallet', label: `${m(50)}–${m(200)}` },
    { icon: 'briefcase', label: `${m(200)}–${m(500)}` },
    { icon: 'trending-up', label: `${m(500)}+` },
  ];
}

export const ASSETS: OptionGroup[] = [
  {
    title: 'Tech',
    options: [
      { icon: 'phone-portrait', label: 'Smartphone' },
      { icon: 'laptop', label: 'Laptop' },
      { icon: 'desktop', label: 'Powerful PC' },
      { icon: 'tablet-portrait', label: 'Tablet' },
      { icon: 'aperture', label: 'Good camera' },
      { icon: 'videocam', label: 'Drone' },
      { icon: 'mic', label: 'Mic & audio gear' },
      { icon: 'volume-high', label: 'Speakers / DJ gear' },
      { icon: 'tv', label: 'Projector' },
      { icon: 'print', label: 'Printer' },
      { icon: 'cube', label: '3D printer' },
      { icon: 'game-controller', label: 'Gaming setup' },
    ],
  },
  {
    title: 'Getting around',
    options: [
      { icon: 'car-sport', label: 'Car' },
      { icon: 'bus', label: 'Van or truck' },
      { icon: 'speedometer', label: 'Motorbike' },
      { icon: 'bicycle', label: 'Bike or scooter' },
      { icon: 'card', label: 'Driving license' },
    ],
  },
  {
    title: 'Home & kitchen',
    options: [
      { icon: 'restaurant', label: 'Kitchen' },
      { icon: 'flame', label: 'Oven & baking gear' },
      { icon: 'snow', label: 'Big freezer' },
      { icon: 'water', label: 'Washing machine' },
      { icon: 'sparkles', label: 'Cleaning gear' },
      { icon: 'cut', label: 'Sewing machine' },
    ],
  },
  {
    title: 'Tools & gear',
    options: [
      { icon: 'hammer', label: 'Tools' },
      { icon: 'construct', label: 'Power tools' },
      { icon: 'leaf', label: 'Lawn mower & garden tools' },
      { icon: 'color-palette', label: 'Art & craft supplies' },
      { icon: 'musical-notes', label: 'Instrument' },
      { icon: 'barbell', label: 'Sports gear' },
      { icon: 'bonfire', label: 'Camping gear' },
      { icon: 'balloon', label: 'Party & event supplies' },
    ],
  },
  {
    title: 'Space & property',
    options: [
      { icon: 'home', label: 'Spare room' },
      { icon: 'bed', label: 'Apartment to rent out' },
      { icon: 'cube', label: 'Garage / storage' },
      { icon: 'car', label: 'Parking spot' },
      { icon: 'leaf', label: 'Garden or yard' },
      { icon: 'sunny', label: 'Balcony or rooftop' },
      { icon: 'map', label: 'Land or a plot' },
      { icon: 'trail-sign', label: 'Country / summer house' },
      { icon: 'storefront', label: 'Shop or stall space' },
    ],
  },
  {
    title: 'Things to sell',
    options: [
      { icon: 'shirt', label: 'Clothes I don’t wear' },
      { icon: 'book', label: 'Books' },
      { icon: 'albums', label: 'Furniture' },
      { icon: 'phone-portrait-outline', label: 'Old electronics' },
      { icon: 'gift', label: 'Kids’ toys & clothes' },
      { icon: 'diamond', label: 'Collectibles & vintage' },
      { icon: 'nutrition', label: 'Fruit, veg or honey I grow' },
    ],
  },
  {
    title: 'Animals',
    options: [
      { icon: 'paw', label: 'Pets' },
      { icon: 'egg', label: 'Chickens or farm animals' },
      { icon: 'flower', label: 'Beehives' },
    ],
  },
  {
    title: 'Papers & experience',
    options: [
      { icon: 'school', label: 'University degree' },
      { icon: 'ribbon', label: 'Professional certificate' },
      { icon: 'medkit', label: 'Medical or care training' },
      { icon: 'briefcase', label: 'Years in a trade or job' },
      { icon: 'document-text', label: 'Registered business / IE' },
    ],
  },
  {
    title: 'People & time',
    options: [
      { icon: 'logo-instagram', label: 'Social media followers' },
      { icon: 'people', label: 'Lots of friends & contacts' },
      { icon: 'business', label: 'Local business contacts' },
      { icon: 'person-add', label: 'Clients from a past job' },
      { icon: 'people-circle', label: 'Family who can help' },
      { icon: 'time', label: 'Free time every day' },
      { icon: 'moon', label: 'Evenings & weekends' },
    ],
  },
];

/** What most people have; the rest stays behind "Show more". */
export const ASSETS_FEATURED = [
  'Smartphone',
  'Laptop',
  'Car',
  'Kitchen',
  'Tools',
  'Spare room',
  'Social media followers',
  'Free time every day',
];

export const LANGUAGES_FEATURED = ['Georgian', 'English', 'Russian', 'Turkish', 'Armenian', 'Azerbaijani'];

export const SKILLS: OptionGroup[] = [
  {
    title: 'Online',
    options: [
      { icon: 'code-slash', label: 'Vibe coding' },
      { icon: 'film', label: 'Video editing' },
      { icon: 'logo-instagram', label: 'Social media' },
      { icon: 'color-palette', label: 'Graphic design' },
      { icon: 'globe', label: 'Making websites' },
      { icon: 'sparkles', label: 'AI tools' },
      { icon: 'create', label: 'Writing & copy' },
      { icon: 'language', label: 'Translation' },
      { icon: 'school', label: 'Online tutoring' },
      { icon: 'headset', label: 'Customer support' },
      { icon: 'grid', label: 'Excel & data' },
      { icon: 'mic', label: 'Voice-over' },
      { icon: 'musical-notes', label: 'Music production' },
      { icon: 'game-controller', label: 'Gaming & streaming' },
      { icon: 'camera', label: 'Photography' },
    ],
  },
  {
    title: 'Hands-on',
    options: [
      { icon: 'restaurant', label: 'Cooking & baking' },
      { icon: 'construct', label: 'Fixing things' },
      { icon: 'water', label: 'Cleaning' },
      { icon: 'color-wand', label: 'Crafts & handmade' },
      { icon: 'brush', label: 'Beauty & nails' },
      { icon: 'cut', label: 'Hair' },
      { icon: 'leaf', label: 'Gardening' },
      { icon: 'fitness', label: 'Physical work' },
      { icon: 'car', label: 'Driving & delivery' },
      { icon: 'hardware-chip', label: 'Phone & PC repair' },
    ],
  },
  {
    title: 'With people',
    options: [
      { icon: 'chatbubbles', label: 'Talking to people' },
      { icon: 'cash', label: 'Selling' },
      { icon: 'book', label: 'Teaching' },
      { icon: 'happy', label: 'Kids' },
      { icon: 'paw', label: 'Pets' },
      { icon: 'barbell', label: 'Fitness coaching' },
      { icon: 'balloon', label: 'Event planning' },
      { icon: 'airplane', label: 'Tourism & guiding' },
    ],
  },
];

export const LANGUAGES: OptionGroup[] = [
  {
    options: [
      { emoji: '🇬🇪', label: 'Georgian' },
      { emoji: '🇬🇧', label: 'English' },
      { emoji: '🇷🇺', label: 'Russian' },
      { emoji: '🇹🇷', label: 'Turkish' },
      { emoji: '🇦🇲', label: 'Armenian' },
      { emoji: '🇦🇿', label: 'Azerbaijani' },
      { emoji: '🇺🇦', label: 'Ukrainian' },
      { emoji: '🇩🇪', label: 'German' },
      { emoji: '🇫🇷', label: 'French' },
      { emoji: '🇪🇸', label: 'Spanish' },
      { emoji: '🇮🇹', label: 'Italian' },
      { emoji: '🇸🇦', label: 'Arabic' },
    ],
  },
];

export const WORK_STYLE: Option[] = [
  { icon: 'walk', label: 'Out and about, with people' },
  { icon: 'home', label: 'From home' },
  { icon: 'globe', label: 'Online only' },
  { icon: 'shuffle', label: 'Anything works' },
];
