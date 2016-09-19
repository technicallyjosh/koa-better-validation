'use strict';

const request = require('supertest');
const app     = require('./app/app');
const fs      = require('co-fs-extra');
const co      = require('co');

describe('Koa request file validation', () => {
    it('should throw the required rule errors when conditions don\'t match', (done) => {
        request(app.listen()).post('/files')
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
                    jsFile : 'required',
                    imgFile: 'required'
                });

                done();
            });
    });

    it('should throw proper errors when the file validation condition fails', (done) => {
        request(app.listen()).post('/files')
            .attach('jsFile', `${__dirname}/../lib/Validate.js`)
            .attach('imgFile', `${__dirname}/../lib/Filters.js`)
            .attach('imgFile1', `${__dirname}/../lib/Rules.js`)
            .attach('imgFile2', `${__dirname}/../lib/FileRules.js`)
            .attach('pkgFile', `${__dirname}/../README.md`)
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
                    imgFile1: 'mime',
                    imgFile2: 'extension',
                    pkgFile : 'name',
                    jsFile  : 'size',
                    imgFile : 'image'
                });

                done();
            });
    });

    it('should pass when the validations return no errors', (done) => {
        request(app.listen()).post('/files')
            .attach('jsFile', `${__dirname}/../lib/rules.js`)
            .attach('imgFile', `${__dirname}/files/redpanda.jpg`)
            .attach('imgFile1', `${__dirname}/files/redpanda.jpg`)
            .attach('imgFile2', `${__dirname}/files/redpanda.jpg`)
            .attach('pkgFile', `${__dirname}/../package.json`)
            .end((err, res) => {
                res.statusCode.should.equal(200);
                res.body.should.be.an.Object;
                done();
            });
    });

    it('should delete the temp uploaded file when the validation fails and deleteOnFail set to true', (done) => {
        request(app.listen()).post('/deleteOnFail')
        .attach('imgFile', `${__dirname}/../lib/rules.js`)
        .attach('jsFile', `${__dirname}/files/redpanda.jpg`)
        .end((err, res) => {
            res.statusCode.should.equal(422);
            res.body.should.be.an.Array;

            (co.wrap(function* () {
                for (let i = 0; i < res.body.length; ++i) {
                    (yield fs.exists(res.body[i])).should.equal(false);
                }
            })()).then(done, done);
        });
    });

    it('should apply the file action after the file has been validated', (done) => {
        const jsFile = `${__dirname}/../lib/rules.js`;
        const imgFile = `${__dirname}/files/redpanda.jpg`;

        request(app.listen()).post('/fileActions')
            .attach('jsFile', jsFile)
            .attach('imgFile', imgFile)
            .end((err, res) => {
                res.statusCode.should.equal(422);

                res.body.should.be.an.Object;
                res.body.should.have.property('tmpFiles');
                res.body.should.have.property('errors');
                res.body.tmpFiles.should.have.property('jsFile');
                res.body.tmpFiles.should.have.property('imgFile');

                (co.wrap(function* () {
                    (yield fs.exists(jsFile)).should.equal(true);
                    (yield fs.exists(imgFile)).should.equal(true);

                    yield fs.remove(`${__dirname}/app/tmp`);
                })()).then(done, done);
            });
    });

    after(() => {
        (co.wrap(function* () {
            yield fs.remove(`${__dirname}/files/tmp`);
        })());
    });
});
