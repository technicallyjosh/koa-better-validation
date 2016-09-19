'use strict';

const request = require('supertest');
const app     = require('./app/app');

describe('Koa URL params validation', () => {
    it('should throw an error on all fields when values are incorrect', (done) => {
        request(app.listen()).post('/params/dhsud823893ej**$8/post/ajdii')
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
                    'username': 'alphaDash',
                    'postId'  : 'numeric',
                });

                done();
            });
    });

    it('should throw no errors when all values are correct', (done) => {
        request(app.listen()).post('/params/flash_is_here/post/88888')
            .end((err, res) => {
                res.statusCode.should.equal(200);
                res.body.should.be.an.Object;

                done();
            });
    });
});
