const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.EMBEDDED_MONGO = '1';
process.env.PORT = '0';
process.env.MONGO_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bestcars-mongo-test-'));
const {start} = require('./app');
let service, base;
before(async () => {
  service = await start();
  if (!service.server.listening) await once(service.server, 'listening');
  base = `http://127.0.0.1:${service.server.address().port}`;
});
after(async () => {if(service) await service.stop();});
test('MongoDB dealer filtering and missing IDs', async () => {
  const all = await (await fetch(base+'/fetchDealers')).json();
  const kansas = await (await fetch(base+'/fetchDealers/Kansas')).json();
  assert.ok(all.length > 0);
  assert.ok(kansas.length > 0);
  assert.ok(kansas.every(x => x.state === 'Kansas'));
  const dealer = await (await fetch(base+'/fetchDealer/'+all[0].id)).json();
  assert.equal(dealer[0].full_name, all[0].full_name);
  assert.equal((await fetch(base+'/fetchDealer/9999999')).status, 404);
  assert.equal((await fetch(base+'/fetchDealer/nope')).status, 400);
});
test('Concurrent reviews have unique IDs, persist, and appear newest first', async () => {
  const dealers = await (await fetch(base+'/fetchDealers')).json();
  const dealership = dealers[0].id;
  const saved = await Promise.all([1,2,3].map(n => fetch(base+'/insert_review', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Integration test', dealership, review:`Helpful service integration ${n}`, purchase:false, sentiment:'positive'})}).then(async r => {assert.equal(r.status, 201); return r.json();})));
  assert.equal(new Set(saved.map(x => x.id)).size, 3);
  const reviews = await (await fetch(base+'/fetchReviews/dealer/'+dealership)).json();
  for(const row of saved) assert.ok(reviews.some(x => x.id === row.id));
  assert.ok(reviews[0].id > reviews[1].id);
});
test('Invalid reviews are rejected', async () => {
  const response = await fetch(base+'/insert_review', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Test', dealership:1, review:'', purchase:false})});
  assert.equal(response.status, 400);
});
test('Restart keeps existing reviews and does not reseed over them', async () => {
  const before = await (await fetch(base+'/fetchReviews')).json();
  await service.stop();
  service = await start();
  if (!service.server.listening) await once(service.server, 'listening');
  base = `http://127.0.0.1:${service.server.address().port}`;
  const after = await (await fetch(base+'/fetchReviews')).json();
  assert.equal(after.length, before.length);
  assert.deepEqual(after.map(x => x.id), before.map(x => x.id));
});
