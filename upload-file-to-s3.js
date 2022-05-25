

const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fs = require("fs")

dotenv.config()

const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;

const s3 = new AWS.S3({endpoint: spacesEndpoint, accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET});

const file_di_folder_data = fs.readdirSync("data");

console.log(file_di_folder_data)

for(let i = 0; i < file_di_folder_data.length; i++){
	fs.readFile("data/" + file_di_folder_data[i], (err,data) => {
	s3.putObject({Bucket: process.env.DO_SPACES_NAME, Key: "latihan/" + file_di_folder_data[i], Body: data, ACL: "public-read"}, (err, data) => {
		if (err) return console.log(err);
		console.log("Your file has been uploaded successfully!", data);
	});
});
}




































// exports.upload = function (req, res) {
//     var file = req.files.file;
//     fs.readFile(file.path, function (err, data) {
//         if (err) throw err; // Something went wrong!
//         var s3bucket = new AWS.S3({params: {Bucket: 'mybucketname'}});
//         s3bucket.createBucket(function () {
//             var params = {
//                 Key: file.originalFilename, //file.name doesn't exist as a property
//                 Body: data
//             };
//             s3bucket.upload(params, function (err, data) {
//                 // Whether there is an error or not, delete the temp file
//                 fs.unlink(file.path, function (err) {
//                     if (err) {
//                         console.error(err);
//                     }
//                     console.log('Temp File Delete');
//                 });

//                 console.log("PRINT FILE:", file);
//                 if (err) {
//                     console.log('ERROR MSG: ', err);
//                     res.status(500).send(err);
//                 } else {
//                     console.log('Successfully uploaded data');
//                     res.status(200).end();
//                 }
//             });
//         });
//     });
// };