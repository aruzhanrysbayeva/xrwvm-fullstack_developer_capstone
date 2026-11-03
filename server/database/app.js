const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const Reviews = require('./review');
const Dealerships = require('./dealership');
const counterSchema = new mongoose.Schema({_id: String, seq: Number});
const Counter = mongoose.model('counters', counterSchema);
const app = express();
app.disable('x-powered-by');
app.use(express.json({limit: '32kb'}));
const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const clean = doc => { const {_id, __v, ...rest} = doc; return rest; };
const validId = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

app.get('/', (_, res) => res.json({service: 'dealer-reviews', status: 'ok', database: 'MongoDB'}));
app.get('/fetchDealers', route(async (_, res) => res.json((await Dealerships.find().sort({id: 1}).lean()).map(clean))));
app.get('/fetchDealers/:state', route(async (req, res) => {
  const filter = req.params.state === 'All' ? {} : {state: req.params.state};
  res.json((await Dealerships.find(filter).sort({id: 1}).lean()).map(clean));
}));
app.get('/fetchDealer/:id', route(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid dealer ID'});
  const dealer = await Dealerships.findOne({id: Number(req.params.id)}).lean();
  if (!dealer) return res.status(404).json({error: 'Dealer not found'});
  res.json([clean(dealer)]);
}));
app.get('/fetchReviews', route(async (_, res) => res.json((await Reviews.find().sort({id: -1}).lean()).map(clean))));
app.get('/fetchReviews/dealer/:id', route(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({error: 'Invalid dealer ID'});
  res.json((await Reviews.find({dealership: Number(req.params.id)}).sort({id: -1}).lean()).map(clean));
}));
app.post('/insert_review', route(async (req, res) => {
  const data = req.body;
  if (!data || !Number.isSafeInteger(data.dealership) || typeof data.purchase !== 'boolean' || typeof data.review !== 'string' || data.review.trim().length < 5 || typeof data.name !== 'string') {
    return res.status(400).json({error: 'Invalid review fields'});
  }
  if (!await Dealerships.exists({id: data.dealership})) return res.status(404).json({error: 'Dealer not found'});
  const counter = await Counter.findByIdAndUpdate('review', {$inc: {seq: 1}}, {new: true, upsert: true});
  const {name, user_id, dealership, review, purchase, purchase_date, car_make, car_model, car_year, sentiment} = data;
  const saved = await Reviews.create({id: counter.seq, name, user_id, dealership, review, purchase, purchase_date, car_make, car_model, car_year, sentiment});
  res.status(201).json(clean(saved.toObject()));
}));
app.use((err, req, res, next) => {
  const badRequest = err instanceof mongoose.Error.ValidationError || err.type === 'entity.parse.failed';
  if (!badRequest) console.error(err.message);
  res.status(badRequest ? 400 : 500).json({error: badRequest ? 'Invalid request data' : 'Database operation failed'});
});

async function start() {
  let mongo;
  let uri = process.env.MONGO_URL;
  if (!uri && process.env.EMBEDDED_MONGO === '1') {
    const {MongoMemoryServer} = require('mongodb-memory-server');
    const dbPath = process.env.MONGO_DATA_DIR || path.join(__dirname, '.mongo-data');
    fs.mkdirSync(dbPath, {recursive: true});
    mongo = await MongoMemoryServer.create({instance: {dbPath, storageEngine: 'wiredTiger'}});
    uri = mongo.getUri();
  }
  if (!uri) throw new Error('Set MONGO_URL, or EMBEDDED_MONGO=1 for isolated local development.');
  await mongoose.connect(uri, {dbName: 'dealershipsDB'});
  await Promise.all([Reviews.init(), Dealerships.init(), Counter.init()]);
  const dealers = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/dealerships.json'))).dealerships;
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/reviews.json'))).reviews;
  if (!await Dealerships.exists({})) await Dealerships.insertMany(dealers);
  if (!await Reviews.exists({})) await Reviews.insertMany(reviews);
  const maxReview = await Reviews.findOne().sort({id: -1}).lean();
  await Counter.updateOne({_id: 'review'}, {$max: {seq: maxReview?.id || 0}}, {upsert: true});
  const port = Number(process.env.PORT || 3030);
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Dealer service ready: http://${process.env.HOST || '127.0.0.1'}:${port}; MongoDB connected`));
  async function stop() { server.close(); await mongoose.disconnect(); if (mongo) await mongo.stop(); }
  process.on('SIGTERM', () => stop().then(() => process.exit(0)));
  process.on('SIGINT', () => stop().then(() => process.exit(0)));
  return {server, stop};
}
if (require.main === module) start().catch(err => { console.error(err); process.exit(1); });
module.exports = {app, start};
