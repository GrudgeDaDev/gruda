export default function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      frontend: {
        files: [
          { expand: true, cwd: 'src/', src: ['*.html', 'cards.json'], dest: 'public/' }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('build:frontend', ['copy:frontend']);
  grunt.registerTask('build', ['build:frontend']);
  grunt.registerTask('default', ['build']);
};
