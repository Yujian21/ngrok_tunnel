if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const app = express()
const bcrypt = require('bcrypt');
var mysql = require('mysql');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const fetch = require('isomorphic-fetch');

const dbConfig = require('./database')

// db connection
var con = mysql.createConnection(dbConfig.connection);

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});


// caching disabled for every route
app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
  });
  

// session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())


require('./passport-config')(passport); 
// passport
// const initializePassport = require('./passport-config')
// initializePassport(
//     passport)

// initializePassport(
//     passport, 
//     email => {
//     con.query("SELECT * FROM users WHERE email=?", email, function (err, rows) {
//         if (err) {
//             throw err;
//         }
//         let user = rows[0];
//         console.log(Object.values(JSON.parse(JSON.stringify(user))));
//         return Object.values(JSON.parse(JSON.stringify(user)));
//       });
// })


// form encoding
app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended: false}))

// routes
app.get('/', checkIsAuthenticated, (req, res) => {
    var allUsers = [];
    con.query('SELECT * FROM users', async function(err, rows) {
        if (err) { 
            return done(err);
        }
        rows.forEach(row => {
            // userMap = {id: row.id, email: row.email}
            allUsers.push(row)
        });
        res.render('index.ejs', {email: req.user.email, id: req.user.id, printUsers: allUsers})
    })
}) 


app.get('/login', checkIsNotAuthenticated, (req, res) => {
    res.render('login.ejs', {text: 'Login'})
}) 

app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
})) 

app.get('/register', (req, res) => {
    res.render('register.ejs')
}) 

app.post('/register', passport.authenticate('local-signup', {
    successRedirect : '/',
    failureRedirect : '/register',
    failureFlash : true}))

// app.post('/register', async (req, res) => {
//     // recaptcha
//     const secretKey = '6LeOi-ggAAAAALfDNAA_sTiMV0p4iSUJr3cFl8CA';
//     const resKey = req.body['g-recaptcha-response'];
//     const url = 'https://www.google.com/recaptcha/api/siteverify?secret=' + secretKey + '&response=' + resKey

//     fetch(url, {
//         method: 'post',
//       })
//         .then((response) => response.json())
//         .then(async (google_response) => {
//           if (google_response.success == true) {
//             // password hash
//             const hashed = await bcrypt.hash(req.body.password, 10)
//             const payload = {email: req.body.email, password: hashed};

//             var sql = "INSERT INTO users SET ?";
//             con.query(sql, payload, function (err, result) {
//                 if (err) throw err;
//                 console.log("1 record inserted");
//             });
//             res.redirect('/login')
//           } else {
//             return res.send({ response: 'Failed' })
//           }
//         })
//         .catch((error) => {
//           return res.json({ error })
//         })
// }) 

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }})
    res.redirect('/login')
})


function checkIsAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkIsNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

app.listen(8080, () => console.log('listening on port 8080...'));
