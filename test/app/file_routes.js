'use strict';

module.exports = function (app, router) {

    router.post('/files', function* () {
        yield this.validateFiles({
            'jsFile':'required|size:min,10kb,max,20kb',
            'imgFile': 'required|image',
            'imgFile1': 'mime:jpg',
            'imgFile2': 'extension:jpg',
            'pkgFile': 'name:package'
        });

        if (this.validationErrors) {
            this.status = 422;
            this.body = this.validationErrors;
            return;
        }

        this.body = { success: true };
    });

    router.post('/deleteOnFail', function* () {
        yield this.validateFiles({
            'jsFile':'required|size:min,10kb,max,20kb',
            'imgFile': 'required|image'
        }, true);

        if (this.validationErrors) {
            this.status = 422;

            const tmpfiles = [];

            for (let f in this.request.body.files) { // eslint-disable-line prefer-const
                tmpfiles.push(this.request.body.files[f].path);
            }

            this.body = tmpfiles;
            return;
        }

        this.body = { success: true };
    });

    router.post('/fileActions', function* () {
        yield this.validateFiles({
            'jsFile':'required|size:min,10kb,max,20kb',
            'imgFile': 'required|image',
        }, true, {}, {
            jsFile: {
                action: 'move',
                args: `${__dirname}/../files/tmp/rules.js`,
                callback: function* (validator, file, destination) { // eslint-disable-line no-unused-vars
                    validator.addError(file, 'action', 'move', 'Just checking if the callback action works!!');
                }
            },
            imgFile: [
                {
                    action: 'copy',
                    args: `${__dirname}/../files/tmp/panda.jpg`
                },
                {
                    action: 'delete'
                }
            ]
        });

        if (this.validationErrors) {
            this.status = 422;
            const tmpfiles = {};

            for (let f in this.request.body.files) { // eslint-disable-line prefer-const
                tmpfiles[f] = this.request.body.files[f].path;
            }

            this.body = {
                tmpFiles: tmpfiles,
                errors  : this.validationErrors
            };

            return;
        }

        this.body = { success: true };
    });

    app.use(router.routes()).use(router.allowedMethods());
};
