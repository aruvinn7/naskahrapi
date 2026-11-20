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

2.4 Faktor-Faktor yang Memengaruhi Konsumsi Air AI
Beberapa faktor kritis yang memengaruhi tingkat konsumsi air meliputi:
- Skala dan Kompleksitas Model: Model dengan ratusan miliar parameter membutuhkan miliaran FLOPS komputasi yang berbanding lurus dengan pelepasan energi termal.
- Indeks Efektivitas Penggunaan Air (Water Usage Effectiveness / WUE): Metrik standar yang mengukur rasio liter air yang diuapkan terhadap kilowatt-hour energi TI.
- Kondisi Geografis dan Suhu Lingkungan: Fasilitas data center di daerah tropis atau iklim kering membutuhkan penguapan air jauh lebih tinggi dibandingkan kawasan kutub atau sub-arktik.

2.5 Estimasi Konsumsi Air dalam Penggunaan AI
Studi empiris dari para peneliti University of California Riverside menunjukkan bahwa pelatihan model GPT-3 di fasilitas canggih diperkirakan mengonsumsi sekitar 700.000 liter air tawar bersih. Untuk inferensi harian, setiap percakapan dengan sekitar 20 hingga 50 interaksi pertanyaan diperkirakan meminum setara satu botol air mineral ukuran 500 ml.

2.6 Dampak Lingkungan dari Konsumsi Air AI
Eksploitasi sumber air lokal oleh data center berskala hiperskala menimbulkan ketegangan ekologis dengan masyarakat setempat, khususnya di wilayah yang mengalami krisis kekeringan musiman. Pengambilan air tanah secara masif dapat menurunkan permukaan air sumur warga dan mengganggu sektor pertanian lokal.

2.7 Upaya Mengurangi Konsumsi Air dalam Penggunaan AI
Berbagai pendekatan inovatif mulai diimplementasikan untuk memitigasi krisis air:
1. Transisi ke Pendinginan Imersi Cairan (Liquid Immersion Cooling): Merendam komponen server dalam cairan dielektrik non-konduktif yang memiliki konduktivitas termal tinggi tanpa menguapkan air.
2. Pemanfaatan Air Daur Ulang: Mengganti air tawar minum dengan air olahan limbah kota atau air laut yang telah didesalinasi.
3. Penjadwalan Beban Kerja Sadar Iklim: Mengalihkan komputasi berat ke lokasi data center yang sedang mengalami waktu malam hari atau suhu dingin.

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
