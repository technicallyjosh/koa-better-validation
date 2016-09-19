'use strict';

const request = require('supertest');
const app     = require('./app/app');

describe('Koa header fields Validation', () => {
    it('Should throw the required rule errors when conditions dont match', (done) => {
        request(app.listen()).get('/headers')
            .end((err, res) => {
                res.statusCode.should.equal(422);
                res.body.should.be.an.Array;

                const errorFields = {};

                res.body.forEach((objs) => {
                    for (let o in objs) { // eslint-disable-line prefer-const
                        errorFields[o] = objs[o].rule;
                    }
                });

                errorFields.should.have.properties({
                    'content-type'   : 'required',
                    'x-authorization': 'required',
                    'x-origin-ip'    : 'required',
                });

                done();
            });
    });

    it('should throw an error on all fields when values are incorrect', (done) => {
        request(app.listen()).get('/headers')
            .set('content-type', 'application/flash')
            .set('x-authorization', 'woodoo')
            .set('x-origin-ip', '2000.123.234.234')
            .end((err, res) => {
                res.statusCode.should.equal(422);
                res.body.should.be.an.Array;

                const errorFields = {};

                res.body.forEach((objs) => {
                    for (let o in objs) { // eslint-disable-line prefer-const
                        errorFields[o] = objs[o].rule;
                    }
                });

                errorFields.should.have.properties({
                    'content-type'   : 'equals',
                    'x-authorization': 'between',
                    'x-origin-ip'    : 'ip',
                });

                done();
            });
    });

    it('should throw no errors when all values are correct', (done) => {
        request(app.listen()).get('/headers')
            .set('content-type', '   application/JSON   ')
            .set('x-authorization', 'thisismorethantwentychars')
            .set('x-origin-ip', '200.123.234.234')
            .end((err, res) => {
                res.statusCode.should.equal(200);
                res.body.should.be.an.Object;

                done();
            });
    });
});
