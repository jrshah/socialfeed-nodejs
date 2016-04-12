let mongoose = require('mongoose')
let crypto = require('crypto')
let nodeify = require('bluebird-nodeify')

let userSchema = mongoose.Schema({
    email: String,
    password: String,
    provider_id: String,
    provider: String,
    profile: Object,
})

module.exports = mongoose.model('User', userSchema)