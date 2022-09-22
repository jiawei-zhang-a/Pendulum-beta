var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("vinyl-buffer");
var babelify = require("babelify");
let obfuscator = require("gulp-javascript-obfuscator");
let uglify = require("gulp-uglify");

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
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(obfuscator(
                {
                    identifierNamesGenerator: 'mangled',
                    // log: false,
                    ignoreImports: true,
                    numbersToExpressions: false,
                    renameGlobals: true,
                    // renameProperties: true,
                    exclude:['mathquill.js','mathquill.min.js'],
                    // forceTransformStrings: ['constant','closestruct','openstruct'],
                    renamePropertiesMode: 'safe',
                    reservedNames: [
                        'prototype',
                    ]
                }
            ))
            // .pipe(uglify())
            .pipe(sourcemaps.write("./"))
            .pipe(gulp.dest("dist/js"));
    })
);