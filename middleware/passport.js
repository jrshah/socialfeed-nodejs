let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let wrap = require('nodeifyit')
let crypto = require('crypto')
let SALT = 'CodePathHeartNodeJS'
let authConfig = require('../config/auth')
let User = require('../user')

module.exports = (app) => {
  let passport = app.passport

	passport.use('local', new LocalStrategy({
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


	// passport.serializeUser(wrap(async (user) => {
	//   user.email
	// }))

	// passport.deserializeUser(wrap(async (email) => {
	//   return await User.findOne({email}).exec()
	// }))

	let facebookConfig = {
	    clientID: authConfig.facebook.consumerKey,
	    clientSecret: authConfig.facebook.consumerSecret,
	    callbackURL: authConfig.facebook.callbackUrl
	}

	function loadPassportStrategy(OauthStrategy, config, accountType) {
	    config.passReqToCallback = true
	    passport.use(new OauthStrategy(config, 
	    		function(accessTok1en, refreshToken, profile, cb) {
	    			
	    			return cb()
				    // User.findOrCreate({ facebookId: cb.id }, function (err, user) {
				    //   return cb(err, user);
				    // });
				  }))

	}

	loadPassportStrategy(FacebookStrategy, facebookConfig, 'facebook')

	let twitterConfig = {
	    consumerKey: authConfig.twitter.consumerKey,
	    consumerSecret: authConfig.twitter.consumerSecret,
	    callbackURL: authConfig.twitter.callbackUrl
	}

	passport.use(new TwitterStrategy(twitterConfig,
	  function(token, tokenSecret, profile, done) {
	    User.find({
            'provider_id': profile.id,
            'provider' : 'twitter'
        }, function(err, user) {
            if (err) {
            		return done(err);
            }
            //No user was found... so create a new user with values from Facebook (all the profile. stuff)
            if (!user || user.length == 0) {
                user = new User({
                		provider_id: profile.id,
                    name: profile.displayName,
                    //email: profile.emails[0].value,
                    username: profile.username,
                    provider: 'twitter',
                    profile: profile._json
                });
                user.save(function(err) {
                    if (err) console.log(err);
                    return done(err, user);
                });
            } else {
                //found user. Return
                return done(err, user);
            }
        });
    }
	));

	passport.serializeUser(function(user, done) {
	  done(null, user);
	});

	passport.deserializeUser(function(user, done) {
	  User.findById(user.id, function (err, user) {
	    done(err, user);
	  });
	});


}