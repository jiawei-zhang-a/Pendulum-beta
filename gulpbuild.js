var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("vinyl-buffer");
var babelify = require("babelify");
let obfuscator = require("gulp-javascript-obfuscator");
const minify = require('gulp-minify');

var paths = {
    pages: ["src/*.html"],
    stylesheets: ["src/css/**/*.*"],
    assets: ["assets/*.png"]
};
gulp.task("copy-html", function () {
    return gulp.src(paths.pages).pipe(gulp.dest("dist"));
});
gulp.task("copy-css", function () {
    return gulp.src(paths.stylesheets).pipe(gulp.dest("dist/css"));
});
gulp.task("copy-assets", function () {
    return gulp.src(paths.assets).pipe(gulp.dest("dist/assets"));
});
gulp.task(
    "default",
    gulp.series(gulp.parallel("copy-html", "copy-css", "copy-assets"), function () {
        return browserify({
            basedir: ".",
            debug: true,
            entries: ["src/js/pendulum.ts"],
            cache: {},
            packageCache: {},
        }).plugin(tsify, {target: 'es6'})
            .transform(babelify.configure({extensions: [".ts",".js"]}))
            .bundle()
            .pipe(source("index.js"))
            .pipe(buffer())
            // .pipe(sourcemaps.init({ loadMaps: true }))
            // .pipe(obfuscator(
            //     {
            //         compact: true,
            //
            //         identifierNamesGenerator: 'mangled',
            //         // log: false,
            //         ignoreImports: true,
            //         // numbersToExpressions: false,
            //         numbersToExpressions: true,
            //         simplify: true,
            //         stringArrayShuffle: true,
            //         // stringArrayEncoding: ['rc4'],
            //         renameGlobals: true,
            //         disableConsoleOutput: true,
            //         selfDefending: true,
            //         domainLock: ['http://www.cloudnest.org/pendulum/beta/','cloudnest.org/pendulum/beta/'],
            //         // domainLockRedirectUrl: 'http://www.cloudnest.org',
            //         // renameProperties: true,Ζ
            //         exclude:['mathquill.js','mathquill.min.js'],
            //         // forceTransformStrings: ['constant','closestruct','openstruct'],
            //         renamePropertiesMode: 'safe',
            //     }
            // ))
            .pipe(minify())
            // .pipe(sourcemaps.write("./"))
            .pipe(gulp.dest("dist/js"));
    })
);