var async = require('async');

var Genre = require('../../models/genre');
var Book = require('../../models/book');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter')

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function(err, list_genres) {
            if (err) {
                return next(err);
            }
            res.render('genre/list', { title: 'Genre List', genre_list: list_genres });
        });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
                .exec(callback);
        },
        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre == null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        res.render('genre/detail', {
            title: 'Genre Detail', 
            genre: results.genre,
            genre_books: results.genre_books
        });
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre/form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
    // validate the form field values
    body('name', 'Genre Name is required.').isLength({ min: 1 }).trim(),

    // sanitize (trim and escape) form field values
    sanitizeBody('name').trim().escape(),

    // process request after validation and sanitization
    (req, res, next) => {
        // extract the validation errors from the request
        const errors = validationResult(req);

        // create an object to store escaped and trimmed form input values
        var genreInput = new Genre({
            name: req.body.name
        });

        // if error exists
        if (!errors.isEmpty()) {
            // render the form again with sanitized values/ error messages
            res.render('genre/form', {
                title: 'Create Genre',
                genre: genreInput,
                errors: errors.array()
            });
        } 
        // form data is valid
        else {
            // check unique record - based on genre.name
            Genre.findOne({ 'name': genreInput.name })
                .exec(function(err, genreDb) {
                    if (err) {
                        return next(err);
                    }

                    // if found existing record
                    if (genreDb) {
                        // redirect to detail page
                        res.redirect(genreDb.url);
                    }
                    // if record not found
                    else {
                        // save new record into database and redirect to detail page
                        genreInput.save(function(err) {
                            if (err) {
                                return next(err);
                            }
                            res.redirect(genreInput.url);
                        });
                    }
                });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
                .exec(callback);
        },
        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre == null) {
            res.redirect('/catalog/genres');
        }
        res.render('genre/delete', {
            title: 'Delete Genre',
            genre: results.genre,
            genreBooks: results.genre_books
        });
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.body.genreId)
                .exec(callback);
        },
        genre_books: function(callback) {
            Book.find({ 'author': req.body.genreId })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        
        // Genre still has books, show genre book listing
        if (results.genre_books.length > 0) {
            res.render('author/delete', {
                title: 'Delete Genre',
                genre: results.genre,
                genreBooks: results.genre_books
            });
        }
        // Genre has no book, delete genre and show latest list
        else {
            Genre.findByIdAndRemove(req.body.genreId, function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/catalog/genres');
            });
        }
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre == null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }

        res.render('genre/form', {
            title: 'Update Genre',
            genre: results.genre
        });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
    // validate the form field values
    body('name', 'Genre Name is required.').isLength({ min: 1 }).trim(),

    // sanitize (trim and escape) form field values
    sanitizeBody('name').trim().escape(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var genreInput = new Genre({
            name: req.body.name,
            _id: req.params.id 
        });

        if (errors.isEmpty()) {
            Genre.findByIdAndUpdate(req.params.id, genreInput, {}, function(err, genreUpdated) {
                if (err) {
                    return next(err);
                }
                res.redirect(genreUpdated.url);
            });
        }
        else {
            res.render('genre/form', {
                title: 'Update Genre',
                genre: genreInput,
                errors: errors.array()
            });
        }
    }
];
