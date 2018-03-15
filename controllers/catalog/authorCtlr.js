var Author = require('../../models/author');
var Book = require('../../models/book');

var async = require('async');
var debug = require('debug')('authorCtrl');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all Authors.
exports.author_list = function(req, res, next) {
    Author.find()
        .sort([['lastName', 'ascending']])
        .exec(function(err, list_authors) {
            if (err) {
                debug('author_list ' + err);
                return next(err);
            }
            res.render('author/list', { title: 'Author List', author_list: list_authors });
        });
};

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback);
        },
        author_books: function(callback) {
            Book.find({ 'author': req.params.id }, 'title summary')
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            debug('author_detail ' + err);
            return next(err);
        }
        if (results.author == null) {
            var err = new Error('Author not found');
            err.status = 404;
            debug('author_detail ' + err);
            return next(err);
        }
        res.render('author/detail', {
            title: 'Author Detail',
            author: results.author,
            author_book_list: results.author_books
        });
    });
};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
    res.render('author/form', { title: 'Create Author' });
};

// Handle Author create on POST.
exports.author_create_post = [
    // validate values
    body('firstName')
        .isLength({ min: 1 }).trim().withMessage('First Name is required.')
        .isAlphanumeric().withMessage('First Name should contain only alpha-numeric characters.'),
    body('lastName')
        .isLength({ min: 1 }).trim().withMessage('Last Name is required.')
        .isAlphanumeric().withMessage('Last Name should contain only alpha-numeric characters.'),
    body('dateOfBirth', 'Date of Birth is invalid.').optional({ checkFalsy: true }).isISO8601(),
    body('dateOfDeath', 'Date of Death is invalid.').optional({ checkFalsy: true }).isISO8601(),

    // sanitize values
    sanitizeBody('firstName').trim().escape(),
    sanitizeBody('lastName').trim().escape(),
    sanitizeBody('dateOfBirth').toDate(),
    sanitizeBody('dateOfDeath').toDate(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);
        var authorInput = new Author({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            dateOfBirth: req.body.dateOfBirth,
            dateOfDeath: req.body.dateOfDeath
        });

        if (errors.isEmpty()) {
            authorInput.save(function(err) {
                if (err) {
                    debug('author_create_post ' + err);
                    return next(err);
                }
                res.redirect(authorInput.url);
            });
        }
        else {
            res.render('author/form', {
                title: 'Create Author',
                author: authorInput,
                errors: errors.array()
            });
        }
    }
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback);
        },
        author_books: function(callback) {
            Book.find({ 'author': req.params.id })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            debug('author_delete_get ' + err);
            return next(err);
        }
        if (results.author == null) {
            res.redirect('/catalog/authors');
        }
        res.render('author/delete', {
            title: 'Delete Author',
            author: results.author,
            authorBooks: results.author_books
        });
    });
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.body.authorId)
                .exec(callback);
        },
        author_books: function(callback) {
            Book.find({ 'author': req.body.authorId })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            debug('author_delete_post ' + err);
            return next(err);
        }
        
        // Author still has books, show author book listing
        if (results.author_books.length > 0) {
            res.render('author/delete', {
                title: 'Delete Author',
                author: results.author,
                authorBooks: results.author_books
            });
        }
        // Author has no book, delete author and show latest author list
        else {
            Author.findByIdAndRemove(req.body.authorId, function(err) {
                if (err) {
                    debug('author_delete_post ' + err);
                    return next(err);
                }
                res.redirect('/catalog/authors');
            });
        }
    });
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            debug('author_update_get ' + err);
            return next(err);
        }
        if (results.author == null) {
            var err = new Error('Author not found');
            err.status = 404;
            debug('author_update_get ' + err);
            return next(err);
        }

        res.render('author/form', {
            title: 'Update Author',
            author: results.author
        });
    });
};

// Handle Author update on POST.
exports.author_update_post = [
    body('firstName')
        .isLength({ min: 1 }).trim().withMessage('First Name is required.')
        .isAlphanumeric().withMessage('First Name should contain only alpha-numeric characters.'),
    body('lastName')
        .isLength({ min: 1 }).trim().withMessage('Last Name is required.')
        .isAlphanumeric().withMessage('Last Name should contain only alpha-numeric characters.'),
    body('dateOfBirth', 'Date of Birth is invalid.').optional({ checkFalsy: true }).isISO8601(),
    body('dateOfDeath', 'Date of Death is invalid.').optional({ checkFalsy: true }).isISO8601(),

    // sanitize values
    sanitizeBody('firstName').trim().escape(),
    sanitizeBody('lastName').trim().escape(),
    sanitizeBody('dateOfBirth').toDate(),
    sanitizeBody('dateOfDeath').toDate(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var authorInput = new Author({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            dateOfBirth: req.body.dateOfBirth,
            dateOfDeath: req.body.dateOfDeath,
            _id: req.params.id 
        });

        if (errors.isEmpty()) {
            Author.findByIdAndUpdate(req.params.id, authorInput, {}, function(err, authorUpdated) {
                if (err) {
                    debug('author_update_post ' + err);
                    return next(err);
                }
                res.redirect(authorUpdated.url);
            });
        }
        else {
            res.render('author/form', {
                title: 'Update Author',
                author: authorInput,
                errors: errors.array()
            });
        }
    }
];
