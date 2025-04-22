module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      frontend: {
        files: [
          { expand: true, cwd: 'src/', src: ['*.html', 'cards.json'], dest: 'dist/' }
        ]
      },
      backend: {
        files: [
          { expand: true, cwd: 'server/', src: ['**/*.js'], dest: 'dist/server/' }
        ]
      }
    },
    uglify: {
      backend: {
        files: {
          'dist/server/server.min.js': ['server/server.js']
        }
      }
    },
    cssmin: {
      frontend: {
        files: {
          'dist/styles.min.css': ['src/styles/*.css']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('build:frontend', ['copy:frontend', 'cssmin:frontend']);
  grunt.registerTask('build:backend', ['copy:backend', 'uglify:backend']);
  grunt.registerTask('build', ['build:frontend', 'build:backend']);
  grunt.registerTask('default', ['build']);
};
