
// Setelah install puppeteer dan mysql, panggil menggunakan require
const puppeteer = require("puppeteer")
const mysql = require("mysql")

// buat fungsi asynchronous untuk puppeteer
async function getDataJurnal(){
	// Jalankan puppeteer pake .launch()
	const browser = await puppeteer.launch();

	// Buat halaman baru pake .newpage()
	const page = await browser.newPage();

	// Arahkan halaman ke url yang diinginkan
	await page.goto("https://perspektif-hukum.hangtuah.ac.id/index.php/jurnal");

	// ambil semua link yang perlu kita ambil datanya pake .$$eval
	const linkData = await page.$$eval(".title a", (link) => {
		return link.map( x => x.href);
	})

	// Buat pengulangan untuk ngulangin yang kita lakukan di setiap link.
	for(let i = 0; i < linkData.length; i++){

		// arahkan halaman ke link yang sesuai dengan index ke i
		await page.goto(linkData[i]);

		// Ambil semua yang kita butuhkan pake $eval arahkan ke selector nya, dan ambil inner textnya, lalu simpan ke variabel
		const title = await page.$eval(".page_title", title => title.innerText);
		const author = await page.$$eval(".name", (name) =>{
			return name.map(text => text.innerText).join(", ") // Untuk yang author karena ada lebih dari satu kita pake $$eval, pake map, dan pake join buat jadiin string dari yang awalnya array, pisahin pake ", "
		});

		const universitas = await page.$eval(".affiliation", text => text.innerText);
		const abstrak = await page.$eval(".abstract p", text => text.innerText);

		// masukin yang kita ambil tadi ke satu objek data
		const data = {title, author, universitas, abstrak}; // ini sama aja kayak data = {title:title, author:author, ...} yang kiri punya objek, yang kanan punya variabel
		
		// Buat sambungan ke database tugas mas nandi
		let con = mysql.createConnection({
		  host: "localhost",
		  user: "root",
		  password: "",
		  database: "tugas mas nandi"
		});

		// ==INGET INI MASIH DI DALAM FOR DI ATAS==

		// con.connect() untuk kita isi callback nya dengan apa yang mau kita lakukan di database nya.
		con.connect(function(err) {
		  if (err) throw err;

		  // Untuk cek data mana yang kita masukkan
		  // console.log(data)

		  // buat syntax sql untuk memasukkan data ke tabel crawler_jurnal yang datanya berasal dari objek data yang sudah kita buat.
		  let sql = `INSERT INTO crawler_jurnal (title, author, universitas, abstrak) VALUES ("${data.title}", "${data.author}", "${data.universitas}", "${data.abstrak}") `;

		  // kita jalankan syntax SQL di atas pake con.query() . yang kita isi parameter pertamanya pake syntax SQL yang sudah kita buat.
		  con.query(sql, function(err, result){
		    if(err) throw err;

		    // buat log di console jika kita berhasil memasukkan data ke database, dan juga tulis sudah berapa data yang kita masukkan.
		    console.log(`berhasil menambahkan ${i+1} row`)
		  })
		});
	}

	// tutup puppeteer pake .close()
	browser.close();
}

// jalankan fungsinya dengan memanggilnya di sini.
getDataJurnal()