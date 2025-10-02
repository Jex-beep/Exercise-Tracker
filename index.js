const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

//* Middleware

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

//* Schemas

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

//* Models

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

//* Endpoints

/*
 * GET
 * Delete all users
 */
app.get('/api/users/delete', function (_req, res) {
	console.log('### delete all users ###'.toLocaleUpperCase());

	User.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all users failed!',
			});
		}

		res.json({ message: 'All users have been deleted!', result: result });
	});
});

/*
 * GET
 * Delete all exercises
 */
app.get('/api/exercises/delete', function (_req, res) {
	console.log('### delete all exercises ###'.toLocaleUpperCase());

	Exercise.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all exercises failed!',
			});
		}

		res.json({ message: 'All exercises have been deleted!', result: result });
	});
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

/*
 * GET
 * Get all users
 */
app.get('/api/users', function (_req, res) {
	console.log('### get all users ###'.toLocaleUpperCase());

	User.find({}, function (err, users) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Getting all users failed!',
			});
		}

		if (users.length === 0) {
			res.json({ message: 'There are no users in the database!' });
		}

		console.log('users in database: '.toLocaleUpperCase() + users.length);

		res.json(users);
	});
});

/*
 * POST
 * Create a new user
 */
app.post('/api/users', function (req, res) {
	const inputUsername = req.body.username;

	console.log('### create a new user ###'.toLocaleUpperCase());

	//? Create a new user
	let newUser = new User({ username: inputUsername });

	console.log(
		'creating a new user with username - '.toLocaleUpperCase() + inputUsername
	);

	newUser.save((err, user) => {
		if (err) {
			console.error(err);
			res.json({ message: 'User creation failed!' });
		}

		res.json({ username: user.username, _id: user._id });
	});
});

/*
 * POST
 * Add a new exercise
 * @param _id
 */
app.post('/api/users/:_id/exercises', function (req, res) {
	var userId = req.params._id;
	var description = req.body.description;
	var duration = req.body.duration;
	var date = req.body.date;

	console.log('### add a new exercise ###'.toLocaleUpperCase());

	//? Check for date
	if (!date) {
		date = new Date().toISOString().substring(0, 10);
	}

	console.log(
		'looking for user with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	//? Find the user
	User.findById(userId, (err, userInDb) => {
		if (err) {
			console.error(err);
			res.json({ message: 'There are no users with that ID in the database!' });
		}

		//* Create new exercise
		let newExercise = new Exercise({
			userId: userInDb._id,
			username: userInDb.username,
			description: description,
			duration: parseInt(duration),
			date: date,
		});

		newExercise.save((err, exercise) => {
			if (err) {
				console.error(err);
				res.json({ message: 'Exercise creation failed!' });
			}

			res.json({
				username: userInDb.username,
				description: exercise.description,
				duration: exercise.duration,
				date: new Date(exercise.date).toDateString(),
				_id: userInDb._id,
			});
		});
	});
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	console.log('### get the log from a user ###'.toLocaleUpperCase());

	//? Find the user
	let user = await User.findById(userId).exec();

	console.log(
		'looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	//? Find the exercises
	let exercises = await Exercise.find({
		userId: userId,
		date: { $gte: from, $lte: to },
	})
		.select('description duration date')
		.limit(limit)
		.exec();

	let parsedDatesLog = exercises.map((exercise) => {
		return {
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		};
	});

	res.json({
		_id: user._id,
		username: user.username,
		count: parsedDatesLog.length,
		log: parsedDatesLog,
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});