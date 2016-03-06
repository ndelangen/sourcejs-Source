'use strict';

var fs = require('fs-extra');
var path = require('path');

var ejs = require(path.join(global.pathToApp, 'core/ejsWithHelpers.js'));
var specUtils = require(path.join(global.pathToApp, 'core/lib/specUtils'));

var templateFolders = [
    path.join(global.userPath, 'assets/templates'),
    path.join(global.pathToApp, 'assets/templates'),
];

var templates = ['breadcrumbs'].reduce(function (result, item) {
    result[item] = fs.readFileSync(path.join(templateFolders.reduce(function (a, b) {
        return fs.existsSync(path.join(a, item + '.inc.html')) ? a : b;
    }), item + '.inc.html'), 'utf-8');

    return result;
}, {});


/**
 * Processing pre-ejs rendering on spec request
 *
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - The callback function
 * */
exports.process = function(req, res, next) {
    // Check if spec is request and ejs pre-rendering enabled
    if (req.specData && req.specData.renderedHtml) {
        var specInfo = req.specData.info;

        if (specInfo.noEjs) {
            next();
            return;
        }

        var specPath = specUtils.getFullPathToSpec(req.path);
        var contextOptions = req.specData.contextOptions;
        var specFiles = contextOptions.specInfo && contextOptions.specInfo.specFile ? [contextOptions.specInfo.specFile] : contextOptions.rendering.specFiles;
        var physicalPath = specUtils.getSpecFromDir(specPath, specFiles);
        var processedData = req.specData.renderedHtml.replace(/^\s+|\s+$/g, '');

        // TODO get this from a new option or find an existing option suitable
        var projectname = null;

        var breadcrumb = req.path.split('/').reduce(function (result, item) {
            if (item === '' && result.length === 0) {
                return result.concat([{
                    name: projectname || 'Home',
                    path: '/'
                }]);
            } else if (item !== '') {
                return result.concat([{
                    name: item,
                    path: (result[result.length - 1].path + item + '/')
                }]);
            } else {
                return result;
            }
        }, []);

        try {
            console.log(physicalPath);
            processedData = ejs.render(processedData, {
                breadcrumb: ejs.render(templates.breadcrumbs, {
                    breadcrumb: breadcrumb
                }),
            }, {
                filename: physicalPath
            });
        } catch(err){
            global.log.warn('Could not pre-render spec with EJS: ' + req.path, err);
        }
        req.specData.renderedHtml = processedData;

        next();
    } else {
        next();
    }
};
