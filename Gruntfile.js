export default function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      frontend: {
        files: [
          { expand: true, cwd: 'src/', src: ['*.html', 'cards.json'], dest: 'public/' }
        ]
      },
      public: {
        files: [
          { expand: true, cwd: '.', src: ['card-minter.html', 'nexus.html', 'season0.html', 'index.html'], dest: 'public/' }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('build:frontend', ['copy:frontend']);
  grunt.registerTask('build:public', ['copy:public']);
  grunt.registerTask('build', ['build:frontend', 'build:public']);
  grunt.registerTask('default', ['build']);
};
