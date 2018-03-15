var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var BookInstanceSchema = new Schema({
    book: { type: Schema.ObjectId, ref: 'Book', required: true },
    imprint: { type: String, required: true },
    status: { 
        type: String, 
        required: true, 
        enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], 
        default: 'Maintenance' 
    },
    dueBack: { type: Date, default: Date.now }
});

// Virtual for BookInstance's URL
BookInstanceSchema
.virtual('url')
.get(function() {
    return '/catalog/bookInstance/' + this._id;
});

// Virtual for BookInstance's Due Back date for display
BookInstanceSchema
.virtual('dueBackDisplay')
.get(function() {
    return this.dueBack ? moment(this.dueBack).format('ddd MMM Do, YYYY') : '';
});

// Virtual for BookInstance's Due Back date for form input
BookInstanceSchema
.virtual('dueBackInput')
.get(function() {
    return this.dueBack ? moment(this.dueBack).format('YYYY-MM-DD') : '';
});

// export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
