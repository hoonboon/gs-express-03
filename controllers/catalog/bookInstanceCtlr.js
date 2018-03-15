var BookInstance = require('../../models/bookInstance');
var Book = require('../../models/book');

var async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    BookInstance.find()
        .populate('book')
        .exec(function(err, list_bookInstances) {
            if (err) {
                return next(err);
            }
            res.render('bookInstance/list', {
                title: 'Book Instance List',
                bookInstance_list: list_bookInstances
            });
        });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function(err, bookInstance) {
            if (err) {
                return next(err);
            }
            if (bookInstance == null) {
                var err = new Error('Book Instance not found.');
                err.status = 404;
                return next(err);
            }
            res.render('bookInstance/detail', {
                title: 'Book Instance Detail',
                bookInstance: bookInstance
            });
        });
};

function getStatusOptions() {
    var statusOptions = [
        { label: 'Maintenance', value: 'Maintenance' }, 
        { label: 'Available', value: 'Available' }, 
        { label: 'Loaned', value: 'Loaned' }, 
        { label: 'Reserved', value: 'Reserved' }
    ];
    return statusOptions;
}

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    Book.find({}, 'title')
        .exec(function(err, books_list) {
            if (err) {
                return next(err);
            }
            res.render('bookInstance/form', {
                title: 'Create Book Instance',
                books: books_list,
                statusOptions: getStatusOptions()
            });
        });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    // field value validation
    body('book', 'Book is required.').isLength({ min: 1 }).trim(),
    body('imprint', 'Imprint is required.').isLength({ min: 1 }).trim(),
    body('dueBack', 'Due Back Date is invalid.').optional({ checkFalsy: true }).isISO8601(),

    // field value sanization
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('dueBack').toDate(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var bookInstanceInput = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            dueBack: req.body.dueBack
        });

        if (errors.isEmpty()) {
            bookInstanceInput.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect(bookInstanceInput.url);
            });
        }
        else {
            Book.find({}, 'title')
                .exec(function(err, books_list) {
                    if (err) {
                        return next(err);
                    }
                    res.render('bookInstance/form', {
                        title: 'Create Book Instance',
                        bookInstance: bookInstanceInput,
                        books: books_list,
                        statusOptions: getStatusOptions(),
                        errors: errors.array()
                    });
                });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    async.parallel({
        bookInstance: function(callback) {
            BookInstance.findById(req.params.id )
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.bookInstance == null) {
            res.redirect('/catalog/bookinstances');
        }
        res.render('bookinstance/delete', {
            title: 'Delete Book Instance',
            bookInstance: results.bookInstance
        });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
    async.parallel({
        bookInstance: function(callback) {
            BookInstance.findById(req.body.bookInstId)
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        
        // Delete book instance and show latest list
        BookInstance.findByIdAndRemove(req.body.bookInstId, function(err) {
            if (err) {
                return next(err);
            }
            res.redirect('/catalog/bookinstances');
        });
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    async.parallel({
        bookInstance: function(callback) {
            BookInstance.findById(req.params.id)
                .populate('book')
                .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.bookInstance == null) {
            var err = new Error('Book Instance not found');
            err.status = 404;
            return next(err);
        }

        res.render('bookinstance/form', {
            title: 'Update Book Instance',
            bookInstance: results.bookInstance,
            statusOptions: getStatusOptions()
        });
    });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    // field value validation
    body('imprint', 'Imprint is required.').isLength({ min: 1 }).trim(),
    body('dueBack', 'Due Back Date is invalid.').optional({ checkFalsy: true }).isISO8601(),

    // field value sanization
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('dueBack').toDate(),

    // process request
    (req, res, next) => {
        const errors = validationResult(req);

        var bookInstanceInput = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            dueBack: req.body.dueBack,
            _id: req.params.id 
        });

        if (errors.isEmpty()) {
            BookInstance.findByIdAndUpdate(req.params.id, bookInstanceInput, {}, function(err, bookInstanceUpdated) {
                if (err) {
                    return next(err);
                }
                res.redirect(bookInstanceUpdated.url);
            });
        }
        else {
            // re-populate all options
            async.parallel({
                book: function(callback) {
                    Book.findById(bookInstanceInput.book)
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

                bookInstanceInput.book = results.book;

                res.render('bookinstance/form', {
                    title: 'Update Book Instance',
                    bookInstance: bookInstanceInput,
                    statusOptions: getStatusOptions(),
                    errors: errors.array()
                });
            });
        }
    }
];
