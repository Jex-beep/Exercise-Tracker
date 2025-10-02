// server.js
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
  // store as ObjectId and reference User
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now } // default ensures a date always exists
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Could not create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { username: 1 });
    // ensure _id is string
    res.json(users.map(u => ({ username: u.username, _id: u._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: 'Could not get users' });
  }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found' });

    // if date is provided but is empty string, treat as no date
    const exerciseDate = date && date.trim() !== '' ? new Date(date) : new Date();

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
      // Use toDateString to match the exact required format
      date: savedExercise.date.toDateString(),
      _id: user._id.toString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not add exercise' });
  }
});

// Get logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: 'User not found' });

    let filter = { userId: user._id };

    // from/to: only attach if valid date strings
    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) filter.date.$lte = toDate;
      }
      // If both were invalid, remove date filter entirely
      if (Object.keys(filter.date).length === 0) delete filter.date;
    }

    // parse limit safely
    const parsedLimit = parseInt(limit);
    const query = Exercise.find(filter).sort({ date: 1 }); // sort by date ascending
    if (!isNaN(parsedLimit)) query.limit(parsedLimit);

    const exercises = await query.exec();

    // Guarantee the date is always a Date string using toDateString()
    const log = exercises.map(e => {
      // ensure we have a valid Date object
      const d = e.date ? new Date(e.date) : new Date();
      const dateString = isNaN(d.getTime()) ? new Date().toDateString() : d.toDateString();
      return {
        description: e.description,
        duration: e.duration,
        date: dateString
      };
    });

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id.toString(),
      log
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
