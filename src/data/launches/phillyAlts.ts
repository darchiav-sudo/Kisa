import type { Launch } from '@/src/models/types';

export const freeResellLaunch: Launch = {
  id: 'philly-free-resell',
  mode: 'money',
  rank: 2,
  isPrimary: false,
  title: '$0 → FIRST RESELL',
  kicker: 'Free local item → resell',
  summary:
    'Claim a free curb / Buy Nothing item, clean it, and flip on Marketplace the same day. Zero cash risk.',
  tags: ['$0 start', 'online listing', 'same day'],
  locationLabel: 'Philadelphia',
  economics: {
    currency: 'USD',
    starterCost: 0,
    offerPrice: 25,
    offerLabel: 'Target flip ~$15–40',
    adSpend: 0,
    notes: ['Income not guaranteed. Price from comparable sold listings.'],
  },
  evidence: [
    {
      id: 'bn',
      title: 'Free supply nearby',
      detail: 'Buy Nothing / curb alerts regularly surface usable furniture and small goods.',
    },
  ],
  steps: [
    {
      id: 'find-free',
      kind: 'info',
      title: 'Find one free item',
      description: 'Scan Buy Nothing + curb alerts. Pick something you can carry and photograph well.',
      actions: [{ id: 'found', type: 'approve', label: 'Item secured', primary: true }],
    },
    {
      id: 'list-it',
      kind: 'script',
      title: 'List with one clear photo set',
      description: 'Honest condition, pickup neighborhood, firm price.',
      script:
        'FOR SALE — cleaned & ready\n\n[Item] · pickup in NE Philly\nCash / instant pay on pickup\nMessage for exact cross-streets.',
      actions: [
        {
          id: 'copy-list',
          type: 'copy',
          label: 'Copy listing',
          copyText:
            'FOR SALE — cleaned & ready\n\n[Item] · pickup in NE Philly\nCash / instant pay on pickup\nMessage for exact cross-streets.',
        },
        { id: 'pub-list', type: 'simulate_publish', label: 'Simulate list', primary: true },
      ],
    },
    {
      id: 'resell-pay',
      kind: 'payment',
      title: 'Simulate a sale',
      description: 'Demo records a modest flip so you can feel the loop.',
      actions: [
        {
          id: 'resell-paid',
          type: 'collect_payment',
          label: 'Payment received · $25',
          earningAmount: 25,
          primary: true,
        },
      ],
    },
  ],
};

export const connectEarnLaunch: Launch = {
  id: 'philly-connect-earn',
  mode: 'money',
  rank: 3,
  isPrimary: false,
  title: 'CONNECT & EARN',
  kicker: 'Referral · customer ↔ provider',
  summary:
    'Match a neighbor who needs a service with a trusted provider. Earn a small intro fee — no tools required.',
  tags: ['no tools', 'phone', 'intro fee'],
  locationLabel: 'Northeast Philadelphia',
  economics: {
    currency: 'USD',
    starterCost: 0,
    offerPrice: 20,
    offerLabel: '$20 intro fee example',
    adSpend: 0,
    notes: ['Only introduce people you would trust. Disclose the fee.'],
  },
  evidence: [
    {
      id: 'match',
      title: 'Two-sided need',
      detail: 'Someone needs help; someone wants clients. You bridge them once.',
    },
  ],
  steps: [
    {
      id: 'find-need',
      kind: 'info',
      title: 'Spot a clear need',
      description: 'Example: neighbor needs a reliable handyman for a small fix this week.',
      actions: [{ id: 'need-ok', type: 'approve', label: 'Need noted', primary: true }],
    },
    {
      id: 'intro',
      kind: 'script',
      title: 'Send the intro',
      description: 'Short, transparent, optional fee.',
      script:
        'Hey — I know someone solid for that small job. Want an intro? If it books, I usually ask a $20 thank-you from the provider.',
      actions: [
        {
          id: 'copy-intro',
          type: 'copy',
          label: 'Copy intro',
          copyText:
            'Hey — I know someone solid for that small job. Want an intro? If it books, I usually ask a $20 thank-you from the provider.',
        },
        { id: 'intro-sent', type: 'simulate_publish', label: 'Simulate intro', primary: true },
      ],
    },
    {
      id: 'intro-pay',
      kind: 'payment',
      title: 'Intro fee',
      description: 'Simulate collecting the thank-you fee after a booked job.',
      actions: [
        {
          id: 'intro-paid',
          type: 'collect_payment',
          label: 'Fee received · $20',
          earningAmount: 20,
          primary: true,
        },
      ],
    },
  ],
};

export const boxFlipLaunch: Launch = {
  id: 'philly-box-flip',
  mode: 'money',
  rank: 4,
  isPrimary: false,
  title: 'FREE BOXES → $25 BUNDLE',
  kicker: 'Zero-cost microbusiness',
  summary:
    'Collect free moving boxes, bundle a clean set, sell to someone moving this weekend.',
  tags: ['$0 start', 'moving season'],
  locationLabel: 'Northeast Philadelphia',
  economics: {
    currency: 'USD',
    starterCost: 0,
    offerPrice: 25,
    offerLabel: '$25 box bundle',
    adSpend: 0,
    notes: ['Flatten, sort sizes, photo the stack. Pickup preferred.'],
  },
  evidence: [
    {
      id: 'boxes',
      title: 'Free supply',
      detail: 'Liquor stores / apartments often give boxes away on move-out days.',
    },
  ],
  steps: [
    {
      id: 'collect-boxes',
      kind: 'checklist',
      title: 'Collect & sort',
      description: 'Clean, dry boxes only. Bundle small / medium / large.',
      checklist: ['collect free boxes', 'flatten & sort', 'photo the bundle'],
      actions: [{ id: 'boxes-ready', type: 'mark_done', label: 'Bundle ready', primary: true }],
    },
    {
      id: 'sell-boxes',
      kind: 'script',
      title: 'Post the bundle',
      script:
        'MOVING BOX BUNDLE — $25\nClean, dry boxes (S/M/L mix)\nPickup NE Philly this weekend\nMessage for cross-streets.',
      description: 'List on Marketplace / Nextdoor with one clear photo.',
      actions: [
        {
          id: 'copy-boxes',
          type: 'copy',
          label: 'Copy listing',
          copyText:
            'MOVING BOX BUNDLE — $25\nClean, dry boxes (S/M/L mix)\nPickup NE Philly this weekend\nMessage for cross-streets.',
        },
        { id: 'pub-boxes', type: 'simulate_publish', label: 'Simulate list', primary: true },
      ],
    },
    {
      id: 'boxes-pay',
      kind: 'payment',
      title: 'Bundle sold',
      description: 'Simulate the $25 pickup sale.',
      actions: [
        {
          id: 'boxes-paid',
          type: 'collect_payment',
          label: 'Payment received · $25',
          earningAmount: 25,
          primary: true,
        },
      ],
    },
  ],
};

export const tenPhotosLaunch: Launch = {
  id: 'philly-10-photos',
  mode: 'money',
  rank: 5,
  isPrimary: false,
  title: '10 PHOTOS → $49',
  kicker: 'Phone-only microservice',
  summary:
    'Offer 10 clean smartphone product photos for a local seller. No studio — good light and honest editing.',
  tags: ['phone only', 'online/offline'],
  locationLabel: 'Northeast Philadelphia',
  economics: {
    currency: 'USD',
    starterCost: 0,
    offerPrice: 49,
    offerLabel: '$49 · 10 photos',
    adSpend: 0,
    notes: ['Deliver same day when possible. No income guarantee.'],
  },
  evidence: [
    {
      id: 'sellers',
      title: 'Local sellers need photos',
      detail: 'Marketplace sellers convert better with consistent product shots.',
    },
  ],
  steps: [
    {
      id: 'photo-offer',
      kind: 'offer',
      title: 'Offer ready',
      description: '10 edited smartphone photos for one product set — $49 flat.',
      script:
        'NEED BETTER MARKETPLACE PHOTOS?\n\nI shoot + lightly edit 10 clear product photos on my phone — $49 flat.\nNE Philly / can be remote if you stage items.\nMessage a photo of what you sell.',
      actions: [
        {
          id: 'copy-photo',
          type: 'copy',
          label: 'Copy offer',
          copyText:
            'NEED BETTER MARKETPLACE PHOTOS?\n\nI shoot + lightly edit 10 clear product photos on my phone — $49 flat.\nNE Philly / can be remote if you stage items.\nMessage a photo of what you sell.',
        },
        { id: 'pub-photo', type: 'simulate_publish', label: 'Simulate publish', primary: true },
      ],
    },
    {
      id: 'photo-pay',
      kind: 'payment',
      title: 'Job paid',
      description: 'Simulate delivering 10 photos and collecting $49.',
      actions: [
        {
          id: 'photo-paid',
          type: 'collect_payment',
          label: 'Payment received · $49',
          earningAmount: 49,
          primary: true,
        },
      ],
    },
  ],
};

export const phillyAltLaunches: Launch[] = [
  freeResellLaunch,
  connectEarnLaunch,
  boxFlipLaunch,
  tenPhotosLaunch,
];
