const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

// database connection
var mysql = require('mysql');
const dbConfig = require('./database')
var con =  mysql.createConnection(dbConfig.connection);
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

// function initialize(passport) {
//     const authenticateUser = async (email, password, done) => {
//         con.query("SELECT * FROM users WHERE email=?", email, async function (err, rows) {
//         if (err) {
//             throw err;
//         }
//         let user = rows[0];
        
//         if(user == null) {
//             console.log('user not found')
//             return done(null, false, {message: 'User not found'})
//         }
//         console.log(user + ' in authenticateUser');
//         console.log(user.email + ' in authenticateUser');
//         try {
//             if (await bcrypt.compare(password, user.password)) {
//                 console.log('correct password')
//                 return done(null, user)
//             } else {
//                 console.log('incorrect password')
//                 return done(null, false, {message: 'Incorrect password'})
//             }
//         } catch (error) {
//             return done(error)
//         }
//       });
        
        
//     }

//     passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
//     passport.serializeUser((user, done) => {})
//     passport.deserializeUser((id, done) => {})
    
// }

// function initialize(passport, getUserByEmail) {
//     const authenticateUser = async (email, password, done) => {
//         const user = getUserByEmail(email)
//         console.log(user);
//         if(user == null) {
//             console.log('user not found')
//             return done(null, false, {message: 'User not found'})
//         }
//         console.log(user + 'in authenticateUser');
//         try {
//             if (await bcrypt.compare(password, user.password)) {
//                 return done(null, user)
//             } else {
//                 console.log('incorrect password')
//                 return done(null, false, {message: 'Incorrect password'})
//             }
//         } catch (error) {
//             return done(error)
//         }
//     }

//     passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
//     passport.serializeUser((user, done) => {})
//     passport.deserializeUser((id, done) => {})
    
// }

// module.exports = initialize

module.exports = function(passport) {
    // local register strategy
    passport.use(
        'local-signup',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {
            if(password.length < 8) {
                return done(null, false, {message: 'Password is too weak (Should be more than or equal to 8 characters)'})
            }
            // recaptcha
            const secretKey = '6LeOi-ggAAAAALfDNAA_sTiMV0p4iSUJr3cFl8CA';
            const resKey = req.body['g-recaptcha-response'];
            const url = 'https://www.google.com/recaptcha/api/siteverify?secret=' + secretKey + '&response=' + resKey

            fetch(url, {
                method: 'post',
            })
            .then((response) => response.json())
            .then(async (google_response) => {
            if (google_response.success == true) {
                console.log(email)
                console.log(password)
                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                con.query("SELECT * FROM users WHERE email = ?", email, async function(err, rows) {
                    if (err) { 
                        return done(err);
                    }
                    let user = rows[0];
                    if (user != null) {
                        return done(null, false, {message: 'Email already in use'})
                    } else {
                         // password hash
                        const hashed = await bcrypt.hash(req.body.password, 10)
                        const newUser = {email: req.body.email, password: hashed};
    
                        var sql = "INSERT INTO users SET ?";
                        con.query(sql, newUser, function (err, rows) {
                            if (err) {
                                throw err;
                            }
                            console.log("1 record inserted");
                            newUser.id = rows.insertId;
                            return done(null, newUser)
                        });
                    }
                });

            } else {
                return done(null, false, {message: 'Please complete Recaptcha'})
            }
            })
            .catch((error) => {
                return error
            })
            
        })
    );

    // local login strategy
    passport.use('local-login', new LocalStrategy({usernameField: 'email'}, async function (email, password, done) {
        var sql = "SELECT * FROM users WHERE email=" + email
        con.query("SELECT * FROM users WHERE email=?", email, async function (err, rows) {
        if (err) {
            throw err;
        }
        console.log(sql)
        console.log(rows)
        let user = rows[0];
        
        if(user == null) {
            console.log('user not found')
            return done(null, false, {message: 'User not found'})
        }
        console.log(user + ' in authenticateUser');
        console.log(user.email + ' in authenticateUser');
        try {
            if (await bcrypt.compare(password, user.password)) {
                console.log('correct password')
                return done(null, user)
            } else {
                console.log('incorrect password')
                return done(null, false, {message: 'Incorrect password'})
            }
        } catch (error) {
            return done(error)
        }
      });
    }));

    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser(function(id, done) {
        con.query("SELECT * FROM users WHERE id = ? ",[id], function(err, row){
            done(err, row[0]);
        });

    })
}