var download = require('download-pdf');

var pdf = "http://apps.who.int/iris/bitstream/10665/137592/1/roadmapsitrep_7Nov2014_eng.pdf"
 
var options = {
    directory: "./pdfs/ebola/",
    filename: "2014-11-7.pdf"
}
 
download(pdf, options, function(err){
    console.log("meow")
}) 