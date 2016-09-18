'use strict';

const RequiredRules = require('./requiredRules');
const Rules         = require('./rules');
const Filters       = require('./filters');

class FieldValidator {
    constructor(context, fields, rules, messages, filters) {
        this.ctx           = context;
        this.fields        = fields;
        this.rule          = {};
        this.validations   = {};
        this.filters       = new Filters(this);
        this.rules         = new Rules(this);
        this.requiredRules = new RequiredRules(this);

        this.parseRulesAndFilters(rules, messages, filters);
    }

    parseKey(key, data) {
        let value;

        const keySplit = key.split('.').filter((e) => e !== '');

        keySplit.forEach((item) => {
            if (typeof value === 'undefined') {
                value = data && data[item];
            } else {
                value = value[item];
            }
        });

        return value;
    }

    addError(key, type, rule, message) {
        if (!this.ctx.validationErrors) {
            this.ctx.validationErrors = [];
        }

        const e = {
            [key]: {
                type,
                message
            }
        };

        if (type === 'filter') {
            e[key].filter = rule;
        } else {
            e[key].rule = rule;
        }

        this.ctx.validationErrors.push(e);
    }

    changeFieldValue(key, value) {
        key = key.split('.');

        if (typeof key[1] === 'undefined') {
            if (typeof this.fields[key[0]] !== 'undefined') {
                this.fields[key[0]] = value;
            }
        } else {
            let lastField = this.fields;

            for (let i = 0; i < key.length; ++i) {
                if (typeof lastField[key[i]] === 'undefined') {
                    break;
                }

                if (i === key.length - 1) {
                    lastField[key[i]] = value;
                } else {
                    lastField = lastField[key[i]];
                }
            }
        }

        return;
    }

    parseRulesAndFilters(rules, messages, filters) {
        filters.before = filters.before || {};
        filters.after  = filters.after || {};

        for (let r in rules) { //eslint-disable-line prefer-const
            const rule = rules[r];

            if (!this.validations[r]) {
                this.validations[r] = {
                    field   : r,
                    value   : this.parseKey(r, this.fields),
                    required: false,
                    rules   : [],
                    filters : {
                        before: [],
                        after : []
                    }
                };
            }

            if (typeof rule === 'object') {
                for (let error in rule) { // eslint-disable-line prefer-const
                    this.rule = { rule: error };

                    if (Array.isArray(rule[error]) && rule[error].length) {
                        this.rule.args = (rule[error].length > 1) ? rule[error]: rule[error][0];
                    }

                    this.populateRule(r, rule, messages);
                }
            } else {
                const rsplit = rules[r].split('|');

                for (let rs in rsplit) { // eslint-disable-line prefer-const
                    const argsplit = rsplit[rs].split(':');

                    if (typeof argsplit[1] !== 'undefined') {
                        const args = argsplit[1].split(',');

                        this.rule = {
                            rule: argsplit[0],
                            args: (args.length > 1) ? args : args[0]
                        };
                    } else {
                        this.rule = { rule: argsplit[0] };
                    }

                    this.populateRule(r, argsplit[0], messages);
                }
            }
        }

        for (let filter in filters.before) { // eslint-disable-line prefer-const
            this.populateFilters('before', filter, filters.before[filter]);
        }

        for (let filter in filters.after) { // eslint-disable-line prefer-const
            this.populateFilters('after', filter, filters.after[filter]);
        }
    }

    populateRule(field, rule, messages) {
        const key = `${field}.${rule}`;

        let message = messages[key] || messages[rule];

        if (message) {
            if (message.indexOf(':attribute') !== -1) {
                message = message.replace(':attribute', field);
            }

            if (message.indexOf(':value') !== -1) {
                if (typeof this.validations[field].value === 'object') {
                    message = message.replace(':value', JSON.stringify(this.validations[field].value));
                } else if (typeof this.validations[field].value === 'undefined') {
                    message = message.replace(':value', 'undefined');
                } else {
                    message = message.replace(':value', this.validations[field].value.toString());
                }
            }
        }

        this.rule.message = message;

        if (typeof this.requiredRules[this.rule.rule] === 'function') {
            this.validations[field].rules.unshift(this.rule);
        } else {
            this.validations[field].rules.push(this.rule);
        }
    }

    populateFilters(type, field, filters) {
        let fSplit, fargsSplit, typeFilters, args;

        if (!this.validations[field]) {
            this.validations[field] = {
                field: field,
                value: this.parseKey(field, this.fields),
                required: false,
                rules: [],
                filters: {
                    before: [],
                    after: []
                }
            };
        }

        if (type === 'before') {
            typeFilters = this.validations[field].filters.before;
        } else if (type === 'after') {
            typeFilters = this.validations[field].filters.after;
        }

        if (typeof filters === 'object') {
            for (let ef in filters) { // eslint-disable-line prefer-const
                if (Array.isArray(filters[ef]) && filters[ef].length) {
                    typeFilters.push({ filter: ef, args: filters[ef] });
                }
            }
        } else {
            fSplit = filters.split('|');

            for (let f = 0; f < fSplit.length; ++f) {
                fargsSplit = fSplit[f].split(':');
                if (typeof fargsSplit[1] !== 'undefined') {
                    args = fargsSplit[1].split(',');
                    typeFilters.push({ filter: fargsSplit[0], args: args });
                } else {
                    typeFilters.push({ filter: fargsSplit[0] });
                }
            }
        }
    }

    get valid() {
        return this.applyRulesAndFilters();
    }

    * applyRulesAndFilters() {
        const fieldValidations = [];

        for (let val in this.validations) { // eslint-disable-line prefer-const
            fieldValidations.push(this.evaluateField(this.validations[val]));
        }

        if (fieldValidations.length) {
            yield fieldValidations;
        }

        return !(this.ctx.validationErrors && this.ctx.validationErrors.length);
    }

    * evaluateField(field) {
        let proceed = true;

        // TODO: seems overcomplicated, have to understand a bit more
        for (let i = 0; i < field.filters.before.length; ++i) {
            const filter = this.filters[field.filters.before[i].filter];

            if (typeof filter !== 'undefined') {
                if (typeof field.value !== 'undefined' && field.value !== null) {
                    const args = [field.field, field.value].concat(field.filters.before[i].args || []);

                    field.value = yield filter.apply(this.filters, args);

                    if (typeof field.value === 'undefined') {
                        break;
                    }

                    this.changeFieldValue(field.field, field.value);
                }
            } else {
                this.addError(field.field, 'filter', field.rules[i].rule, `Invalid before filter: ${field.filters.before[i].filter} does not exist`);
                proceed = false;

                break;
            }
        }

        if (!proceed) {
            return;
        }

        // TODO: make this a single function for each condition that accepts what to apply to rules

        for (let r = 0; r < field.rules.length; ++r) {
            // TODO: readability first right now.
            // probably will split out to function to return based on index
            const requiredRule = this.requiredRules[field.rules[r].rule];
            const rule         = this.rules[field.rules[r].rule];

            if (typeof requiredRule === 'function') {
                const ruleArgs = [field.field, field.value];

                if (field.rules[r].args) {
                    ruleArgs.push(field.rules[r].args);
                }

                if (field.rules[r].message) {
                    ruleArgs.push(field.rules[r].message);
                }

                if (yield requiredRule.apply(this.requiredRules, ruleArgs)) {
                    field.required = true;
                } else {
                    proceed = false;
                    break;
                }
            } else if (typeof rule === 'function') {
                if ((!field.required && typeof field.value !== 'undefined') || field.required) {
                    const ruleArgs = [field.field, field.value];

                    if (field.rules[r].args) {
                        ruleArgs.push(field.rules[r].args);
                    }

                    if (field.rules[r].message) {
                        ruleArgs.push(field.rules[r].message);
                    }

                    if (!(yield rule.apply(this.rules, ruleArgs))) {
                        proceed = false;
                        break;
                    }
                } else {
                    proceed = false;
                    break;
                }
            } else {
                this.addError(field.field, 'rule', field.rules[r].rule, `Invalid Validation Rule: ${field.rules[r].rule} does not exist`);
                proceed = false;
                break;
            }
        }

        if (!proceed) {
            return;
        }

        // TODO: move to function for before and after filters because they are identical
        for (let i = 0; i < field.filters.after.length; ++i) {
            if (typeof this.filters[field.filters.after[i].filter] !== 'undefined') {
                if (typeof field.value !== 'undefined' && field.value.toString().trim()) {
                    field.value = yield this.filters[field.filters.after[i].filter].apply(this.filters, [field.field, field.value].concat( field.filters.after[i].args || [] ));

                    if (typeof field.value !== 'undefined') {
                        proceed = false;
                        break;
                    }

                    this.changeFieldValue(field.field, field.value);
                }
            } else {
                this.addError(field.field, 'filter', field.filters.after[i].filter, `Invalid after filter: ${field.filters.after[i].filter} does not exist`);
                proceed = false;

                break;
            }
        }

        return;
    }
}

module.exports = FieldValidator;
