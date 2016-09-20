'use strict';

const BaseValidator = require('./BaseValidator');
const FileRules     = require('./FileRules');
const FileActions   = require('./FileActions');

class FileValidator extends BaseValidator {
    constructor(context, fields, rules, deleteOnFail, messages, actions) {
        super(context, fields);

        this.rules   = new FileRules(this);
        this.actions = new FileActions(this);

        this.parseRulesAndActions(rules, deleteOnFail, messages, actions);
    }

    parseRulesAndActions(rules, deleteOnFail, messages, actions) {
        let rsplit;
        let argsplit;
        let args;

        for (let r in rules) { // eslint-disable-line prefer-const
            if (!this.validations[r]) {
                this.validations[r] = {
                    field: r,
                    value: this.parseKey(r, this.fields),
                    required: false,
                    rules: [],
                    actions: [],
                    deleteOnFail: deleteOnFail
                };
            }

            if (typeof rules[r] === 'object') {
                for (let er in rules[r]) { // eslint-disable-line prefer-const
                    this.rule = { rule: er };

                    if (Array.isArray(rules[r][er]) && rules[r][er].length) {
                        this.rule.args = (rules[r][er].length > 1) ? rules[r][er]: rules[r][er][0];
                    }

                    this.populateRule(r, rules[r], messages);
                }
            } else {
                rsplit = rules[r].split('|');

                for (let rs in rsplit) { // eslint-disable-line prefer-const
                    argsplit = rsplit[rs].split(':');
                    if (typeof argsplit[1] !== 'undefined') {
                        args = argsplit[1].split(',');
                        this.rule = { rule: argsplit[0], args: (args.length > 1) ? args: args[0] };
                    } else {
                        this.rule = { rule: argsplit[0] };
                    }

                    this.populateRule(r, argsplit[0], messages);
                }
            }
        }

        for (let a in actions) { // eslint-disable-line prefer-const
            if (!this.validations[a]) {
                this.validations[a] = {
                    field: a,
                    value: this.parseKey(a, this.fields),
                    required: false,
                    rules: [],
                    actions: []
                };
            }

            if (typeof actions[a] === 'object') {
                if (Array.isArray(actions[a])) {
                    for (let i = 0; i < actions[a].length; ++i) {
                        this.populateAction(a, actions[a][i]);
                    }
                } else {
                    this.populateAction(a, actions[a]);
                }
            }
        }
    }

    populateAction(field, action) {
        let eachAction;

        if (typeof action !== 'undefined') {
            if (typeof action === 'object') {
                if (Array.isArray(action)) {
                    for (let i = 0; i < action.length; ++i) {
                        eachAction      = { action: action[i].action };
                        eachAction.args = action.args[i];

                        if (action.callback
                            && typeof action.callback === 'function'
                            && action.callback.constructor
                            && action.callback.constructor.name === 'GeneratorFunction') {

                            eachAction.callback = action.callback;
                        }

                        this.validations[field].actions.push(eachAction);
                    }
                } else {
                    eachAction = { action: action.action };
                    eachAction.args = action.args;

                    if (action.callback
                        && typeof action.callback === 'function'
                        && action.callback.constructor
                        && action.callback.constructor.name === 'GeneratorFunction') {

                        eachAction.callback = action.callback;
                    }

                    this.validations[field].actions.push(eachAction);
                }
            }

            eachAction = null;
        }
    }

    get valid() {
        return this.applyValidations();
    }

    * evaluateField(field) {
        let proceed = true;

        if (field.rules.length) {
            for (let r = 0; r < field.rules.length; ++r) {
                if (typeof this.requiredRules[field.rules[r].rule] === 'function') {
                    const ruleArgs = [field.field, field.value];

                    if (field.rules[r].args && field.rules[r].args.length) {
                        ruleArgs.push(field.rules[r].args);
                    }

                    if (field.rules[r].message) {
                        ruleArgs.push(field.rules[r].message);
                    }

                    if (yield this.requiredRules[field.rules[r].rule].apply(this.requiredRules, ruleArgs)) {
                        field.required = true;
                    } else {
                        proceed = false;
                        break;
                    }
                } else if (typeof this.rules[field.rules[r].rule] === 'function') {
                    if ((!field.required && typeof field.value !== 'undefined') || field.required) {
                        const ruleArgs = [field.field, field.value, field.deleteOnFail];

                        if (field.rules[r].args && field.rules[r].args.length) {
                            ruleArgs.push(field.rules[r].args);
                        }

                        if (field.rules[r].message) {
                            ruleArgs.push(field.rules[r].message);
                        }

                        if (!(yield this.rules[field.rules[r].rule].apply(this.rules, ruleArgs))) {
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
        }

        if (!proceed) {
            return;
        }

        let fieldAction;

        if (field.actions.length) {
            for (let a = 0; a < field.actions.length; ++a) {
                if (typeof this.actions[field.actions[a].action] !== 'undefined') {
                    if (typeof field.value !== 'undefined') {
                        const args = [field.field, field.value, field.deleteOnFail, field.actions[a].args || []];

                        if (field.actions[a].callback) {
                            args.push(field.actions[a].callback);
                        }

                        fieldAction = yield this.actions[field.actions[a].action].apply( this.actions, args );

                        if (!fieldAction) {
                            break;
                        }
                    }
                } else {
                    this.addError(field.field, 'action', field.actions[a].action, `Invalid action: ${field.actions[a].action} does not exist`);
                    proceed = false;
                    break;
                }
            }
        }

        return;
    }
}

module.exports = FileValidator;
