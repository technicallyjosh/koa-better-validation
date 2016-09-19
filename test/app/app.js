'use strict';

const app     = require('koa')();
const router  = require('koa-router')();
const koaBody = require('koa-better-body');

require('koa-qs')(app, 'extended');

const validate = require('../../lib/Validate');

app.use(koaBody({
    'multipart': true
}));

app.use(validate());

require('./query_routes')(app, router);
require('./header_routes')(app, router);
require('./param_routes')(app, router);
require('./post_routes')(app, router);
require('./file_routes')(app, router);

module.exports = app;
