const gulp = require("gulp");
const browsersync = require("browser-sync").create();
const watch = require("gulp-watch");
const minify = require("gulp-minify");
const uglify = require("gulp-uglify");
const useref = require("gulp-useref");
const cached = require("gulp-cached");
const gulpif = require("gulp-if");
const htmlmin = require("gulp-htmlmin");
const awspublish = require("gulp-awspublish");
const babel = require("gulp-babel");
const sourcemaps = require("gulp-sourcemaps");

const paths = {
  base: {
    base: {
      dir: "./"
    },
    node: {
      dir: "./node_modules"
    },
    vendor: {
      dir: "./vendor"
    },
    packageLock: {
      files: "./package-lock.json"
    }
  },
  dist: {
    base: {
      dir: "./dist",
      files: "./dist/**/*"
    },
    libs: {
      dir: "./dist/assets/libs"
    }
  },
  src: {
    base: {
      dir: "./src",
      files: "./src/**/*"
    },
    css: {
      dir: "./src/assets/css",
      files: "./src/assets/css/**/*"
    },
    html: {
      dir: "./src",
      files: "./src/**/*.html"
    },
    img: {
      dir: "./src/assets/img",
      files: "./src/assets/img/**/*"
    },
    js: {
      dir: "./src/assets/js",
      files: "./src/assets/js/**/*"
    },
    partials: {
      dir: "./src/partials",
      files: "./src/partials/**/*"
    },
    scss: {
      dir: "./src/assets/scss",
      files: "./src/assets/scss/**/*",
      main: "./src/assets/scss/*.scss"
    },
    tmp: {
      dir: "./src/.tmp",
      files: "./src/.tmp/**/*"
    }
  }
};

gulp.task("browsersyncReload", function(callback) {
  browsersync.reload();
  callback();
});

gulp.task("browsersync", function(callback) {
  browsersync.init({
    server: {
      baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir]
    }
  });
  callback();
});

gulp.task("html", function() {
  return (
    gulp
      .src([paths.src.html.files])
      .pipe(gulpif("*.html", htmlmin({ collapseWhitespace: true })))
      .pipe(useref())
      .pipe(cached())
      .pipe(gulpif("*.js", uglify()))
      .pipe(gulpif("*.js", minify({ noSource: true })))
      // .pipe(gulpif('*.css', cleanCSS()))
      .pipe(gulp.dest(paths.dist.base.dir))
  );
});

gulp.task("watch", function() {
  // gulp.watch(paths.src.scss.files, gulp.series(‘scss’));
  gulp.watch(
    [paths.src.js.files, paths.src.img.files],
    gulp.series("browsersyncReload")
  );
  gulp.watch([paths.src.html.files], gulp.series("browsersyncReload"));
});

gulp.task("js", function() {
  return gulp
    .src(["node_modules/babel-polyfill/dist/polyfill.js", paths.src.js.files])
    .pipe(sourcemaps.init())
    .pipe(
      babel({
        presets: ["@babel/preset-env"]
      })
    )
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.src.tmp.dir));
});

gulp.task("js:build", function() {
  return gulp
    .src(paths.src.tmp.dir)
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif("*.js", uglify()))
    .pipe(gulpif("*.js", minify({ noSource: true })))
    .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task("build", gulp.parallel(gulp.series("js", "js:build"), "html"));

gulp.task("default", gulp.series("js", gulp.parallel("browsersync", "watch")));

gulp.task("publish:AWS", function() {
  // create a new publisher using S3 options
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
  var publisher = awspublish.create(
    {
      region: "eu-west-2",
      params: {
        Bucket: "bootstrap-starter-kit"
      }
    },
    {
      cacheFileName: `${paths.src.tmp.dir}/aws`
    }
  );
  // define custom headers
  var headers = {
    "Cache-Control": "max-age=315360000, no-transform, public"
    // ...
  };

  return (
    gulp
      .src([paths.dist.base.files])
      // gzip, Set Content-Encoding headers and add .gz extension
      .pipe(awspublish.gzip({ ext: ".gz" }))
      // publisher will add Content-Length, Content-Type and headers specified above
      // If not specified it will set x-amz-acl to public-read by default
      .pipe(publisher.publish(headers))
      // create a cache file to speed up consecutive uploads
      .pipe(publisher.cache())
      // print upload updates to console
      .pipe(awspublish.reporter())
  );
});

gulp.task("publish", gulp.series("build", "publish:AWS"));
