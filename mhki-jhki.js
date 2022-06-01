// Setelah install puppeteer dan mysql, panggil menggunakan require
const puppeteer = require("puppeteer")
const mysql = require("mysql")
const path = require('path');
const fs = require("fs");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fse = require("fs-extra")

dotenv.config();
const downloadPath = path.resolve(__dirname + './data');
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;

const s3 = new AWS.S3({endpoint: spacesEndpoint, accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET});

async function getDataJurnal(){
	const browser = await puppeteer.launch({headless: false});

	const page = await browser.newPage();

	await page.goto("https://jurnal-mhki.or.id/jhki/issue/archive", {timeout: 0})

	const linkIssue = await page.$$eval("a.title", (link) => {
		return link.map(x => x.href)
	})


	let arr_nama_file = [];

	let linkToDownload = [];

	const nama_jurnal = "Jurnal Hukum Kesehatan Indonesia "//await page.$eval(".data strong", text => text.innerText)

	const universitas = "Masyarakat Hukum Kesehatan Indonesia";
	
	for(let i = 0; i < linkIssue.length; i++){
		await page.goto(linkIssue[i], {timeout: 0})

		const linkData = await page.$$eval(".title a", (link) => {
			return link.map( x => x.href);
		})

		const tahun = await page.$eval(".published .value", text => text.innerText.split("-").shift())


		for(let j = 0; j < linkData.length; j++){
			await page.goto(linkData[j], {timeout: 0});

			const title = await page.$eval(".page_title", title => title.innerText);

			const linkPDF = await page.$eval(".obj_galley_link", href => href.href)

			linkToDownload.push(linkPDF);


			// Buat try catch buat nampung jika data tidak ada, maka akan diisi "-"
			let abstrak;
			try {
				abstrak = await page.$$eval(".abstract p", (abstrak) => {
					return abstrak.map(text => text.innerText).join("\n")
				})
			} catch {
				abstrak = "-"
			}

			let author;
			try {
				author = await page.$$eval(".name", (name) =>{
					return name.map(text => text.innerText).join(", ") 
				});
			} catch {
				author = "-"
			}

			let doi;
			try {
				doi = await page.$eval(".doi .value", text => text.innerText)
			} catch {
				doi = "-"
			}


			title_file = title.split(" ", 10).join(" ");

			author_file = author.split(",").shift();

			let nama_file = `${author_file} - ${title_file}.pdf`

			nama_file = nama_file.replace(/[\/\\\?:*?"<>|()]/gi, "")

			arr_nama_file.push(nama_file);

			const dirtyData = {title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun};

			const data = {}

			for (var x in dirtyData) {
			  data[x] = dirtyData[x].replace(/["]/g,'');
			}
			console.log(data)
			// Masukkan data ke database
			let con = mysql.createConnection({
			  host: "localhost",
			  user: "root",
			  password: "",
			  database: "tugas mas nandi"
			});

			con.connect(function(err) {
			  if (err) throw err;

			  let sql = `INSERT INTO crawler_jurnal (title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun) VALUES ("${data.title}", "${data.author}", "${data.nama_jurnal}", "${data.universitas}", "${data.doi}", "${data.abstrak}", "${data.nama_file}", "${data.tahun}") `;

			  con.query(sql, function(err, result){
			    if(err) throw err;

			    console.log(`berhasil menambahkan ${j+1} row`)
			  })

	  		con.end()

			});

			console.log(linkToDownload)
		}
	}

	for(let i = 0; i < linkToDownload.length; i++){

		await page._client.send('Page.setDownloadBehavior', {
	            behavior: 'allow',
	            downloadPath: downloadPath,

	        });

				await page.goto(linkToDownload[i], {timeout: 0})
				await page.click(".download")
				console.log(`Berhasil mendownload ${i+1} file`)
	}
	
	await page.waitForTimeout(30000);



	let dir = 'data/';

	// Kita ambil semua nama file yang ada di folder data lalu kita urutkan berdasarkan waktu downloadnya agar bisa menyesuaikan dengan nama_file yang ada di arr_nama_file
	fs.readdir(dir, function(err, files){
	  files = files.map(function (fileName) {
	    return {
	      name: fileName,
	      time: fs.statSync(dir + '/' + fileName).mtime.getTime()
	    };
	  })
	  .sort(function (a, b) {
	    return a.time - b.time; })
	  .map(function (v) {
	    return v.name; });

	  // files di sini merupakan array nama file di folder data yang sudah diurutkan berdasarkan waktu download

	  // Kita ubah nama file nya yang awalnya default dari chrome nya menjadi apa yang sudah kita buat di arr_nama_file

	  for(let i = 0; i < files.length; i++){
		let pathLama = `data/${files[i]}`;
		let pathBaru = `data/${arr_nama_file[i]}`;
		fs.rename(pathLama, pathBaru, (err) => {
			if (err){
				fse.emptyDirSync('data')
			}

			console.log(`Berhasil mengganti nama ${pathLama} menjadi ${pathBaru}`)

			// Setelah itu kita siapkan file yang mau diupload dengan mengganti namanya. yaitu kita ilangin "data/" dari path nya.
			const fileToUpload = pathBaru.split("/").pop();

			// Kita baca file nya pake readFile, file yang ada di dalam folder data
			fs.readFile("data/" + fileToUpload, (err,data) => {
				// Kemudian kita upload ke S3, Bucketnya berasal dari file .env yang kita buat, Key nya adalah folder di mana kita mau nyimpannya di S3 diikuti dengan nama file kita mau nyimpannya, Body nya adalah file yang ingin kita upload, ACL nya gak tau apaan intinya itu dah, ContentType nya adalah 'application/pdf'
				s3.upload({Bucket: process.env.DO_SPACES_NAME, Key: "latihan/" + fileToUpload, Body: data, ACL: "public-read", ContentType: 'application/pdf'}, (err, data) => {
					if (err) return console.log(err);
					console.log("Your file has been uploaded successfully!", data);

					fse.emptyDirSync('data')
				});
			});
		} )

	}

	
	});  
 
	await browser.close()	
}


// jalankan fungsinya dengan memanggilnya di sini.
getDataJurnal()