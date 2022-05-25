// Setelah install puppeteer dan mysql, panggil menggunakan require
const puppeteer = require("puppeteer")
const mysql = require("mysql")
const path = require('path');
const fs = require("fs");

const downloadPath = path.resolve(__dirname + './data');

// buat fungsi asynchronous untuk puppeteer
async function getDataJurnal(){
	// Jalankan puppeteer pake .launch()
	const browser = await puppeteer.launch({headless: false});

	// Buat halaman baru pake .newpage()
	const page = await browser.newPage();

	// Arahkan halaman ke url yang diinginkan
	await page.goto("https://perspektif-hukum.hangtuah.ac.id/index.php/jurnal", {timeout: 0});

	// ambil semua link yang perlu kita ambil datanya pake .$$eval
	const linkData = await page.$$eval(".title a", (link) => {
		return link.map( x => x.href);
	})

	const nama_jurnal = await page.$eval(".data strong", text => text.innerText)

	const tahun = await page.$eval(".current_issue_title", text => text.innerText.split(" ").pop())

	let arr_nama_file = []

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
		});

		await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,

        });

		await page.goto(linkPDF, {timeout: 0})

		await page.click(".download")

		// Setelah klik tombol download... kita buat halaman baru ke chrome://downloads
		dmPage = await browser.newPage()
		await dmPage.goto('chrome://downloads')

		// buat halaman download nya biar di depan
		await dmPage.bringToFront();
		const checkdownloading = await dmPage.waitForFunction(
		    () => {
		    	// Singkatnya kita ambil tombol "Show in folder" jika tulisannya sudah berubah jadi "Show in folder" yang berarti proses download kita sudah selesai, lalu baru kita lanjutkan ke proses selanjutnya, dan tidak melangkahi proses yang lain
		        const dm = document.querySelector('downloads-manager').shadowRoot
		        const firstItem = dm.querySelector('#frb0')
		        if (firstItem) {
		            const thatArea = firstItem.shadowRoot.querySelector('.controls')
		            const atag = thatArea.querySelector('a')
		            if (atag && atag.textContent === 'Show in folder') { 
		                return true
		            }
		            const btn = thatArea.querySelector('cr-button')
		            if (btn && btn.textContent === 'Retry') {
		                btn.click()
		            }
		        }
		    },
		    { polling: 'raf', timeout: 0 }
		)

		// Kita tutup halaman downloadnya agar kembali lagi ke halaman jurnalnya
		await dmPage.close();

		console.log(`Berhasil mendownload ${i+1} file`)

	}


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

		} )

	}
	});  

	

	await browser.close()	
}


// jalankan fungsinya dengan memanggilnya di sini.
getDataJurnal()