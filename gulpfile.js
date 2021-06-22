var gulp = require("gulp");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var paths = {
    pages: ["src/*.html"],
};
gulp.task("copy-html", function () {
    return gulp.src(paths.pages).pipe(gulp.dest("dist"));
});
gulp.task(
    "default",
    gulp.series(gulp.parallel("copy-html"),
        ()=>tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("src/js")),
        ()=>browserify({
            basedir: ".",
            debug: true,
            entries: ["src/js/helloworld.js"],
            cache: {},
            packageCache: {},
        })
            .bundle()
            .pipe(source("index.js"))
            .pipe(gulp.dest("dist/js"))
    )
);