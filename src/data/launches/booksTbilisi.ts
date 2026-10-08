import type { Launch } from '@/src/models/types';

const STORY_GEO = `📚 48 საათით ვაკეთებ სპეციალურ წიგნების პაკეტს.

აირჩიე 2 წიგნი — პაკეტის ფასი: 49₾.
თბილისში შესაძლებელია მიტანა.

თუ გინდა, მომწერე სიტყვა „წიგნი“ პირადში და გამოგიგზავნი არჩევანს.

⏳ შეთავაზება მოქმედებს 48 საათი.`;

const DM_GEO = `გამარჯობა ❤️
კი, პაკეტი ჯერ კიდევ ხელმისაწვდომია.

აირჩიე ერთ-ერთი:
1) [წიგნი A] + [წიგნი B]
2) [წიგნი A] + [წიგნი C]
3) [წიგნი B] + [წიგნი C]

ფასი: 49₾.
მიტანა შესაძლებელია თბილისში.

რომელი ვარიანტი გინდა?`;

const REF_GEO = `თუ გყავს მეგობარი, ვისაც მსგავსი წიგნები უყვარს, უბრალოდ გაუგზავნე ეს მესიჯი ❤️
„ვაკოს წიგნების 48-საათიანი პაკეტია — თუ გინდა, მოგცემ კონტაქტს.“`;

const AFF_GEO = `გამარჯობა 👋
მაქვს წიგნები, რომლებიც იყიდება საქართველოში და მინდა მარტივი პარტნიორობა შემოგთავაზო.

შენ დებ ერთ Story/Post-ს შენი უნიკალური კოდით.
ყოველ რეალურ გაყიდვაზე იღებ ___₾.
წინასწარ არაფერს იხდი და არც მე გთხოვ რეკლამის ყიდვას — ან იყიდება და ორივე ვიღებთ თანხას, ან არაფერი ხდება.

თუ საინტერესოა, გამოგიგზავნი წიგნებს, ფასს და მზა ტექსტსაც.`;

const MARKET_GEO = `ვაკო დარჩიას წიგნების ნაკრები — ახალი

📚 [წიგნი A] + [წიგნი B]
ფასი: 49₾

ახალი წიგნები.
შესაძლებელია მიწოდება თბილისში.
შეკვეთისთვის მომწერეთ ჩატში.`;

const SHOP_GEO = `გამარჯობა.
მე ვარ ავტორი და ჩემი წიგნები უკვე იყიდება საქართველოში.

მინდა შემოგთავაზოთ ძალიან პატარა სატესტო პარტია — 5–10 წიგნი.
შეგვიძლია გავაკეთოთ ან საბითუმო ფასი, ან ანგარიშსწორება მხოლოდ რეალურად გაყიდულ წიგნებზე.

თუ საინტერესოა, გამოგიგზავნით სათაურებს, ფასებს და ფოტოებს.`;

export const bookDropLaunch: Launch = {
  id: 'books-48h-drop-tbilisi',
  mode: 'business',
  rank: 1,
  isPrimary: true,
  title: '48H BOOK DROP',
  kicker: 'Sell what you already have · 0 GEL ads',
  summary:
    'One scarce bundle: pick any 2 books for 49₾ with Tbilisi delivery. Publish to your audience — not a full catalog.',
  tags: ['⚡ primary', '0 GEL ads', 'remote-friendly', 'scarcity'],
  locationLabel: 'Tbilisi, Georgia',
  economics: {
    currency: 'GEL',
    offerPrice: 49,
    offerLabel: '49₾ · 2-book bundle',
    targetUnits: 10,
    adSpend: 0,
    notes: [
      'Goal revenue: 490 GEL at 10 sales (not a guarantee).',
      'Buyer pays delivery. You can run this remotely from the US.',
    ],
  },
  evidence: [
    {
      id: 'audience',
      title: 'Existing audience',
      detail: 'You already have people who know you — one Story/Reel beats building a storefront first.',
    },
    {
      id: 'scarcity',
      title: '48-hour window',
      detail: 'Limited drop creates a clear CTA: reply “წიგნი” — no browsing 15 titles.',
    },
    {
      id: 'fulfillment',
      title: 'Local fulfillment',
      detail: 'Inventory stays in Tbilisi. Same-day courier options exist across all 10 districts.',
      sourceLabel: 'Postman same-day Tbilisi',
    },
  ],
  steps: [
    {
      id: 'create-offer',
      kind: 'offer',
      title: 'Create ONE offer',
      description:
        'Example: “pick any 2 books” or a 3-book theme set. Do not show the buyer 15 options at once.',
      actions: [{ id: 'offer-ready', type: 'approve', label: 'Offer ready', primary: true }],
    },
    {
      id: 'publish-story',
      kind: 'script',
      title: 'Publish one Story / Reel / post',
      description: 'One CTA. They do not visit a site. They DM one word.',
      script: STORY_GEO,
      actions: [
        { id: 'copy-story', type: 'copy', label: 'Copy Georgian text', copyText: STORY_GEO },
        {
          id: 'sim-pub-story',
          type: 'simulate_publish',
          label: 'Simulate publish',
          primary: true,
        },
      ],
    },
    {
      id: 'wait-dms',
      kind: 'wait',
      title: 'Waiting for “წიგნი” replies',
      description: 'Demo will simulate the first DM lead.',
      autoAdvanceMs: 1600,
      actions: [{ id: 'wait-dms-go', type: 'simulate_wait', label: 'Simulate wait', primary: true }],
    },
    {
      id: 'lead-dm',
      kind: 'lead',
      title: 'DM received',
      description: 'Nino: “წიგნი” — ready for the bundle menu.',
      actions: [{ id: 'open-dm-lead', type: 'simulate_lead', label: 'Open DM', primary: true }],
    },
    {
      id: 'send-dm',
      kind: 'script',
      title: 'Send the ready DM',
      description: 'Show at most 3 bundle options. Then name, phone, address, payment.',
      script: DM_GEO,
      actions: [
        { id: 'copy-dm', type: 'copy', label: 'Copy DM', copyText: DM_GEO },
        { id: 'dm-sent', type: 'approve', label: 'DM sent', primary: true },
      ],
    },
    {
      id: 'fulfillment',
      kind: 'fulfillment',
      title: 'Hand off Tbilisi delivery',
      description:
        'Postman lists same-day delivery across all 10 Tbilisi districts; base cutoff often 13:00. Pass paid orders to your local picker.',
      channels: [
        {
          id: 'postman',
          name: 'Postman same-day Tbilisi',
          kind: 'delivery',
          url: 'https://postmandelivery.ge/en/services/same-day-delivery-tbilisi',
        },
      ],
      actions: [
        {
          id: 'open-postman',
          type: 'open_link',
          label: 'Open same-day delivery',
          url: 'https://postmandelivery.ge/en/services/same-day-delivery-tbilisi',
        },
        { id: 'fulfill-ok', type: 'mark_done', label: 'Fulfillment ready', primary: true },
      ],
    },
    {
      id: 'payment-books',
      kind: 'payment',
      title: 'First sale locked',
      description: 'Simulate collecting 49₾ for the first bundle, then ask for one referral.',
      script: REF_GEO,
      actions: [
        { id: 'copy-ref-geo', type: 'copy', label: 'Copy referral', copyText: REF_GEO },
        {
          id: 'paid-49',
          type: 'collect_payment',
          label: 'Payment received · 49₾',
          earningAmount: 49,
          primary: true,
        },
      ],
    },
    {
      id: 'repeat-books',
      kind: 'repeat',
      title: 'Keep the drop alive',
      description: 'Reply to more DMs, or switch to another zero-ad channel from your launch list.',
      actions: [
        { id: 'repeat-drop', type: 'repeat', label: 'Run drop again', primary: true },
        { id: 'other-channels', type: 'approve', label: 'See other channels' },
      ],
    },
  ],
};

export const microAffiliatesLaunch: Launch = {
  id: 'books-micro-affiliates',
  mode: 'business',
  rank: 2,
  isPrimary: false,
  title: '20 MICRO-AFFILIATES',
  kicker: 'Pay only after a sale',
  summary:
    'Pitch small Georgian psychology / book pages a fixed commission per paid order. Zero upfront ad spend.',
  tags: ['0 upfront', 'online', 'scales'],
  locationLabel: 'Tbilisi · remote',
  economics: {
    currency: 'GEL',
    offerPrice: 49,
    offerLabel: '49₾ product · 10₾ commission example',
    targetUnits: 10,
    adSpend: 0,
    notes: ['After commissions example: 390 GEL before COGS/delivery — illustrative only.'],
  },
  evidence: [
    {
      id: 'perf',
      title: 'Performance-only cost',
      detail: 'Partners post with a unique code. You pay only on real sales.',
    },
  ],
  steps: [
    {
      id: 'aff-script',
      kind: 'script',
      title: 'Partner DM ready',
      description: 'Send to small creators. Fill in commission before sending live.',
      script: AFF_GEO,
      actions: [
        { id: 'copy-aff', type: 'copy', label: 'Copy partner DM', copyText: AFF_GEO },
        { id: 'aff-sent', type: 'simulate_publish', label: 'Simulate outreach', primary: true },
      ],
    },
    {
      id: 'aff-done',
      kind: 'repeat',
      title: 'Outreach queued',
      description: 'Track replies. On a sale, pay the agreed commission and reuse the winner.',
      actions: [{ id: 'aff-back', type: 'approve', label: 'Back to launches', primary: true }],
    },
  ],
};

export const myMarketLaunch: Launch = {
  id: 'books-mymarket',
  mode: 'business',
  rank: 3,
  isPrimary: false,
  title: 'MYMARKET LISTING',
  kicker: 'Catch existing demand',
  summary: 'List the bundle on MyMarket as a digital storefront with direct buyer chat.',
  tags: ['marketplace', '0 GEL ads'],
  locationLabel: 'Tbilisi',
  economics: {
    currency: 'GEL',
    offerPrice: 49,
    offerLabel: '49₾ bundle listing',
    adSpend: 0,
    notes: ['Marketplace fees may apply — verify before going live.'],
  },
  evidence: [
    {
      id: 'mm',
      title: 'Existing shoppers',
      detail: 'MyMarket supports new goods, storefronts, and direct buyer contact.',
    },
  ],
  steps: [
    {
      id: 'mm-copy',
      kind: 'script',
      title: 'Listing copy ready',
      description: 'One bundle listing beats dumping every title.',
      script: MARKET_GEO,
      channels: [{ id: 'mm', name: 'MyMarket', kind: 'marketplace', url: 'https://mymarket.ge/' }],
      actions: [
        { id: 'copy-mm', type: 'copy', label: 'Copy listing', copyText: MARKET_GEO },
        {
          id: 'open-mm',
          type: 'open_link',
          label: 'Open MyMarket',
          url: 'https://mymarket.ge/',
        },
        { id: 'mm-pub', type: 'simulate_publish', label: 'Simulate list', primary: true },
      ],
    },
    {
      id: 'mm-done',
      kind: 'repeat',
      title: 'Listing simulated',
      description: 'Reply in chat with the same DM menu as the 48H drop.',
      actions: [{ id: 'mm-back', type: 'approve', label: 'Back to launches', primary: true }],
    },
  ],
};

export const bookstorePartnersLaunch: Launch = {
  id: 'books-bookstore-partners',
  mode: 'business',
  rank: 4,
  isPrimary: false,
  title: 'BOOKSTORE PARTNERS',
  kicker: 'Meet buyers where they already are',
  summary:
    'Offer independents a tiny test lot (5–10 books): wholesale or pay-only-for-sold.',
  tags: ['local', 'consignment option'],
  locationLabel: 'Tbilisi',
  economics: {
    currency: 'GEL',
    offerPrice: 49,
    offerLabel: 'Retail reference 49₾',
    adSpend: 0,
    notes: ['Example shops for outreach — not a claim they will accept inventory.'],
  },
  evidence: [
    {
      id: 'shops',
      title: 'Example partners',
      detail: 'Santa Esperanza · Laterna · შაქრო ბაბუა წიგნები — call or message with the pitch.',
    },
  ],
  steps: [
    {
      id: 'shop-pitch',
      kind: 'script',
      title: 'Bookstore pitch ready',
      description: 'Keep the ask tiny: 5–10 books, clear settlement terms in writing.',
      script: SHOP_GEO,
      items: [
        {
          title: 'Santa Esperanza',
          detail: '12 Saint Petersburg St · Tbilisi · +995 32 288 08 21',
          url: 'tel:+995322880821',
        },
        {
          title: 'Laterna',
          detail: '7 Tsotne Dadiani St · Tbilisi · +995 555 18 02 04',
          url: 'tel:+995555180204',
        },
        {
          title: 'შაქრო ბაბუა წიგნები',
          detail: '17B Chavchavadze II Dead End · Tbilisi · +995 32 247 55 35',
          url: 'tel:+995322475535',
        },
      ],
      actions: [
        { id: 'copy-shop', type: 'copy', label: 'Copy pitch', copyText: SHOP_GEO },
        { id: 'shop-sent', type: 'simulate_publish', label: 'Simulate outreach', primary: true },
      ],
    },
    {
      id: 'shop-done',
      kind: 'repeat',
      title: 'Outreach simulated',
      description: 'Follow up once. Confirm returns and payment terms in writing.',
      actions: [{ id: 'shop-back', type: 'approve', label: 'Back to launches', primary: true }],
    },
  ],
};

export const booksLaunches: Launch[] = [
  bookDropLaunch,
  microAffiliatesLaunch,
  myMarketLaunch,
  bookstorePartnersLaunch,
];
