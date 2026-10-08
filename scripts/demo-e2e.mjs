import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = '/cursor/stores/bc-ee5afa0e-16d1-46be-8556-aa512c4774e2/media/money-launcher';
const BASE = 'http://127.0.0.1:47831';
fs.mkdirSync(OUT, { recursive: true });

async function tapText(page, text, exact = false) {
  const loc = exact
    ? page.getByText(text, { exact: true })
    : page.getByText(text);
  await loc.first().click({ timeout: 15000 });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
}

async function waitReady(page) {
  await page.waitForSelector('text=KISA', { timeout: 60000 });
}

async function runLeaf(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitReady(page);
  // clear demo if button present
  try {
    await page.getByText('Reset demo data').click({ timeout: 2000 });
    await page.waitForTimeout(400);
  } catch {}
  await shot(page, '01-welcome.png');

  await tapText(page, 'I need a way to make money');
  await page.waitForSelector('text=Money profile');
  await shot(page, '02-money-profile.png');
  await tapText(page, 'Analyze opportunities');

  await page.waitForSelector('text=See launches', { timeout: 20000 });
  await tapText(page, 'See launches');
  await page.waitForSelector('text=FRONT YARD LEAF RESET');
  await shot(page, '03-leaf-launches.png');

  await tapText(page, 'FRONT YARD LEAF RESET');
  await page.waitForSelector('text=Start launch');
  await shot(page, '04-leaf-detail.png');
  await tapText(page, 'Start launch');

  const primarySteps = [
    'Continue',
    'Approve offer',
    'Approve distribution',
    'Simulate publish',
    'Simulate wait',
    'Open lead',
    'Mark reply sent',
    'Book job',
  ];
  for (const label of primarySteps) {
    await page.waitForSelector(`text=${label}`, { timeout: 15000 });
    await tapText(page, label, true);
    await page.waitForTimeout(500);
  }

  await page.waitForSelector('text=Now buy the starter kit', { timeout: 15000 });
  await shot(page, '05-leaf-equipment-after-book.png');
  await tapText(page, 'Kit purchased', true);
  await page.waitForTimeout(400);
  await tapText(page, 'Job complete', true);
  await page.waitForTimeout(400);
  await tapText(page, 'Payment received · $49', true);
  await page.waitForSelector('text=FIRST MONEY', { timeout: 15000 });
  await shot(page, '06-leaf-first-money.png');
}

async function runBooks(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitReady(page);
  try {
    await page.getByText('Reset demo data').click({ timeout: 2000 });
    await page.waitForTimeout(400);
  } catch {}

  await tapText(page, 'I already have a business / product');
  await page.waitForSelector('text=Business profile');
  await shot(page, '07-business-profile.png');
  await tapText(page, 'Find fastest sales paths');
  await page.waitForSelector('text=See launches', { timeout: 20000 });
  await tapText(page, 'See launches');
  await page.waitForSelector('text=48H BOOK DROP');
  await shot(page, '08-books-launches.png');
  await tapText(page, '48H BOOK DROP');
  await page.waitForSelector('text=Start launch');
  await tapText(page, 'Start launch');

  const steps = [
    'Offer ready',
    'Simulate publish',
    'Simulate wait',
    'Open DM',
    'DM sent',
    'Fulfillment ready',
    'Payment received · 49₾',
  ];
  for (const label of steps) {
    await page.waitForSelector(`text=${label}`, { timeout: 15000 });
    await tapText(page, label, true);
    await page.waitForTimeout(600);
  }
  await page.waitForSelector('text=FIRST MONEY', { timeout: 15000 });
  await shot(page, '09-books-first-sale.png');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
try {
  await runLeaf(page);
  await runBooks(page);
  console.log('E2E demo screenshots complete');
} catch (e) {
  await shot(page, 'error-state.png');
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
