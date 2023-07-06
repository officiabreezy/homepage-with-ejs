const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require("dotenv").config();

const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set up body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set up express-session middleware
app.use(session({
  secret: 'secret-key',
  resave: true,
  saveUninitialized: true
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/class', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Define the user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model('User', userSchema);

// Define the news schema
const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  userId: String
});

const News = mongoose.model('News', newsSchema);

// Define routes

// Homepage route
app.get('/', (req, res) => {
  res.render('index');
});

// Signup route
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.redirect('/signup');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    // Redirect to login page
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.redirect('/signup');
  }
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
      return res.redirect('/login');
    }

    // Compare the password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.redirect('/login');
    }

    // Store the user ID in the session
    req.session.userId = user._id;

    // Redirect to the news page
    res.redirect('/news');
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

// News routes
app.get('/news', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    // Find the news articles for the logged-in user
    const news = await News.find({ userId: req.session.userId });

    res.render('news', { news });
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.get('/news/add', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  res.render('add-news');
});

app.post('/news/add', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const { title, content } = req.body;

  try {
    // Create a new news article
    const news = new News({
      title,
      content,
      userId: req.session.userId
    });

    await news.save();

    res.redirect('/news');
  } catch (error) {
    console.error(error);
    res.redirect('/news/add');
  }
});

app.get('/news/edit/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const { id } = req.params;

  try {
    // Find the news article by ID
    const news = await News.findById(id);

    res.render('edit-news', { news });
  } catch (error) {
    console.error(error);
    res.redirect('/news');
  }
});

app.post('/news/edit/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const { id } = req.params;
  const { title, content } = req.body;

  try {
    // Find the news article by ID and update it
    await News.findByIdAndUpdate(id, { title, content });

    res.redirect('/news');
  } catch (error) {
    console.error(error);
    res.redirect('/news/edit/' + id);
  }
});

app.post('/news/delete/:id', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const { id } = req.params;

  try {
    // Find the news article by ID and delete it
    await News.findByIdAndDelete(id);

    res.redirect('/news');
  } catch (error) {
    console.error(error);
    res.redirect('/news');
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
