var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("vinyl-buffer");
var paths = {
    pages: ["src/*.html", "src/css/*.css"],
};
gulp.task("copy-files", function () {
    return gulp.src(paths.pages).pipe(gulp.dest("dist"));
});
gulp.task(
    "default",
    gulp.series(gulp.parallel("copy-files"), function () {
        return browserify({
            basedir: ".",
            debug: true,
            entries: ["src/js/helloworld.ts"],
            cache: {},
            packageCache: {},
        })
            .plugin(tsify)
            .bundle()
            .pipe(source("index.js"))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(sourcemaps.write("./"))
            .pipe(gulp.dest("dist/js"));
    })
);