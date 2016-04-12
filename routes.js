let isLoggedIn = require('./middleware/isLoggedIn')
let crypto = require('crypto')
let SALT = 'CodePathHeartNodeJS'
let then = require('express-then')
var Twitter = require('twitter');
var twitterConfig = require('./config/auth').twitter
let posts = require('./data/posts')

let networks = {
    twitter: {
        network: {
          icon: 'twitter',
          name: 'Twitter',
          class: 'btn-info'
        }
    }
}

let twitterClient = new Twitter({
    consumer_key : twitterConfig.consumerKey,
    consumer_secret: twitterConfig.consumerSecret,
    access_token_key: twitterConfig.accessTokenKey,
    access_token_secret: twitterConfig.accessTokenSecret
})

module.exports = (app) => {
    let passport = app.passport

    app.get('/', (req, res) => {
        res.render('index.ejs', {message: req.flash('error')})
    })

    app.get('/login', (req, res) => {
        res.render('login.ejs', {message: req.flash('error')})
    })

    // process the login form
    app.post('/login', passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }))

    app.get('/signup', (req, res) => {
        res.render('login.ejs', {message: req.flash('error')})
    })

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }))

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: user, 
            message: req.flash('error')
        })
    })

    // Scope specifies the desired data fields from the user account
    let scope = 'email'

    // Authentication route & Callback URL
    app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
    app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        successRedirect: '/profile',
        failureRedirect: '/',
        failureFlash: true
    }))

    // Authorization route & Callback URL
    app.get('/auth/twitter', passport.authenticate('twitter', {scope}))
    app.get('/auth/twitter/callback', 
        passport.authenticate('twitter', { failureRedirect: '/profile' }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/timeline')
        }
    )

    app.get('/timeline', then(async (req, res) => {
        try {
            
            let tweets = await twitterClient.promise.get('statuses/home_timeline')
            let newTweets = new Array();
            for(let i =0 ; i< tweets.length ; i++) {
                newTweets[i] = {
                    id: tweets[i].id,
                    id_str: tweets[i].id_str,
                    image: tweets[i].user.profile_image_url,
                    text: tweets[i].text,
                    name: tweets[i].user.name,
                    username: '@'+tweets[i].user.screen_name,
                    liked: tweets[i].favorited,
                    network: networks.twitter
                }  
            }
            res.render('timeline.ejs', {
                posts: newTweets,
                message: req.flash('error')
            })

        } catch (e) {
            console.log(e)
        }
    }))


    app.get('/compose', (req, res) => {
        res.render('compose.ejs', {message: req.flash('error')})
    })

    app.post('/compose', then(async (req, res) => {
        let status = req.body.text
        if (status.length > 140) {
            return req.flash('error', "Status is over 140 characters!")
        }
        if (!status) {
            return req.flash('error', "Status cannot be empty!")
        }
        await twitterClient.promise.post('statuses/update', {status})

        res.redirect('/timeline')
    }))

    app.post('/reply', then(async (req, res) => {
        let status = req.body.text
        if (status.length > 140) {
            return req.flash('error', "Status is over 140 characters!")
        }
        if (!status) {
            return req.flash('error', "Status cannot be empty!")
        }
        await twitterClient.promise.post('statuses/update', {status})

        res.redirect('/timeline')
    }))


    app.post('/like/:id', then(async (req,res) =>{
        let id = req.params.id
        await twitterClient.promise.post('favorites/create', {id});
        res.end();
    }))

    app.post('/unlike/:id', then(async (req,res) =>{
        let id = req.params.id
        await twitterClient.promise.post('favorites/destroy', {id});
        res.end();
    }))

    app.get('/share/:id', (req, res) => {
        res.render('share.ejs', {message: req.flash('error')})
    })

    app.post('/share/:id', then(async (req,res) =>{
        let id = req.params.id
        try {
            let tweet = await twitterClient.promise.get('statuses/show.json?id='+id)
            await twitterClient.promise.post('statuses/retweet/'+id+'.json', {id});

            let twitterUrl = 'http://twitter.com/'+tweet.user.screen_name+'/status/'+id
            let status = req.body.text + " " + twitterUrl
            await twitterClient.promise.post('statuses/update/', {status});
            
            res.redirect('/timeline');
        }
        catch (e) {
            console.log(e)
        }
    }))


    app.get('/reply/:id/:username', (req, res) => {
        res.render('reply.ejs', {username: req.params.username, message: req.flash('error')})
    })

    app.post('/reply/:id/:username', then(async (req,res) =>{
        let id = req.params.id
        try {
            await twitterClient.promise.post('statuses/update/', {in_reply_to_status_id: id, status: req.body.text});
            res.redirect('/timeline');
        }
        catch (e) {
            console.log(e)
        }
    }))
}













