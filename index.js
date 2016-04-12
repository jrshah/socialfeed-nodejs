require('./bootstrap') // Setup error handlers

let express = require('express')
let morgan = require('morgan')
let bodyParser = require('body-parser')
let cookieParser = require('cookie-parser')
let session = require('express-session')
let passport = require('passport')
let wrap = require('nodeifyit')
let flash = require('connect-flash')
let mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1:27017/authenticator')
let routes = require('./routes')
let passportMiddleware = require('./middleware/passport')

// Will allow crypto.promise.pbkdf2(...)
require('songbird')


const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000

let app = express()
app.passport = passport
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
passportMiddleware(app) // Configure passport strategies 

routes(app)

app.listen(PORT, ()=> console.log(`Listening @ http://127.0.0.1:${PORT}`))









