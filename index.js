const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String // Stored as string for consistent formatting
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', async (_req, res) => {
  res.sendFile(__dirname + '/views/index.html');
  await User.syncIndexes();
  await Exercise.syncIndexes();
});

// Create user
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const savedUser = await user.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// Get all users
app.get('/api/users', async (_req, res) => {
  const users = await User.find({});
  res.json(users);
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  const exerciseDate = date ? date : new Date().toISOString().substring(0, 10);

  const exercise = new Exercise({
    userId: user._id,
    username: user.username,
    description,
    duration: parseInt(duration),
    date: exerciseDate
  });

  const savedExercise = await exercise.save();

  res.json({
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: new Date(savedExercise.date).toDateString(),
    _id: user._id
  });
});

// Get logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  const fromDate = from || new Date(0).toISOString().substring(0, 10);
  const toDate = to || new Date().toISOString().substring(0, 10);

  const exercises = await Exercise.find({
    userId: req.params._id,
    date: { $gte: fromDate, $lte: toDate }
  })
    .select('description duration date')
    .limit(parseInt(limit) || 500);

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: new Date(e.date).toDateString()
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log
  });
});

// Admin: Delete all users
app.get('/api/users/delete', async (_req, res) => {
  const result = await User.deleteMany({});
  res.json({ message: 'All users deleted', result });
});

// Admin: Delete all exercises
app.get('/api/exercises/delete', async (_req, res) => {
  const result = await Exercise.deleteMany({});
  res.json({ message: 'All exercises deleted', result });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
