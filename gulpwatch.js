var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var watchify = require("watchify");
var tsify = require("tsify");
var fancy_log = require("fancy-log");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("vinyl-buffer");
var gp_notify = require('gulp-notify');
var paths = {
    pages: ["src/*.html"],
};
var watchedBrowserify = watchify(
    browserify({
        basedir: ".",
        debug: true,
        entries: ["src/js/helloworld.ts"],
        cache: {},
        packageCache: {},
    }).plugin(tsify)
);
gulp.task("copy-html", function () {
    return gulp.src(paths.pages).pipe(gulp.dest("dist"));
});
function bundle() {
    return watchedBrowserify
        .bundle()
        .on("error", fancy_log)
        .pipe(source("index.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest("dist/js"))
        // .pipe(gp_notify({ message: "All tasks complete.", onLast: true }));
}
gulp.task("default", gulp.series(gulp.parallel("copy-html"), bundle));
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", fancy_log);