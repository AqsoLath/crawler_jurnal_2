// Setelah install puppeteer dan mysql, panggil menggunakan require
const puppeteer = require("puppeteer")
const mysql = require("mysql")
const path = require('path');
const fs = require("fs");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const fse = require("fs-extra")

// ambil data dari yang sudah kita buat di file .env
dotenv.config();
const downloadPath = path.resolve(__dirname + './data');
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;

// Buat sambungan dengan s3 bucket punya heylaw, dengan data yang dari .env.
const s3 = new AWS.S3({endpoint: spacesEndpoint, accessKeyId: process.env.DO_SPACES_KEY, secretAccessKey: process.env.DO_SPACES_SECRET});

// buat fungsi asynchronous untuk puppeteer
async function getDataJurnal(){
	// Jalankan puppeteer pake .launch()
	const browser = await puppeteer.launch({headless: true});

	// Buat halaman baru pake .newpage()
	const page = await browser.newPage();

	// Arahkan halaman ke url yang diinginkan
	await page.goto("https://journal.unpar.ac.id/index.php/veritas", {timeout: 0});

	// ambil semua link yang perlu kita ambil datanya pake .$$eval
	const linkData = await page.$$eval(".title a", (link) => {
		return link.map( x => x.href);
	})

	const nama_jurnal = "Veritas Et Justitia"//await page.$eval(".data strong", text => text.innerText)

	const tahun = "2021" //await page.$eval(".current_issue_title", text => text.innerText.split(" ").pop())

	let arr_nama_file = []

	for(let i = 0; i < linkData.length; i++){
		await page.goto(linkData[i], {timeout: 0});

		const title = await page.$eval(".page_title", title => title.innerText);

		const linkPDF = await page.$eval(".pdf", href => href.href)


		// Buat try catch buat nampung jika data tidak ada, maka akan diisi "-"
		let universitas;
		try {
			universitas = await page.$eval(".affiliation", text => text.innerText)
		} catch {
			universitas = "-"
		}

		let abstrak;
		try {
			abstrak = await page.$eval(".abstract p", text => text.innerText)
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

		
		// Karena nama file gak bisa banyak-banyak characternya maka kita rapihkan di sini.

		// untuk title di nama file nya kita buat agar tidak lebih dari 10 kata
		title_file = title.split(" ", 10).join(" ");

		// untuk author di nama file nya kita buat hanya satu penulis saja.
		author_file = author.split(",").shift();

		// Lalu kita susun untuk nama file nya agar menjadi satu dan di belakangnya kita tambah .pdf
		let nama_file = `${author_file} - ${title_file}.pdf`

		// hapus character yang ada di dalam nama_file menggunakan regex, agar saat di-rename tidak menimbulkan error
		nama_file = nama_file.replace(/[\/\\\?:*?"<>|()]/gi, "")

		// masukkan nama-nama filenya ke dalam array
		arr_nama_file.push(nama_file);

		const data = {title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun};

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

		    console.log(`berhasil menambahkan ${i+1} row`)
		  })

  		con.end()

		});

		await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,

        });

		await page.goto(linkPDF, {timeout: 0})

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
			if (err) throw err

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