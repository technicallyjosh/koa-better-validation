'use strict';

const FieldValidator = require('./fieldValidator');
const FileValidator  = require('./fileValidator');
const RequiredRules  = require('./requiredRules');
const Rules          = require('./rules');
const Filters        = require('./filters');
const FileRules      = require('./fileRules');
const FileActions    = require('./fileActions');

module.exports = () => {
    return function* (next) {
        let validator;

        this.validateBody = function* (rules, messages, filters) {
            let fields = {};

            if (this.request.body && this.request.body.fields) {
                fields = this.request.body.fields;
            } else if (this.request.body) {
                fields = this.request.body;
            }

            validator = new FieldValidator(
                this,
                fields,
                rules,
                messages || {},
                filters || {}
            );

            yield validator.valid;
        };

        this.validateParams = function* (rules, messages, filters) {
            validator = new FieldValidator(
                this,
                this.params || {},
                rules,
                messages || {},
                filters || {}
            );

            yield validator.valid;
        };

        this.validateQueries = function* (rules, messages, filters) {
            validator = new FieldValidator(
                this,
                this.request.query || {},
                rules,
                messages || {},
                filters || {}
            );

            yield validator.valid;
        };

        this.validateHeaders = function* (rules, messages, filters) {
            validator = new FieldValidator(
                this,
                this.headers || {},
                rules,
                messages || {},
                filters || {}
            );

            yield validator.valid;
        };

        this.validateFiles = function* (rules, deleteOnFail, messages, actions) {
            const files = (this.request.body && this.request.body.files)
                ? this.request.body.files
                : {};

            validator = new FileValidator(
                this,
                files,
                rules,
                deleteOnFail || false,
                messages || {},
                actions || {}
            );

            yield validator.valid;
        };

        yield next;
    };
};

module.exports.RequiredRules = RequiredRules;
module.exports.Rules         = Rules;
module.exports.FileRules     = FileRules;
module.exports.Filters       = Filters;
module.exports.FileActions   = FileActions;
