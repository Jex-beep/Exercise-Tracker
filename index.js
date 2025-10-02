const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create user
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username });
  const savedUser = await user.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users.map(u => ({ username: u.username, _id: u._id })));
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  // Ensure valid date (fallback to current date if blank/invalid)
  const exerciseDate = date ? new Date(date) : new Date();

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: exerciseDate
  });

  const savedExercise = await exercise.save();

  res.json({
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString(), // ✅ correct format
    _id: user._id
  });
});

// Get logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: 'User not found' });

  let filter = { userId: user._id };

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter);
  if (limit) query = query.limit(parseInt(limit));

  const exercises = await query.exec();

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString() // ✅ always a proper string
  }));

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
