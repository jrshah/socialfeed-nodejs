require('./bootstrap') // Setup error handlers

let express = require('express')
let morgan = require('morgan')
let bodyParser = require('body-parser')
let cookieParser = require('cookie-parser')
let session = require('express-session')
let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let wrap = require('nodeifyit')
let crypto = require('crypto')
let SALT = 'CodePathHeartNodeJS'
let flash = require('connect-flash')
let mongoose = require('mongoose')
let User = require('./user')
let authConfig = require('./config/auth')
mongoose.connect('mongodb://127.0.0.1:27017/authenticator')
let FacebookStrategy = require('passport-facebook').Strategy

// Will allow crypto.promise.pbkdf2(...)
require('songbird')


const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000

let app = express()
app.set('view engine', 'ejs')

app.use(flash())
app.use(cookieParser('ilovethenodejs')) // Session cookies
app.use(bodyParser.json()) // req.body for PUT/POST requests (login/signup)
app.use(bodyParser.urlencoded({ extended: true }))

// In-memory session support, required by passport.session()
app.use(session({
  secret: 'ilovethenodejs',
  resave: true,
  saveUninitialized: true
}))

app.use(passport.initialize()) // Enables passport middleware
app.use(passport.session()) // Enables passport persistent sessions

let user = {
    email: 'foo@foo.com',
    password: crypto.pbkdf2Sync('asdf', SALT, 4096, 512, 'sha256').toString('hex')
}

passport.use(new LocalStrategy({
    usernameField: 'email',
    failureFlash: true // Enables error messaging
}, wrap(async (email, password) => {
	let user = await User.findOne({email}).exec()
 	if (email !== user.email) {
     return [false, {message: 'Invalid username'}]
 	}

  let passwordHash = await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')
 	if (passwordHash.toString('hex') !== user.password) {
     return [false, {message: 'Invalid password'}]
 	}
 	return user
}, {spread: true})))

passport.use('local-signup', new LocalStrategy({
   usernameField: 'email'
}, wrap(async (email, password) => {
    email = (email || '').toLowerCase()

    if (await User.promise.findOne({email})) {
        return [false, {message: 'That email is already taken.'}]
    }

    let user = new User()
    user.email = email

    // Store password as a hash instead of plain-text
    user.password = (await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')).toString('hex')
    return await user.save()
}, {spread: true})))


passport.serializeUser(wrap(async (user) => user.email))
// passport.deserializeUser(wrap(async (id) => user))

passport.deserializeUser(wrap(async (email) => {
    return await User.findOne({email}).exec()
}))

app.listen(PORT, ()=> console.log(`Listening @ http://127.0.0.1:${PORT}`))

// Scope specifies the desired data fields from the user account
let scope = 'email'

// Authentication route & Callback URL
app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
}))

// Authorization route & Callback URL
app.get('/connect/facebook', passport.authorize('facebook', {scope}))
app.get('/connect/facebook/callback', passport.authorize('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/profile',
    failureFlash: true
}))

let facebookConfig = {
    clientID: authConfig.facebook.consumerKey,
    clientSecret: authConfig.facebook.consumerSecret,
    callbackURL: authConfig.facebook.callbackUrl
}

function loadPassportStrategy(OauthStrategy, config, accountType) {
    config.passReqToCallback = true
    passport.use(new OauthStrategy(config, 
    		function(accessToken, refreshToken, profile, cb) {
    			console.log( cb.id, cb.displayName)
			    // User.findOrCreate({ facebookId: cb.id }, function (err, user) {
			    //   return cb(err, user);
			    // });
			  }))

}

loadPassportStrategy(FacebookStrategy, facebookConfig, 'facebook')









function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next()
    res.redirect('/')
}

app.get('/', (req, res) => {
    res.render('index.ejs', {message: req.flash('error')})
})
app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
})
app.get('/signup', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
})
// process the login form
app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
}))

// process the signup form
app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
}))

app.get('/profile', isLoggedIn, (req, res) => {
	console.log(user);
	res.render('profile.ejs', {id: user._id, email: user.email, password: user.password})
})










