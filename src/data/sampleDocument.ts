export const SAMPLE_AI_RAW_TEXT = `Tentu, berikut adalah draf lengkap makalah akademik mengenai Analisis Dampak Kecerdasan Buatan terhadap Konsumsi Air dan Keberlanjutan Lingkungan. Semoga draf ini membantu tugas kuliah Anda!

# MAKALAH
## ANALISIS DAMPAK PENGGUNAAN KECERDASAN BUATAN (ARTIFICIAL INTELLIGENCE) TERHADAP KONSUMSI AIR DAN ENERGI PUSAT DATA GLOBAL
Disusun untuk Memenuhi Tugas Mata Kuliah Teknologi Informasi dan Lingkungan

Disusun oleh:
Kelompok 4
1. Ahmad Fauzi (202301001)
2. Siti Nurhaliza (202301002)
3. Budi Santoso (202301003)

PROGRAM STUDI ILMU KOMPUTER
FAKULTAS ILMU KOMPUTER DAN SAINS
UNIVERSITAS INDONESIA
2026

---

KATA PENGANTAR
Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa atas limpahan rahmat dan karunia-Nya, sehingga kami dapat menyelesaikan penyusunan makalah yang berjudul "Analisis Dampak Penggunaan Kecerdasan Buatan (Artificial Intelligence) terhadap Konsumsi Air dan Energi Pusat Data Global" ini tepat pada waktunya.

Penyusunan makalah ini bertujuan untuk memenuhi salah satu tugas mata kuliah Teknologi Informasi dan Keberlanjutan Lingkungan. Selain itu, makalah ini diharapkan dapat memberikan wawasan mengenai sisi tersembunyi dari komputasi cerdas, khususnya jejak konsumsi air tawar (water footprint) sistem pendingin pusat data.

Kami menyadari bahwa makalah ini masih jauh dari kesempurnaan. Oleh karena itu, kritik dan saran yang membangun sangat kami harapkan guna penyempurnaan di masa mendatang.

Jakarta, 19 November 2026
Tim Penulis

---

BAB I PENDAHULUAN
1.1 Latar Belakang
Perkembangan teknologi kecerdasan buatan (Artificial Intelligence atau AI) dalam beberapa tahun terakhir mengalami lonjakan yang sangat dramatis. Peluncuran berbagai model bahasa skala besar (Large Language Models) seperti ChatGPT, Gemini, dan Claude telah mengubah paradigma produktivitas global di berbagai sektor industri. Namun di balik kecanggihannya, infrastruktur komputasi AI membutuhkan daya listrik yang masif dan fasilitas pendingin berkapasitas raksasa.

Fasilitas data center modern umumnya mengandalkan sistem pendingin evaporatif (evaporative cooling towers) yang mengonsumsi miliaran liter air tawar bersih setiap tahunnya untuk menjaga prosesor GPU agar tidak mengalami overheating. Konsumsi air ini kerap diabaikan publik karena narasi publik lebih sering berpusat pada konsumsi daya listrik murni dan emisi karbon. Oleh karena itu, penelitian mengenai korelasi komputasi AI dan konservasi sumber daya air menjadi sangat mendesak.

1.2 Rumusan Masalah
Berdasarkan latar belakang di atas, maka rumusan masalah dalam makalah ini adalah:
1. Bagaimana mekanisme penggunaan air tawar dalam sistem infrastruktur pusat data AI?
2. Seberapa besar estimasi konsumsi air langsung dan tidak langsung per sesi interaksi query AI?
3. Apa saja dampak lingkungan dan risiko kelangkaan air lokal di sekitar wilayah data center?
4. Bagaimana upaya dan strategi mitigasi teknologi guna mewujudkan ekosistem AI yang berkelanjutan?

1.3 Tujuan Penulisan
Adapun tujuan penulisan makalah ini adalah:
1. Mengidentifikasi rantai proses pendinginan evaporatif pada klaster komputasi kecerdasan buatan.
2. Menganalisis estimasi volume konsumsi air bersih per siklus pelatihan (training) dan inferensi model AI.
3. Menilai implikasi ekologis terhadap ketersediaan cadangan air tanah di komunitas sekitar pusat data.
4. Merumuskan rekomendasi arsitektur pendinginan ramah lingkungan untuk pengembang infrastruktur AI masa depan.

1.4 Manfaat Penulisan
Makalah ini diharapkan dapat memberikan manfaat teoritis berupa pengayaan literatur di bidang komputasi hijau (green computing), serta manfaat praktis bagi akademisi, industri teknologi, dan pembuat kebijakan dalam menyusun regulasi transparansi lingkungan untuk pusat data berskala nasional.

---

BAB II PEMBAHASAN
2.1 Pengertian Artificial Intelligence dan Kebutuhan Komputasi
Kecerdasan buatan adalah bidang ilmu komputer yang didedikasikan untuk memecahkan masalah kognitif yang umumnya terkait dengan kecerdasan manusia, seperti pembelajaran, pemecahan masalah, dan pengenalan pola. Model AI generasi terbaru dilatih menggunakan miliaran parameter di atas ribuan unit pemrosesan grafis (GPU) mutakhir yang beroperasi secara simultan selama berbulan-bulan tanpa henti.

2.2 Hubungan AI dengan Konsumsi Air
Korelasi langsung antara AI dan konsumsi air terletak pada pelepasan panas termal ekstrem dari server-server berdensitas tinggi. Ketika ribuan chip prosesor beroperasi pada kapasitas puncak, suhu di dalam ruang peladen melonjak drastis. Pendinginan berbasis udara (air cooling) tradisional terbukti tidak efisien secara energi, sehingga operator beralih ke sistem pendinginan adiabatik atau evaporatif yang memanfaatkan penguapan air dingin untuk mendinginkan udara sirkulasi.

2.3 Mekanisme Penggunaan Air dalam Infrastruktur AI
Penggunaan air dalam data center dibagi menjadi dua kategori utama:
1. Konsumsi On-site (Langsung): Air dipompa langsung ke menara pendingin data center untuk menyerap panas server melalui proses penguapan termal.
2. Konsumsi Off-site (Tidak Langsung): Air yang digunakan oleh pembangkit listrik tenaga uap, batu bara, atau nuklir di luar lokasi data center untuk memproduksi pasokan listrik yang dialirkan ke data center tersebut.

Gambar 1. Skema aliran air pendingin evaporatif pada pusat data hiperskala

2.4 Faktor-Faktor yang Memengaruhi Konsumsi Air AI
Beberapa faktor kritis yang memengaruhi tingkat konsumsi air meliputi:
- Skala dan Kompleksitas Model: Model dengan ratusan miliar parameter membutuhkan miliaran FLOPS komputasi yang berbanding lurus dengan pelepasan energi termal.
- Indeks Efektivitas Penggunaan Air (Water Usage Effectiveness / WUE): Metrik standar yang mengukur rasio liter air yang diuapkan terhadap kilowatt-hour energi TI.
- Kondisi Geografis dan Suhu Lingkungan: Fasilitas data center di daerah tropis atau iklim kering membutuhkan penguapan air jauh lebih tinggi dibandingkan kawasan kutub atau sub-arktik.

2.5 Estimasi Konsumsi Air dalam Penggunaan AI
Studi empiris dari para peneliti University of California Riverside menunjukkan bahwa pelatihan model GPT-3 di fasilitas canggih diperkirakan mengonsumsi sekitar 700.000 liter air tawar bersih. Untuk inferensi harian, setiap percakapan dengan sekitar 20 hingga 50 interaksi pertanyaan diperkirakan meminum setara satu botol air mineral ukuran 500 ml.

Tabel 1. Estimasi Konsumsi Air pada Penggunaan AI

| Tahap Penggunaan | Volume Air | Keterangan |
| --- | --- | --- |
| Pelatihan model GPT-3 | 700.000 liter | Sekali pelatihan penuh di fasilitas canggih |
| Inferensi 20–50 pertanyaan | 0,5 liter | Setara satu botol air mineral 500 ml |
| Pendinginan harian pusat data 100 MW | 1.200.000 liter | Rata-rata fasilitas hiperskala |

2.6 Dampak Lingkungan dari Konsumsi Air AI
Eksploitasi sumber air lokal oleh data center berskala hiperskala menimbulkan ketegangan ekologis dengan masyarakat setempat, khususnya di wilayah yang mengalami krisis kekeringan musiman. Pengambilan air tanah secara masif dapat menurunkan permukaan air sumur warga dan mengganggu sektor pertanian lokal.

2.7 Upaya Mengurangi Konsumsi Air dalam Penggunaan AI
Berbagai pendekatan inovatif mulai diimplementasikan untuk memitigasi krisis air:
1. Transisi ke Pendinginan Imersi Cairan (Liquid Immersion Cooling): Merendam komponen server dalam cairan dielektrik non-konduktif yang memiliki konduktivitas termal tinggi tanpa menguapkan air.
2. Pemanfaatan Air Daur Ulang: Mengganti air tawar minum dengan air olahan limbah kota atau air laut yang telah didesalinasi.
3. Penjadwalan Beban Kerja Sadar Iklim: Mengalihkan komputasi berat ke lokasi data center yang sedang mengalami waktu malam hari atau suhu dingin.

Gambar 2. Ilustrasi sistem pendinginan imersi cairan sebagai alternatif hemat air

2.8 Peran Pengguna dalam Mewujudkan AI yang Berkelanjutan
Pengguna akhir dan korporasi didorong untuk mempraktikkan "prompt hygiene" dengan mengajukan instruksi yang ringkas, efektif, dan tidak memicu pengulangan inferensi berulang yang sia-sia, serta memilih penyedia layanan awan yang memiliki sertifikasi emisi nol dan netralitas air.

---

BAB III PENUTUP
3.1 Kesimpulan
Infrastruktur komputasi kecerdasan buatan memiliki jejak air yang signifikan akibat ketergantungan pada sistem pendingin evaporatif. Diperlukan transparansi pelaporan metrik WUE dari penyedia teknologi dan percepatan adopsi teknologi pendingin ramah lingkungan agar lonjakan inovasi AI tidak mengorbankan ketahanan air global.

3.2 Saran
Pemerintah dan lembaga standardisasi perlu menetapkan regulasi batas efisiensi air bagi pembangunan data center baru di Indonesia. Selain itu, riset pengembangan model AI yang efisien daya (small language models) perlu terus didorong.

---

DAFTAR PUSTAKA
Gao, P., & Zhang, Y. (2024). Measuring the Environmental Footprint of Modern Data Centers. Journal of Green Computing, 12(3), 145-162.
Li, P., Yang, J., Islam, M. A., & Ren, S. (2023). Making AI Less "Thirsty": Uncovering and Addressing the Secret Water Footprint of AI Models. arXiv preprint arXiv:2304.03271.
Mytton, D. (2021). Data centre water consumption. npj Clean Water, 4(1), 1-6.
UNESCO. (2023). The United Nations World Water Development Report 2023: Partnerships and cooperation for water. UNESCO Publishing.

Semoga makalah ini bermanfaat untuk tugas kuliah Anda! Jangan ragu untuk bertanya lagi jika butuh bagian tambahan.`;

export const SAMPLE_JOURNAL_RAW_TEXT = `Tentu, berikut adalah draf lengkap artikel jurnal ilmiah mengenai rancang bangun sensor pergeseran tanah digital. Semoga draf ini membantu penulisan artikel jurnal Anda!

RANCANG BANGUN SENSOR PERGESERAN TANAH DIGITAL

Suryono

Lab. Instrumentasi dan Elektronika Jurusan Fisika FMIPA UNDIP Semarang

ABSTRACT
The research has been produced digital displacement field sensor system. This system can be applied on displacement level monitoring of building, bridge, dike and so forth. The field displacement sensor use sliding potentiometer and a 10 bit Analog to Digital Converter (ADC) at microcontroller. The value of field displacement is sent digitally as multi byte serial data through UART serial communication protocol. The system has 1 mm resolution specification with the range of measurement up to 57 meters. From the sensor's output has been acquired the output of the system with the equation y = 0,990x + 0,154 with the linear correlation 0,998.

Keyword : Displacement, digital, serial

ABSTRAK
Pada penelitian telah dilakukan pembuatan sensor sistem pergeseran tanah digital. Sistem ini dapat diaplikasikan pada pemantauan tingkat pergeseran tanah bangunan, jembatan, tanggul dan masih banyak aplikasi lainnya. Sensor pergeseran tanah memanfaatkan potensiometer geser yang mengubah jarak menjadi tegangan menggunakan Analog to Digital Converter (ADC) 10 bit pada mikrokontroler ATmega8535. Besar pergeseran tanah dikirim secara digital berupa data serial multi bit melalui protokol komunikasi serial UART. Sistem memiliki spesifikasi resolusi 1 mm dengan rentang pengukuran hingga 57 m. Dari regresi data pembacaan hasil keluaran sensor diperoleh keluaran sistem dengan persamaan y = 0,990x + 0,154 dengan korelasi linier 0,998.

Kata kunci : pergeseran, digital, serial

# Pendahuluan
Pembangunan perumahan untuk memenuhi kebutuhan akan tempat tinggal dan juga pembangunan jalan raya sebagai jalur transportasi mengakibatkan pembukaan lahan untuk memenuhi kebutuhan tersebut juga bertambah. Pada dasarnya tanah merupakan material yang terdiri dari agregat (butiran) mineral-mineral padat yang tidak tersementasi satu sama lain dan dari bahan-bahan organik yang telah melapuk, disertai dengan zat cair dan gas yang mengisi ruang-ruang kosong di antara partikel-partikel padat tersebut [1].

Penambahan beban lalu lintas pada konstruksi perkerasan jalan dan perumahan akan mempengaruhi pergerakan tanah di bawahnya yang akan menyebabkan keretakan di jalan raya dan tanah longsor. Oleh karena itu diperlukan alat ukur pergeseran tanah yang bekerja secara digital sehingga dapat dihubungkan langsung ke komputer untuk pemantauan berkelanjutan [2].

# Dasar Teori
Potensio geser merupakan salah satu jenis resistor variabel yaitu resistor yang dapat diubah nilai tahanannya. Potensiometer geser memiliki sebuah pita film yang disebut sebagai jalur (track) yang terbuat dari karbon konduktif. Ujung-ujung jalur terhubung ke dua buah terminal potensiometer [3].

Terminal ketiga dari komponen ini disambungkan ke wiper, yaitu sebuah strip logam yang bersifat lentur dan menekan kuat pada jalur karbon untuk membentuk hubungan listrik. Jika knop geser diubah secara translasi sebesar dL maka akan menghasilkan perubahan resistansi dR berdasarkan persamaan [3].

Tabel 1.1: Hubungan translasi wiper dengan perubahan resistansi

| Translasi dL (mm) | Perubahan dR (kOhm) | Tegangan keluaran (V) |
| --- | --- | --- |
| 0 | 0,00 | 1,00 |
| 30 | 4,98 | 2,99 |
| 57 | 9,86 | 4,51 |

Proses pengubahan terjadi pada analog to digital converter. Proses pengubahan ini dikenal juga dengan nama sistem akuisisi data. Terdapat empat macam pengubah data analog menjadi data digital yang memenuhi standar industri, yaitu integrating, tracking converter, successive approximation dan flash/paralel [4].

# Metoda Penelitian
Pada perancangan sensor sistem pergeseran tanah ini menggunakan potensio geser sebagai sensor yang berfungsi untuk mengukur besar pergeseran tanah. Pergeseran dari potensio geser menyebabkan perubahan pada hambatan keluaran yang dapat mewakili besar pergeseran tanah. Potensio geser dihubungkan dengan sumber arus tetap, sehingga tegangan keluarannya sebanding dengan pergeseran translasinya [5].

Tegangan keluaran tersebut dibaca oleh mikrokontroler ATmega8535. Pemrograman yang harus dilakukan pertama kali adalah melakukan inisialisasi port dan inisialisasi ADC meliputi proses penentuan clock, tegangan referensi, format output data dan mode pembacaan. Register yang perlu diset nilainya adalah ADMUX (ADC Multiplexer Selection Register) dan ADCSRA (ADC Control and Status Register A).

Diagram blok dari sistem sensor pergeseran tanah ini terdiri dari potensio geser yang dipancangkan pada tanah, mikrokontroler ATmega8535, antarmuka RS-232 dan komputer sebagai pembaca data [6].

# Hasil dan Pembahasan
Pengujian sistem sensor pergeseran tanah dilakukan dengan menghubungkan rangkaian pendeteksi pergeseran tanah dengan tegangan 5 Volt dan multitester pada keluarannya. Pengujian dilakukan mulai dari jarak pergeseran 1 mm sampai pada jarak maksimum sebesar 60 mm. Sistem dipancangkan pada tanah gundukan dan digerakkan dengan mengeser tanah tersebut serta mengukur pergeserannya dengan alat meter standar [6].

Dari grafik pengujian dapat dijelaskan bahwa keluaran tegangan sensor terhadap jarak tidak linier. Karakteristiknya membentuk persamaan y = 0,001x2 - 0,019x + 1,163 dengan korelasi antar kedua variabel 0,983. Rentang sensor berkisar antara 0 s.d 57 mm, di atas rentang tersebut karakteristiknya telah berubah dan tidak memiliki tren yang baik.

Maka secara elektronik diselesaikan dengan metoda look-up table yang ditulis pada mikrokontroler. Metode ini menghasilkan keluaran sensor linier terhadap pergeseran tanah dengan persamaan y = 0,990x + 0,154 dan korelasi 99,8 persen.

# Daftar Pustaka
Das, B. (1998). Mekanika Tanah (Prinsip-Prinsip Rekayasa Geoteknis) Jilid-1. Penerbit Erlangga, Jakarta.
Fraden, J. (1996). Handbook of Modern Sensors. Springer, California.
Webster, J. (1999). The Measurement, Instrumentation and Sensors Handbook. IEEE Press, America.
Tirtamiharja. (1996). Elektronik Digital. Andi Offset, Yogyakarta.
Milman dan Halkias. (1993). Elektronika Terpadu. Jakarta, Erlangga.
Wardhana, L. (2006). Belajar Sendiri Mikrokontroler AVR Seri ATMega8535. ANDI, Yogyakarta.

Semoga artikel jurnal ini bermanfaat untuk publikasi Anda! Jangan ragu bertanya jika butuh bagian tambahan.`;

export function getSampleAiText(
  template: 'makalah' | 'skripsi' | 'jurnal' | 'kustom' | undefined
): string {
  return template === 'jurnal' ? SAMPLE_JOURNAL_RAW_TEXT : SAMPLE_AI_RAW_TEXT;
}

export function getSampleFileName(
  template: 'makalah' | 'skripsi' | 'jurnal' | 'kustom' | undefined
): string {
  return template === 'jurnal' ? 'JURNAL_SENSOR_DIGITAL.docx' : 'MAKALAH_SAMPLE_AI.docx';
}
