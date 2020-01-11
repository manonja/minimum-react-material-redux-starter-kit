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
const rollup = require("gulp-better-rollup");
const babel = require("rollup-plugin-babel");
const sourcemaps = require("gulp-sourcemaps");
const concat = require("gulp-concat");
const browserify = require('browserify');
const babelify = require('babelify');
const log = require('fancy-log');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

const svg = require('svg-browserify');

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
    entry: {
      dir: "./src/assets/js/",
      files: "./src/assets/js/index.js"
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
      // baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir]
      baseDir: [paths.src.tmp.dir, paths.src.css.dir]
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

gulp.task("html:copy", function() {
  return (
    gulp.src(paths.src.html.files)
    .pipe(gulp.dest(paths.src.tmp.dir))
  );
});


gulp.task("watch", function() {
  // gulp.watch(paths.src.scss.files, gulp.series(‘scss’));
  gulp.watch(
    [paths.src.js.files, paths.src.css.files, paths.src.img.files],
    gulp.series("browsersyncReload")
  );
  gulp.watch([paths.src.html.files], gulp.series("browsersyncReload"));
});

const b = browserify({
  insertGlobals: true,
  entries: [paths.src.entry.files],
  debug: true,
  transform: svg,
  // TODO: check hmr and watchify
  // plugin: [hmr, watchify],
  cache: {},
  // fullPaths: true,
  packageCache: {}
})
// .transform(require('svg-reactify'), { default: 'image' })
.transform('browserify-css', {
  autoInject: true,
  rootDir: paths.base.dir,
  processRelativeUrl: function(relativeUrl) {
    return relativeUrl;
  }
}).transform('babelify', {
  presets: ["@babel/preset-env", "@babel/preset-react"]
});


gulp.task("js", function() {
  return b.bundle()
  // .on('error', log.error('Browserify Error'))
  .pipe(source('bundle.js'))
  // .pipe(buffer())
  // .pipe(sourcemaps.init({loadMaps: true}))
  // .pipe(
  //   babel()
  // )
  // .pipe(concat("all.js"))
  // .pipe(sourcemaps.write("."))
  // .pipe(rollup({
  //   // There is no `input` option as rollup integrates into the gulp pipeline
  //   plugins: [babel({ runtimeHelpers: true })]
  // }, {
  //   // Rollups `sourcemap` option is unsupported. Use `gulp-sourcemaps` plugin instead
  //   format: 'cjs',
  // }))
  // // inlining the sourcemap into the exported .js file
  // .pipe(sourcemaps.write("."))
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

gulp.task("default", gulp.series("html:copy", "js", gulp.parallel("browsersync", "watch")));

gulp.task("publish:AWS", function() {
  // create a new publisher using S3 options
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
  var publisher = awspublish.create(
    {
      region: "eu-west-2",
      params: {
        Bucket: "minimum-react-material-redux-starter-kit"
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
