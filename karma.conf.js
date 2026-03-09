// Karma configuration file
module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-jasmine-html-reporter'),
            require('karma-coverage'),
            require('@angular-devkit/build-angular/plugins/karma'),
        ],
        client: {
            jasmine: {},
            clearContext: false,
        },
        jasmineHtmlReporter: {
            suppressAll: true,
        },
        coverageReporter: {
            dir: require('path').join(__dirname, './coverage/ng-beacon'),
            subdir: '.',
            reporters: [
                { type: 'html' },
                { type: 'text-summary' },
                { type: 'json-summary', file: 'coverage-summary.json' },
            ],
            check: {
                global: {
                    statements: 80,
                    branches: 80,
                    functions: 80,
                    lines: 80,
                },
            },
        },
        reporters: ['progress', 'kjhtml'],
        browsers: ['ChromeHeadlessCI'],
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadlessNoSandbox',
                flags: ['--no-sandbox'],
            },
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },
        restartOnFileChange: true,
    });
};
