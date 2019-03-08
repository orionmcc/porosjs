var fs = require('fs');
var UglifyJS = require('uglify-js');

function concat(opts) {
    var fileList = opts.src;
    var distPath = opts.dest;
    var out = fileList.map(function(filePath){
            return fs.readFileSync(__dirname+"/"+filePath).toString();
        });
    fs.writeFileSync(__dirname+"/"+distPath, out.join('\n'));
    console.log(' '+ distPath +' built.');
}

concat({
    src : [
        '../lib/editor_src/editor.js',
        '../lib/editor_src/template.js',
        '../lib/editor_src/select.js',
        '../lib/editor_src/data.js',
        '../lib/editor_src/page.js',
        '../lib/editor_src/tinymce.js',
    ],
    dest : '../lib/porosedit.js'
});


function uglify(srcPath, distPath) {
  var result = UglifyJS.minify(__dirname+"/"+srcPath, {
    mangle: true,
    compress: {
      sequences: true,
      dead_code: true,
      conditionals: true,
      booleans: true,
      unused: true,
      if_return: true,
      join_vars: true,
      drop_console: true
    }
  });

  fs.writeFileSync(__dirname+"/"+distPath, result.code);

    console.log(' '+ distPath +' built.');
}

uglify('../lib/porosedit.js', '../lib/porosedit.min.js');
