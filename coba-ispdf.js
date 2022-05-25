const fs = require("fs");
const isPDF = require("is-pdf-valid");

const file = fs.readFileSync("./data/22-1-3-PH.pdf.crdownload")
console.log(isPDF(file));