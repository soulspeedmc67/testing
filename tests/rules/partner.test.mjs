/**
 * Partner isolation: runs the real firestore.rules in the Firestore emulator.
 *
 *   cd tests/rules && npm install && npm test
 *
 * A partner (another shop on DASHit) must reach his own tree and nothing else,
 * the owner must see all of it, and nothing the shop already relies on may
 * change. These tests are the proof of that; they are the only thing that is.
 */
import { before, after, describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, collectionGroup, query, where, addDoc, serverTimestamp,
} from 'firebase/firestore';

const here = path.dirname(fileURLToPath(import.meta.url));
let env;

const goodProduct = () => ({
  name: 'Aashirvaad Atta 5 kg', category: 'Staples', unit: '5 kg', price: 250, mrp: 280, stock: 40,
  lowStockAt: 5, barcode: '8901725181211', img: 'https://example.com/atta.jpg', active: true,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-dashit',
    firestore: { rules: fs.readFileSync(path.join(here, '../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    // The shop (what a partner must never see)
    await setDoc(doc(db, 'staff/shopAdmin'), { role: 'admin', active: true });
    await setDoc(doc(db, 'staff/shopDriver'), { role: 'driver', active: true });
    await setDoc(doc(db, 'products/shopItem1'), { name: 'Shop item', price: 10, stock: 5 });
    await setDoc(doc(db, 'orders/order1'), { userId: 'cust1', status: 'Placed', total: 100, items: [{ id: 'a' }] });
    await setDoc(doc(db, 'users/cust1'), { name: 'A Customer', phone: '9999999999' });
    await setDoc(doc(db, 'wallets/cust1'), { balance: 60 });
    await setDoc(doc(db, 'drivers/shopDriver'), { name: 'Rider' });
    await setDoc(doc(db, 'payments/order_ABC123456'), { amount: 10000 });
    await setDoc(doc(db, 'distributors/d1'), { name: 'Wholesaler' });
    await setDoc(doc(db, 'config/store'), { isOpen: true, deliveryRadiusKm: 8 });
    // Two active partners, one inactive one, and a locked-out login
    await setDoc(doc(db, 'partners/p1'), { name: 'North Mart', active: true, maxDeliveryKm: 10, commissionPercent: 5 });
    await setDoc(doc(db, 'partners/p2'), { name: 'South Mart', active: true, maxDeliveryKm: 6 });
    await setDoc(doc(db, 'partners/p3'), { name: 'Closed Mart', active: false, maxDeliveryKm: 6 });
    await setDoc(doc(db, 'partnerUsers/partnerOne'), { partnerId: 'p1', active: true });
    await setDoc(doc(db, 'partnerUsers/partnerTwo'), { partnerId: 'p2', active: true });
    await setDoc(doc(db, 'partnerUsers/partnerClosed'), { partnerId: 'p3', active: true });
    await setDoc(doc(db, 'partnerUsers/partnerDisabled'), { partnerId: 'p1', active: false });
    await setDoc(doc(db, 'partners/p1/products/item1'), { name: 'North item', price: 20, stock: 9 });
    await setDoc(doc(db, 'partners/p2/products/item1'), { name: 'South item', price: 20, stock: 9 });
    await setDoc(doc(db, 'partners/p3/products/item1'), { name: 'Closed item', price: 20, stock: 9 });
    await setDoc(doc(db, 'partners/p1/shopOrders/o1'), { total: 100 });
    await setDoc(doc(db, 'partners/p1/settings/shop'), { displayName: 'North Mart' });
  });
});

after(async () => { await env.cleanup(); });

const as = (uid, provider = 'password') => env.authenticatedContext(uid, { firebase: { sign_in_provider: provider }, email: `${uid}@example.com` }).firestore();
const partner = () => as('partnerOne');
const owner = () => as('shopAdmin');
const customer = () => as('cust1', 'google.com');

describe('a partner can NOT reach the shop', () => {
  it('products (the shop inventory)', async () => {
    await assertFails(getDoc(doc(partner(), 'products/shopItem1')));
    await assertFails(getDocs(collection(partner(), 'products')));
    await assertFails(setDoc(doc(partner(), 'products/shopItem1'), { name: 'x', price: 1, stock: 1 }));
    await assertFails(setDoc(doc(partner(), 'products/new1'), { name: 'x', price: 1, stock: 1 }));
    await assertFails(deleteDoc(doc(partner(), 'products/shopItem1')));
  });
  it('orders, customers, wallets, payments, drivers, distributors', async () => {
    await assertFails(getDoc(doc(partner(), 'orders/order1')));
    await assertFails(getDocs(collection(partner(), 'orders')));
    await assertFails(getDocs(query(collection(partner(), 'orders'), where('status', '==', 'Placed'))));
    await assertFails(getDoc(doc(partner(), 'users/cust1')));
    await assertFails(getDoc(doc(partner(), 'wallets/cust1')));
    await assertFails(getDoc(doc(partner(), 'payments/order_ABC123456')));
    await assertFails(getDoc(doc(partner(), 'drivers/shopDriver')));
    await assertFails(getDoc(doc(partner(), 'distributors/d1')));
  });
  it('staff records, and the shop settings', async () => {
    await assertFails(getDoc(doc(partner(), 'staff/shopAdmin')));
    await assertFails(setDoc(doc(partner(), 'staff/partnerOne'), { role: 'admin', active: true }));
    await assertFails(setDoc(doc(partner(), 'config/store'), { isOpen: false }));
  });
  it('cannot place or fake a customer order', async () => {
    await assertFails(addDoc(collection(partner(), 'orders'), { userId: 'partnerOne', status: 'Placed', items: [{ id: 'a' }], total: 1 }));
  });
  it('collection-group queries do not leak other partners or the shop', async () => {
    await assertFails(getDocs(collectionGroup(partner(), 'products')));
    await assertFails(getDocs(collectionGroup(partner(), 'shopOrders')));
    await assertFails(getDocs(collectionGroup(partner(), 'orders')));
  });
});

describe('a partner can NOT reach another partner', () => {
  it('reads or writes p2 while signed in as p1', async () => {
    await assertFails(getDoc(doc(partner(), 'partners/p2')));
    await assertFails(getDoc(doc(partner(), 'partners/p2/products/item1')));
    await assertFails(getDocs(collection(partner(), 'partners/p2/products')));
    await assertFails(setDoc(doc(partner(), 'partners/p2/products/item1'), { name: 'hacked', price: 1, stock: 1 }));
    await assertFails(deleteDoc(doc(partner(), 'partners/p2/products/item1')));
    await assertFails(getDoc(doc(partner(), 'partnerUsers/partnerTwo')));
  });
  it('lists the partners', async () => {
    await assertFails(getDocs(collection(partner(), 'partners')));
  });
});

describe('a partner can NOT change what only the owner controls', () => {
  it('delivery distance, active flag, location, commission', async () => {
    await assertFails(updateDoc(doc(partner(), 'partners/p1'), { maxDeliveryKm: 50 }));
    await assertFails(updateDoc(doc(partner(), 'partners/p1'), { active: true }));
    await assertFails(updateDoc(doc(partner(), 'partners/p1'), { commissionPercent: 0 }));
    await assertFails(setDoc(doc(partner(), 'partners/p1'), { name: 'North Mart', active: true, maxDeliveryKm: 99 }));
    await assertFails(deleteDoc(doc(partner(), 'partners/p1')));
  });
  it('who he is mapped to, or his orders', async () => {
    await assertFails(setDoc(doc(partner(), 'partnerUsers/partnerOne'), { partnerId: 'p2', active: true }));
    await assertFails(updateDoc(doc(partner(), 'partnerUsers/partnerOne'), { partnerId: 'p2' }));
    await assertFails(setDoc(doc(partner(), 'partners/p1/shopOrders/o2'), { total: 1 }));
  });
});

describe('a partner CAN run his own shop', () => {
  it('sees his own record, mapping and settings', async () => {
    await assertSucceeds(getDoc(doc(partner(), 'partners/p1')));
    await assertSucceeds(getDoc(doc(partner(), 'partnerUsers/partnerOne')));
    await assertSucceeds(getDoc(doc(partner(), 'partners/p1/settings/shop')));
    await assertSucceeds(getDocs(collection(partner(), 'partners/p1/shopOrders')));
  });
  it('lists, adds, edits and removes his own stock', async () => {
    await assertSucceeds(getDocs(collection(partner(), 'partners/p1/products')));
    await assertSucceeds(setDoc(doc(partner(), 'partners/p1/products/new1'), goodProduct()));
    await assertSucceeds(updateDoc(doc(partner(), 'partners/p1/products/new1'), { stock: 12, price: 255, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(partner(), 'partners/p1/products/new1')));
  });
  it('edits his shop details', async () => {
    await assertSucceeds(setDoc(doc(partner(), 'partners/p1/settings/shop'), { displayName: 'North Mart', tagline: 'Fresh daily', isOpen: true, updatedAt: serverTimestamp() }));
  });
});

describe('his stock must be tidy', () => {
  it('rejects unknown fields, bad numbers and bad links', async () => {
    const p = () => doc(partner(), 'partners/p1/products/bad1');
    await assertFails(setDoc(p(), { ...goodProduct(), costPrice: 5 }));               // not an allowed field
    await assertFails(setDoc(p(), { ...goodProduct(), price: -1 }));
    await assertFails(setDoc(p(), { ...goodProduct(), stock: -3 }));
    await assertFails(setDoc(p(), { ...goodProduct(), stock: 99999999 }));
    await assertFails(setDoc(p(), { ...goodProduct(), name: '' }));
    await assertFails(setDoc(p(), { ...goodProduct(), name: 'x'.repeat(121) }));
    await assertFails(setDoc(p(), { ...goodProduct(), img: 'http://insecure.example.com/a.jpg' }));
    await assertFails(setDoc(p(), { ...goodProduct(), price: '250' }));               // a string, not a number
    const noPrice = goodProduct(); delete noPrice.price;
    await assertFails(setDoc(p(), noPrice));
  });
  it('rejects unknown settings', async () => {
    await assertFails(setDoc(doc(partner(), 'partners/p1/settings/shop'), { displayName: 'x', maxDeliveryKm: 99 }));
  });
});

describe('a locked-out partner reaches nothing', () => {
  it('whose shop is inactive', async () => {
    const d = as('partnerClosed');
    await assertFails(getDoc(doc(d, 'partners/p3')));
    await assertFails(getDocs(collection(d, 'partners/p3/products')));
    await assertFails(setDoc(doc(d, 'partners/p3/products/n'), goodProduct()));
  });
  it('whose login is switched off', async () => {
    const d = as('partnerDisabled');
    await assertFails(getDoc(doc(d, 'partners/p1')));
    await assertFails(getDocs(collection(d, 'partners/p1/products')));
    await assertFails(setDoc(doc(d, 'partners/p1/products/n'), goodProduct()));
  });
  it('who has no partner record at all (anyone signed in)', async () => {
    const d = as('stranger');
    await assertFails(getDoc(doc(d, 'partners/p1')));
    await assertFails(getDocs(collection(d, 'partners/p1/products')));
    await assertFails(getDoc(doc(d, 'partnerUsers/partnerOne')));
  });
  it('a signed-out visitor', async () => {
    const d = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(d, 'partners/p1')));
    await assertFails(getDocs(collection(d, 'partners/p1/products')));
  });
  it('a customer', async () => {
    await assertFails(getDoc(doc(customer(), 'partners/p1')));
    await assertFails(getDocs(collection(customer(), 'partners/p1/products')));
  });
});

describe('the owner sees everything, and edits only what he should', () => {
  it('reads every partner, their stock, orders and mappings', async () => {
    await assertSucceeds(getDocs(collection(owner(), 'partners')));
    await assertSucceeds(getDoc(doc(owner(), 'partners/p1')));
    await assertSucceeds(getDocs(collection(owner(), 'partners/p1/products')));
    await assertSucceeds(getDocs(collection(owner(), 'partners/p2/products')));
    await assertSucceeds(getDocs(collection(owner(), 'partners/p1/shopOrders')));
    await assertSucceeds(getDoc(doc(owner(), 'partners/p1/settings/shop')));
    await assertSucceeds(getDoc(doc(owner(), 'partnerUsers/partnerOne')));
  });
  it('sets the delivery distance, active flag and commission', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p2'), { maxDeliveryKm: 7.5 }));
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p2'), { commissionPercent: 4 }));
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p2'), { active: false }));
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p2'), { active: true }));
  });
  it('cannot edit the partner stock (read-only), or write the mapping from a client', async () => {
    await assertFails(setDoc(doc(owner(), 'partners/p1/products/x'), goodProduct()));
    await assertFails(setDoc(doc(owner(), 'partnerUsers/anyone'), { partnerId: 'p1', active: true }));
  });
  it('a lowered distance takes hold at once', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p1'), { maxDeliveryKm: 3 }));
    const snap = await assertSucceeds(getDoc(doc(partner(), 'partners/p1')));
    if (snap.data().maxDeliveryKm !== 3) throw new Error('the partner does not see the new distance');
  });
  it('switching a partner off locks him out immediately', async () => {
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p1'), { active: false }));
    await assertFails(getDocs(collection(partner(), 'partners/p1/products')));
    await assertSucceeds(updateDoc(doc(owner(), 'partners/p1'), { active: true }));
    await assertSucceeds(getDocs(collection(partner(), 'partners/p1/products')));
  });
});

describe('nothing the shop already relies on has changed', () => {
  it('the owner still reads and writes the shop', async () => {
    await assertSucceeds(getDoc(doc(owner(), 'products/shopItem1')));
    await assertSucceeds(updateDoc(doc(owner(), 'products/shopItem1'), { stock: 6 }));
    await assertSucceeds(getDoc(doc(owner(), 'orders/order1')));
    await assertSucceeds(getDoc(doc(owner(), 'users/cust1')));
    await assertSucceeds(getDoc(doc(owner(), 'distributors/d1')));
  });
  it('a rider still reads the shop products and orders, and still cannot write products', async () => {
    const d = as('shopDriver');
    await assertSucceeds(getDoc(doc(d, 'products/shopItem1')));
    await assertSucceeds(getDoc(doc(d, 'orders/order1')));
    await assertFails(updateDoc(doc(d, 'products/shopItem1'), { stock: 0 }));
  });
  it('a rider cannot read partners', async () => {
    await assertFails(getDoc(doc(as('shopDriver'), 'partners/p1')));
    await assertFails(getDocs(collection(as('shopDriver'), 'partners/p1/products')));
  });
  it('a customer still reads their own order, and still not the shop products', async () => {
    await assertSucceeds(getDoc(doc(customer(), 'orders/order1')));
    await assertFails(getDoc(doc(customer(), 'products/shopItem1')));
    await assertFails(getDoc(doc(as('someoneElse', 'google.com'), 'orders/order1')));
  });
  it('public reads (config, offers, categories) still work', async () => {
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'config/store')));
  });
});
