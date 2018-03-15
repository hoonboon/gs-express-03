var Book = require('../../models/book');
var Author = require('../../models/author');
var Genre = require('../../models/genre');
var BookInstance = require('../../models/bookInstance');

var async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.index = function(req, res) {
    async.parallel({
        book_count: function(callback) {
            Book.count(callback);
        }, 
        book_instance_count: function(callback) {
            BookInstance.count(callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.count({ status: 'Available' }, callback);
        }, 
        author_count: function(callback) {
            Author.count(callback);
        }, 
        genre_count: function(callback) {
            Genre.count(callback);
        }
    }, function(err, results) {
        res.render('index', { title: 'Local Library - Home', error: err, data: results });
    });
};

// Display list of all books.
exports.book_list = function (req, res, next) {
    Book.find({}, 'title author')
        .populate('author')
        .exec(function (err, list_books) {
            if (err) {
                return next(err);
            }
            res.render('book/list', { title: 'Book List', book_list: list_books });
        });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        }, 
        book_instance_list: function(callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book == null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        res.render('book/detail', {
            title: 'Book Title',
            book: results.book,
            book_instances: results.book_instance_list
        });
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel({
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        res.render('book/form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres
        });
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // convert multiple selection input into array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            }
            else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // field values validation
    body('title', 'Book Title is required.').isLength({ min: 1 }).trim(),
    body('author', 'Author is required.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary is required.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN is required.').isLength({ min: 1 }).trim(),

    // field values sanitization
    sanitizeBody('*').trim().escape(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var bookInput = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if (errors.isEmpty()) {
            bookInput.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect(bookInput.url);
            });
        }
        else {
            // re-populate all options
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                }

                // mark user-selected options as checked
                for (let i = 0; i < results.genres.length; i++) {
                    if (bookInput.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }

                res.render('book/form', {
                    title: 'Create Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: bookInput,
                    errors: errors.array()
                });
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .exec(callback);
        },
        book_instances: function(callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book == null) {
            res.redirect('/catalog/books');
        }
        res.render('book/delete', {
            title: 'Delete Book',
            book: results.book,
            bookInstances: results.book_instances
        });
    });
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.body.bookId)
                .exec(callback);
        },
        book_instances: function(callback) {
            BookInstance.find({ 'book': req.body.bookId })
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        
        // Book still has bookInstances, show book instances listing
        if (results.book_instances.length > 0) {
            res.render('book/delete', {
                title: 'Delete Book',
                book: results.book,
                bookInstances: results.book_instances
            });
        }
        // Book has no instances, delete book and show latest book list
        else {
            Book.findByIdAndRemove(req.body.bookId, function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/catalog/books');
            });
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book == null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        
        var bookGenreIds = results.book.genre.map(function(genre) {
            return genre._id.toString();
        });
        
        // mark user-selected options as checked
        for (let i = 0; i < results.genres.length; i++) {
            if (bookGenreIds.indexOf(results.genres[i]._id.toString()) > -1) {
                results.genres[i].checked = 'true';
            }
        }

        res.render('book/form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book: results.book
        });
    });
};

// Handle book update on POST.
exports.book_update_post = [
    // convert multiple selection input into array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            }
            else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    // field values validation
    body('title', 'Book Title is required.').isLength({ min: 1 }).trim(),
    body('author', 'Author is required.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary is required.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN is required.').isLength({ min: 1 }).trim(),

    // field values sanitization
    sanitizeBody('*').trim().escape(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var bookInput = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre,
            _id: req.params.id 
        });

        if (errors.isEmpty()) {
            Book.findByIdAndUpdate(req.params.id, bookInput, {}, function(err, bookUpdated) {
                if (err) {
                    return next(err);
                }
                res.redirect(bookUpdated.url);
            });
        }
        else {
            // re-populate all options
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                }

                // mark user-selected options as checked
                for (let i = 0; i < results.genres.length; i++) {
                    if (bookInput.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }

                res.render('book/form', {
                    title: 'Update Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: bookInput,
                    errors: errors.array()
                });
            });
        }
    }
];
