# Koa Better Validation

[![npm version](https://badge.fury.io/js/koa-better-validation.svg)](https://badge.fury.io/js/koa-better-validation) [![Build Status](https://travis-ci.org/technicallyjosh/koa-better-validation.svg?branch=master)](https://travis-ci.org/technicallyjosh/koa-better-validation)

Koa Better Validation is a more up-to-date "fork" of [koa-validation](https://github.com/srinivasiyer/koa-validation).
You can validate request params, querystring values, bodies, and even files.

You can also extend this module to add custom validations, filters, and rules.

## Install

```
npm install koa-better-validation
```

## Field Validations

```js
const app     = require('koa')();
const router  = require('koa-router')();
const koaBody = require('koa-better-body');

require('koa-qs')(app, 'extended');

const validate = require('koa-better-validation');

app.use(koaBody({
    'multipart': true
}));

app.use(validate());

router.post('/', function *(){
    yield this.validateBody({
        name     : 'required|minLength:4',
        girlfiend: 'requiredIf:age,25',
        wife     : 'requiredNotIf:age,22',
        foo      : 'requiredWith:bar,baz',
        foobar   : 'requiredWithAll:barbaz,bazbaz',
        gandalf  : 'requiredWithout:Saruman',
        tyrion   : 'requiredWithoutAll:tywin,cercei',
        age      : 'numeric',
        teenage  : 'digitsBetween:13,19',
        date     : 'dateFormat:MMDDYYYY',
        birthdate: 'date',
        past     : 'before:2015-10-06',
        future   : 'after:2015-10-07',
        gender   : 'in:male, female',
        genres   : 'notIn:Pop,Metal',
        grade    : 'accepted',
        nickname : 'alpha',
        nospaces : 'alphaDash',
        email    : 'email',
        alphanum : 'alphaNumeric',
        password : 'between:6,15'
    }, {
        'name.required': 'The name field is a required one'
    }, {
        before: {
            name    : 'lowercase',
            nickname: 'uppercase',
            snum    : 'integer',
            sword   : 'trim',
            lword   : 'ltrim',
            rword   : 'rtrim',
            dnum    : 'float',
            bword   : 'boolean',
        },

        after: {
            obj    : 'json',
            eword  : 'escape',
            reword : 'replace:come,came',
            shaword: 'sha1',
            mdword : 'md5',
            hexword: 'hex:sha256'
        }
    });

    if (this.validationErrors) {
        this.status = 422;
        this.body = this.validationErrors;
        return;
    }

    this.body = { success: true };
});

```

## File Validations

```js
const app     = require('koa')();
const router  = require('koa-router')();
const koaBody = require('koa-better-body');

require('koa-qs')(app, 'extended');

const validate = require('koa-better-validation');

app.use(koaBody({
    'multipart': true
}));

app.use(validate());

router.post('/files', function* () {
    yield this.validateFiles({
        'jsFile'  :'required|size:min,10kb,max,20kb',
        'imgFile' : 'required|image',
        'imgFile1': 'mime:jpg',
        'imgFile2': 'extension:jpg',
        'pkgFile' : 'name:package'
    }, true, {}, {
        jsFile: {
            action: 'move',
            args: `${__dirname}/../files/tmp/rules.js`,
            callback: function* (validator, file, destination) {
                validator.addError(file, 'action', 'move', 'Just checking if the callback action works!!')
            }
        },
        imgFile: [
            {
                action: 'copy',
                args: __dirname + '/../files/tmp/panda.jpg'
            },
            {
                action: 'delete'
            }
        ]
    });

    if (this.validationErrors) {
        this.status = 422;
        this.body = this.validationErrors;
        return;
    }

    this.body = { success: true };
});

app.use(router.routes()).use(router.allowedMethods());

```

Currently it works like the original package `koa-validation`. Until we get our
own in-depth documentation, you can
[check out the original documentation](https://koa-validation.readme.io).

## License

[MIT](LICENSE)
