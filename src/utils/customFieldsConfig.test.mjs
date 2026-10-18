// Run: node src/utils/customFieldsConfig.test.mjs
import assert from 'node:assert';
import { resolveColumns, formatCustomValue, getCustomValue, customSummary, toPreferencePayload, minWidthOf } from './customFieldsConfig.js';

const D = [{ key: 'name', label: 'Name', width: '1fr' }, { key: 'email', label: 'Email', width: '1fr' }, { key: 'actions', label: 'Action', width: '160px', pinEnd: true }];
const defs = [{ fieldName: 'blood_group', fieldLabel: 'Blood group', fieldType: 'select' }, { fieldName: 'vehicle', fieldLabel: 'Vehicle', fieldType: 'boolean' }];
const keys = (r) => r.visible.map((c) => c.key);

// 1. no custom fields, no preference -> exactly the original columns
assert.deepStrictEqual(keys(resolveColumns(D, [], [])), ['name', 'email', 'actions']);
assert.deepStrictEqual(keys(resolveColumns(D, undefined, undefined)), ['name', 'email', 'actions']);
assert.deepStrictEqual(keys(resolveColumns(D, null, 'junk')), ['name', 'email', 'actions']);
// 2. custom columns go before the pinned Actions column
assert.deepStrictEqual(keys(resolveColumns(D, defs, [])), ['name', 'email', 'cf_blood_group', 'cf_vehicle', 'actions']);
// 3. saved order + visibility are applied; Actions can never be hidden or moved
const pref = [{ key: 'email', isVisible: true, order: 0 }, { key: 'name', isVisible: false, order: 1 }, { key: 'actions', isVisible: false, order: 0 }];
assert.deepStrictEqual(keys(resolveColumns(D, [], pref)), ['email', 'actions']);
// 4. a column added after the layout was saved appears (visible) at the end; deleted ones are ignored
const pref2 = [{ key: 'name', order: 0 }, { key: 'email', order: 1 }, { key: 'cf_gone', order: 2, isVisible: true }];
assert.deepStrictEqual(keys(resolveColumns(D, defs, pref2)), ['name', 'email', 'cf_blood_group', 'cf_vehicle', 'actions']);
// 5. locked columns stay visible
const L = [{ key: 'name', locked: true }, { key: 'x' }, { key: 'actions', pinEnd: true }];
assert.deepStrictEqual(keys(resolveColumns(L, [], [{ key: 'name', isVisible: false, order: 0 }, { key: 'x', order: 1 }])), ['name', 'x', 'actions']);
// 6. cells never blow up on old records
const col = resolveColumns(D, defs, []).all.find((c) => c.key === 'cf_vehicle');
assert.strictEqual(col.render({}), '—'); assert.strictEqual(col.render({ customFields: null }), '—'); assert.strictEqual(col.render({ customFields: { vehicle: true } }), 'Yes');
assert.strictEqual(getCustomValue(undefined, 'a'), undefined); assert.strictEqual(getCustomValue({ customFields: new Map([['a', 1]]) }, 'a'), 1);
assert.strictEqual(formatCustomValue({ fieldType: 'number' }, 4.5), '4.5'); assert.strictEqual(formatCustomValue(null, 'x'), 'x'); assert.strictEqual(formatCustomValue({ fieldType: 'date' }, 'bad'), 'bad');
assert.deepStrictEqual(customSummary(defs, { customFields: { blood_group: 'O+' } }).map((x) => x.text), ['O+']);
assert.deepStrictEqual(customSummary(undefined, {}), []);
// 7. payload skips pinned and numbers columns by position
const all = resolveColumns(D, defs, []).all; all[0].isVisible = false;
assert.deepStrictEqual(toPreferencePayload(all).map((c) => [c.key, c.isVisible, c.order]), [['name', false, 0], ['email', true, 1], ['cf_blood_group', true, 2], ['cf_vehicle', true, 3]]);
assert.strictEqual(minWidthOf('160px'), 160); assert.strictEqual(minWidthOf('1.5fr'), 110); assert.strictEqual(minWidthOf('minmax(120px, 1fr)'), 120);
console.log('customFieldsConfig: all passed');
