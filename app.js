const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const User = require('./models/user');
const Recipe = require('./models/recipe');
const LocalStrategy = require('passport-local');
const passport = require('passport');
const multer = require('multer');

const url = "mongodb://127.0.0.1/recipe_app"
const app = express();

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));
app.use(session({
    secret: 'anyRandomSecretString', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/public', express.static('public'));

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


mongoose.connect(url, {})
    .then(result => console.log("database connected"))
    .catch(err => console.log(err))

app.get('/', async (req, res) => {
    try {
        const { category, difficulty } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (difficulty) filter.difficulty = difficulty;

        const recipes = await Recipe.find(filter).populate('createdBy').exec();
        res.render('index', { 
            user: req.user,
            recipes: recipes
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Wystąpił błąd podczas pobierania przepisów.');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    User.register(new User({username: req.body.username}), req.body.password, (err, user) => {
        if(err) {
            return res.render('register', { error: err.message });
        }
        passport.authenticate('local')(req, res, () => {
            res.redirect('/');
        });
    });
});

app.get('/add-recipe', (req, res) => {
    res.render('add-recipe');
});

app.post('/add-recipe', async (req, res) => {
    try {
        const recipeData = req.body;
        recipeData.createdBy = req.user._id;
        const newRecipe = new Recipe(recipeData);
        await newRecipe.save();
        res.redirect('/'); 
    } catch (err) {
        console.log(err);
        res.status(500).send('Wystąpił błąd podczas dodawania przepisu.');
    }
});

app.get('/recipe/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id).populate('createdBy');
        console.log("Znaleziony przepis:", recipe);  

        if (recipe) {
            res.render('recipe', { recipe: recipe });
        } else {
            res.status(404).send("Przepis nie został znaleziony.");
        }
    } catch (error) {
        console.error("Wystąpił błąd:", error);
        res.status(500).send("Wystąpił błąd serwera.");
    }
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/'); // miejsce zapisu plików
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // nazwa pliku
    }
});

const upload = multer({ storage: storage });

// Użyj middleware 'upload' w odpowiednim routerze
router.post('/add-recipe', upload.single('image'), (req, res) => {
    // Twoja logika dodawania przepisu
    const imageUrl = '/uploads/' + req.file.filename; // ścieżka do obrazu
    // Zapisz imageUrl w bazie danych jako pole 'image' dla przepisu
});