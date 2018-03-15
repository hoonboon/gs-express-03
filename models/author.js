var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
    firstName: { type: String, required: true, max: 100 },
    lastName: { type: String, required: true, max: 100 },
    dateOfBirth: { type: Date },
    dateOfDeath: { type: Date }
});

// Virtual for Author's full name
AuthorSchema
.virtual('fullName')
.get(function () {
    return this.lastName + ', ' + this.firstName;
});

// Virtual for Author's URL
AuthorSchema
.virtual('url')
.get(function() {
    return '/catalog/author/' + this._id;
});

// Virtual for Author's Date of Birth for display
AuthorSchema
.virtual('dateOfBirthDisplay')
.get(function () {
    return this.dateOfBirth ? moment(this.dateOfBirth).format('MMM Do, YYYY') : '?';
});

// Virtual for Author's Date of Death for display
AuthorSchema
.virtual('dateOfDeathDisplay')
.get(function () {
    return this.dateOfDeath? moment(this.dateOfDeath).format('MMM Do, YYYY') : '?';
});

// Virtual for Author's lifespan
AuthorSchema
.virtual('lifespan')
.get(function () {
    return this.dateOfBirthDisplay + ' - ' + this.dateOfDeathDisplay;
});

// Virtual for Author's Date of Birth for form input
AuthorSchema
.virtual('dateOfBirthInput')
.get(function () {
    return this.dateOfBirth ? moment(this.dateOfBirth).format('YYYY-MM-DD') : '';
});

// Virtual for Author's Date of Death for form input
AuthorSchema
.virtual('dateOfDeathInput')
.get(function () {
    return this.dateOfDeath? moment(this.dateOfDeath).format('YYYY-MM-DD') : '';
});

// export model
module.exports = mongoose.model('Author', AuthorSchema);
