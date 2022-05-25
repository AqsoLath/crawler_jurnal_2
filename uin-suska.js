const puppeteer = require("puppeteer")
const mysql = require("mysql")
const path = require('path');
const fs = require("fs");
const isPDF = require("is-pdf-valid");


const downloadPath = path.resolve(__dirname + './data');

// buat fungsi asynchronous untuk puppeteer
async function getDataJurnal(){
	// Jalankan puppeteer pake .launch()
	const browser = await puppeteer.launch({headless: true});

	// Buat halaman baru pake .newpage()
	const page = await browser.newPage();

	// Arahkan halaman ke url yang diinginkan
	await page.goto("http://ejournal.uin-suska.ac.id/index.php/eksekusi", {timeout: 0});

	// ambil semua link yang perlu kita ambil datanya pake .$$eval
	const linkData = await page.$$eval(".tocTitle a", (link) => {
		return link.map( x => x.href);
	})

	const nama_jurnal = await page.$eval(".data strong", text => text.innerText)

	const tahun = "2021"//await page.$eval(".current_issue_title", text => text.innerText.split(" ").pop())

	const linkSatu = linkData[0];

	console.log(linkSatu)

	await page.goto(linkSatu)

	for(let i = 0; i < linkData.length; i++){
		await page.goto(linkData[i], {timeout: 0});

		const title = await page.$eval("#articleTitle h3", title => title.innerText);
		// const author = await page.$$eval(".name", (name) =>{
		// 	return name.map(text => text.innerText).join(", ") 
		// });

		const author = await.page.$eval("#authorString", text => text.innerText)

		const universitas = await page.$eval(".affiliation", text => text.innerText);
		const abstrak = await page.$eval(".abstract p", text => text.innerText);

		const linkPDF = await page.$eval(".pdf", href => href.href)

		const doi = await page.$eval(".doi .value", text => text.innerText)

		const nama_file = `${author} - ${title}.pdf`

		const data = {title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun};

		// console.log(nama_file)
		// console.log(data)

	// 	let con = mysql.createConnection({
	// 	  host: "localhost",
	// 	  user: "root",
	// 	  password: "",
	// 	  database: "tugas mas nandi"
	// 	});

	// 	con.connect(function(err) {
	// 	  if (err) throw err;

	// 	  let sql = `INSERT INTO crawler_jurnal (title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun) VALUES ("${data.title}", "${data.author}", "${data.nama_jurnal}", "${data.universitas}", "${data.doi}", "${data.abstrak}", "${data.nama_file}", "${data.tahun}") `;

	// 	  con.query(sql, function(err, result){
	// 	    if(err) throw err;

	// 	    console.log(`berhasil menambahkan ${i+1} row`)
	// 	  })
	// 	});

		await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,

        });

		await page.goto(linkPDF, {timeout: 0})

		await page.click(".download")

		console.log(`Berhasil mendownload ${i+1} file`)

	}

	// let file_di_folder

	// do{
	// 	file_di_folder = fs.readdirSync("./data");
	// }while(isPDF(file_di_folder[file_di_folder.length-1]))


	// fs.renameSync("data/22-1-1-PH.pdf", "data/namafilebaru.pdf")

	


	// await browser.close()
	
	// console.log(file_di_folder, arr_nama_file)
	
}

// jalankan fungsinya dengan memanggilnya di sini.
getDataJurnal()