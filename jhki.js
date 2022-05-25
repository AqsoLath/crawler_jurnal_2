// Setelah install puppeteer dan mysql, panggil menggunakan require
const puppeteer = require("puppeteer")
const mysql = require("mysql")
const path = require('path');
const fs = require("fs");
const isPDF = require("is-pdf-valid");


const downloadPath = path.resolve(__dirname + './data');

// buat fungsi asynchronous untuk puppeteer
async function getDataJurnal(){
	// Jalankan puppeteer pake .launch()
	const browser = await puppeteer.launch({headless: false});

	// Buat halaman baru pake .newpage()
	const page = await browser.newPage();

	// Arahkan halaman ke url yang diinginkan
	await page.goto("https://jurnal-mhki.or.id/jhki", {timeout: 0});

	// ambil semua link yang perlu kita ambil datanya pake .$$eval
	const linkData = await page.$$eval(".title a", (link) => {
		return link.map( x => x.href);
	})

	const nama_jurnal = await page.$eval(".homepage_about strong", text => text.innerText)

	const tahun = "2021"//await page.$eval(".current_issue_title", text => text.innerText.split(" ").pop())



	console.log(tahun)

	console.log(nama_jurnal)

	const linkSatu = linkData[0];

	await page.goto(linkSatu)

	let arr_nama_file = []
	// console.log(doi)

	for(let i = 0; i < linkData.length; i++){
		await page.goto(linkData[i], {timeout: 0});

	const title = await page.$eval(".page_title", title => title.innerText);
		const author = await page.$$eval(".name", (name) =>{
			return name.map(text => text.innerText).join(", ") 
		});

		const universitas = await page.$eval(".affiliation", text => text.innerText);
		const abstrak = await page.$eval(".abstract p", text => text.innerText);

		const linkPDF = await page.$eval(".pdf", href => href.href)

		const doi = await page.$eval(".doi .value", text => text.innerText)

		const nama_file = `${author} - ${title}.pdf`

		arr_nama_file.push(nama_file);
		// console.log(arr_nama_file)

		const data = {title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun};

		// console.log(data)

		// let con = mysql.createConnection({
		//   host: "localhost",
		//   user: "root",
		//   password: "",
		//   database: "tugas mas nandi"
		// });

		// con.connect(function(err) {
		//   if (err) throw err;

		//   let sql = `INSERT INTO crawler_jurnal (title, author, nama_jurnal, universitas, doi, abstrak, nama_file, tahun) VALUES ("${data.title}", "${data.author}", "${data.nama_jurnal}", "${data.universitas}", "${data.doi}", "${data.abstrak}", "${data.nama_file}", "${data.tahun}") `;

		//   con.query(sql, function(err, result){
		//     if(err) throw err;

		//     console.log(`berhasil menambahkan ${i+1} row`)
		//   })
		// });

		await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,

        });

		await page.goto(linkPDF, {timeout: 0})

		await page.click(".download")

		dmPage = await browser.newPage()
		await dmPage.goto('chrome://downloads/')

		

		await dmPage.bringToFront();
		const checkdownloading = await dmPage.waitForFunction(
		    () => {
		        // monitoring the state of the first download item
		        // if finish than return true; if fail click
		        const dm = document.querySelector('downloads-manager').shadowRoot
		        const firstItem = dm.querySelector('#frb0')
		        if (firstItem) {
		            const thatArea = firstItem.shadowRoot.querySelector('.controls')
		            const atag = thatArea.querySelector('a')
		            if (atag && atag.textContent === 'Show in folder') { // may be 'show in file explorer...'? you can try some ids, classess and do a better job than me lol
		                return true
		            }
		            const btn = thatArea.querySelector('cr-button')
		            if (btn && btn.textContent === 'Retry') { // may be 'try again'
		                btn.click()
		            }
		        }
		    },
		    { polling: 'raf', timeout: 0 }, // polling? yes. there is a 'polling: "mutation"' which kind of async
		)

		// console.log(checkdownloading)


		await dmPage.close();
		
		console.log(`Berhasil mendownload ${i+1} file`)

	}

	let file_di_folder = fs.readdirSync("./data")

	console.log(file_di_folder, arr_nama_file)

	for(let i = 0; i < file_di_folder.length; i++){
		let pathLama = `data/${file_di_folder[i]}`;
		let pathBaru = `data/${arr_nama_file[i]}`;
		fs.renameSync(pathLama, pathBaru)

		console.log(`Berhasil mengganti nama ${pathLama} menjadi ${pathBaru}`)
	}
	await browser.close()
		
}

getDataJurnal()

function coba8(){
	fs.renameSync("data/8-Article Text-96-2-10-20220116.pdf", "data/namabaru2.pdf" )
}

// coba8()