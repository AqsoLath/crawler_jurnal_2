
const dotenv = require("dotenv");
const AWS = require("aws-sdk");

dotenv.config()

const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;

const s3 = new AWS.S3({endpoint: spacesEndpoint, accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET});

var params = {
  Bucket: process.env.DO_SPACES_NAME, /* required */
  Prefix: 'latihan/'  // Can be your folder name
};

s3.listObjectsV2(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data.Contents);           // successful response
});