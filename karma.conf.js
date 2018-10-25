
module.exports = function (config) {
  var configuration = {
    basePath: './',
    frameworks: ['browserify','jasmine'],
    browsers: [ 'Chrome' ],
    browserNoActivityTimeout: 180000,
    // reportSlowerThan: 50,
    logLevel: config.LOG_WARN,
    client: {
      captureConsole: false
    },
    autoWatch: true,
    // logLevel: karma.LOG_DEBUG,
    reporters: ['progress', 'coverage'],

    coverageReporter: {
      reporters: [
        { type: 'html', dir: 'coverage/' },
        { type: 'lcov', dir: 'coverage-lcov/' }
      ],
      subdir: '.'
    },

    preprocessors: {
      'src/**/*.js': ['browserify'],
      'tests/**/*.js': ['browserify']
    },

    customLaunchers: {
      chrome_without_security: {
        base: 'Chrome',
        flags: [ '--remote-debugging-port=9333' ]
      },
      sauce_chrome_win: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'windows'
      }
    },

    browserify: {
      configure (bundle) {
        bundle.once('prebundle', function () {
          bundle.transform('browserify-istanbul'); // Must go first
          bundle.transform('babelify', {
            presets: ['env', 'es2015'],
            ignore: [
              'src/ws-browser.js', // undefined is not an object (evaluating 'global.WebSocket')
              /\/node_modules\/(?!bitcoin-(coinify|exchange|sfox)-client|bech32\/)/
            ],
            global: true,
            sourceMap: 'inline'
          });
          bundle.plugin('proxyquireify/plugin');
        });
      },
      debug: true
    },

    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'node_modules/jasmine-es6-promise-matchers/jasmine-es6-promise-matchers.js',
      'tests/**/*.spec.js'
    ],

    plugins: [
      require( 'karma-browserify'),
      require( 'karma-jasmine'),
      require( 'karma-chrome-launcher'),
      require( 'karma-coverage'),
      
  ]  
  };

  config.set(configuration);
};
