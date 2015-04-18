
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var config = require('../config').uglify;

gulp.task('dist', ['uglify', 'browserify']);

gulp.task('uglify', function() {
	return gulp.src(config.src)
			   .pipe(uglify())
			   .pipe(concat('tokensec.min.js'))
			   .pipe(gulp.dest(config.dest))
});