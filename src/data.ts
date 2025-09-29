import { Destination, BlogPost } from './types';

// Simple slugify helper
const slugify = (input: string) => {
  return input.toString().toLowerCase()
    .normalize('NFKD') // separate diacritics
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
};

export const heroSlides = [
    { id: 1, title: 'Temukan Perjalanan Impian Anda', subtitle: 'Jelajahi destinasi terbaik di seluruh dunia bersama kami.', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop' },
    { id: 2, title: 'Petualangan di Alam Terbuka', subtitle: 'Taklukkan puncak gunung, arungi lautan biru, dan temukan keindahan alam.', imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop' },
    { id: 3, title: 'Nikmati Pesona Budaya Lokal', subtitle: 'Rasakan kearifan lokal, cicipi kuliner otentik, dan saksikan tradisi.', imageUrl: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?q=80&w=2070&auto=format&fit=crop' }
];

const destinationBase: Destination[] = [
  { 
    id: 1, 
    title: 'Nusa Penida, Bali', 
    priceTiers: [
      { minPeople: 2, price: 1200000 },
      { minPeople: 5, price: 1100000 },
      { minPeople: 9, price: 1000000 }
    ],
    duration: 3, 
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2070&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541639053323-9c8821958611?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1613410318304-4458495f5411?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1537953773345-d172cc1d8523?q=80&w=2070&auto=format&fit=crop'
    ],
    longDescription: "Nusa Penida adalah sebuah pulau yang terletak di sebelah tenggara Bali, yang dipisahkan oleh Selat Badung. Dekat dengan pulau ini, terdapat juga pulau-pulau kecil lainnya yaitu Nusa Ceningan dan Nusa Lembongan. Perairan Nusa Penida terkenal dengan kawasan selamnya, di antaranya terdapat di Penida Bay, Manta Point, Batu Meling, Batu Lumbung, Batu Abah, Toyapakeh dan Malibu Point.",
    minPeople: 2,
    itinerary: [
      { day: 1, title: "Tiba di Nusa Penida & Eksplorasi Barat", description: "Tiba di pelabuhan, check-in hotel. Mengunjungi Kelingking Beach, Angel's Billabong, dan Broken Beach. Menikmati matahari terbenam di Crystal Bay." },
      { day: 2, title: "Petualangan Bawah Laut", description: "Snorkeling di Gamat Bay dan Manta Point untuk melihat pari manta. Bersantai di pantai Atuh dan Diamond Beach." },
      { day: 3, title: "Budaya Lokal & Kembali", description: "Mengunjungi Pura Goa Giri Putri, sebuah pura unik di dalam gua. Belanja oleh-oleh khas Nusa Penida sebelum kembali ke Bali." }
    ],
    mapCoordinates: { lat: -8.7358, lng: 115.5397 },
    facilities: ['Transportasi Darat', 'Akomodasi Hotel', 'Makan 3x Sehari', 'Pemandu Lokal', 'Tiket Masuk Wisata'],
    categories: ['Pantai', 'Snorkeling', 'Alam']
  },
  { 
    id: 2, 
    title: 'Raja Ampat, Papua', 
    priceTiers: [
      { minPeople: 4, price: 5500000 },
      { minPeople: 8, price: 5250000 }
    ],
    duration: 5, 
    imageUrl: 'https://images.unsplash.com/photo-1590141334692-a47467659551?q=80&w=1974&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1590141334692-a47467659551?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1588693485749-51433a59547b?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589182373919-2f1ab7168b44?q=80&w=2070&auto=format&fit=crop'
    ],
    longDescription: "Kepulauan Raja Ampat merupakan rangkaian empat gugusan pulau yang berdekatan dan berlokasi di barat bagian Kepala Burung (Vogelkoop) Pulau Papua. Secara administrasi, gugusan ini berada di bawah Kabupaten Raja Ampat, Provinsi Papua Barat. Kepulauan ini sekarang menjadi tujuan para penyelam yang tertarik dengan keindahan pemandangan bawah lautnya.",
    minPeople: 4,
    itinerary: [
      { day: 1, title: "Tiba di Sorong & Menuju Waisai", description: "Penerbangan ke Sorong, dilanjutkan dengan kapal feri ke Waisai, ibu kota Raja Ampat. Check-in di resort." },
      { day: 2, title: "Pianemo & Telaga Bintang", description: "Trekking ke puncak Pianemo untuk melihat pemandangan gugusan pulau karst yang ikonik. Snorkeling di Telaga Bintang." },
      { day: 3, title: "Eksplorasi Selat Dampier", description: "Diving atau snorkeling di beberapa spot terbaik dunia seperti Cape Kri dan Manta Sandy." },
      { day: 4, title: "Desa Arborek & Pasir Timbul", description: "Mengunjungi desa wisata Arborek untuk berinteraksi dengan masyarakat lokal. Bersantai di Pasir Timbul saat air surut." },
      { day: 5, title: "Kembali ke Sorong", description: "Sarapan pagi dan persiapan kembali ke Waisai untuk menaiki feri kembali ke Sorong." }
    ],
    mapCoordinates: { lat: -0.5562, lng: 130.4182 },
    facilities: ['Transportasi Laut', 'Akomodasi Villa', 'Makan 3x Sehari', 'Pemandu Lokal', 'Dokumentasi (Foto & Video)', 'Asuransi Perjalanan'],
    categories: ['Bahari', 'Diving', 'Alam', 'Petualangan']
  },
  { 
    id: 3, 
    title: 'Gunung Bromo, Jawa Timur', 
    priceTiers: [
        { minPeople: 2, price: 850000 },
        { minPeople: 4, price: 800000 },
        { minPeople: 6, price: 750000 }
    ],
    duration: 2, 
    imageUrl: 'https://images.unsplash.com/photo-1590130386971-83d3e6944e85?q=80&w=2070&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1590130386971-83d3e6944e85?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1588668216376-51e01a853c65?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1576159636838-a22833076a4a?q=80&w=2070&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1609279898225-b461c36bdf41?q=80&w=2070&auto=format&fit=crop'
    ],
    longDescription: "Gunung Bromo adalah sebuah gunung berapi aktif di Jawa Timur, Indonesia. Gunung ini memiliki ketinggian 2.329 meter di atas permukaan laut dan berada dalam empat wilayah kabupaten, yakni Kabupaten Probolinggo, Kabupaten Pasuruan, Kabupaten Lumajang, dan Kabupaten Malang. Gunung Bromo terkenal sebagai objek wisata utama di Jawa Timur. Sebagai sebuah objek wisata, Bromo menjadi menarik karena statusnya sebagai gunung berapi yang masih aktif.",
    minPeople: 2,
    itinerary: [
        { day: 1, title: "Perjalanan & Akomodasi", description: "Perjalanan dari Surabaya atau Malang menuju area Cemoro Lawang. Check-in di penginapan dan aklimatisasi dengan udara dingin." },
        { day: 2, title: "Bromo Sunrise & Kawah", description: "Dini hari berangkat dengan jeep menuju Penanjakan untuk melihat sunrise. Turun ke lautan pasir, mendaki ke kawah Bromo. Kembali ke penginapan untuk sarapan dan check-out." }
    ],
    mapCoordinates: { lat: -7.9425, lng: 112.9533 },
    facilities: ['Transportasi Darat', 'Akomodasi Hotel', 'Pemandu Lokal', 'Tiket Masuk Wisata'],
    categories: ['Gunung', 'Alam', 'Petualangan']
  },
  { 
    id: 4, 
    title: 'Candi Borobudur, Jawa Tengah', 
    priceTiers: [
        { minPeople: 1, price: 750000 },
        { minPeople: 3, price: 700000 },
        { minPeople: 5, price: 650000 }
    ],
    duration: 2, 
    imageUrl: 'https://images.unsplash.com/photo-1596484552834-0c5836895344?q=80&w=1974&auto=format&fit=crop',
    galleryImages: [
        'https://images.unsplash.com/photo-1596484552834-0c5836895344?q=80&w=1974&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1617653216335-52e6f4anc0e9?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1598254252039-44e27e858763?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1604264807491-885799645224?q=80&w=1931&auto=format&fit=crop'
    ],
    longDescription: "Borobudur adalah sebuah candi Buddha yang terletak di Borobudur, Magelang, Jawa Tengah, Indonesia. Candi ini terletak kurang lebih 100 km di sebelah barat daya Semarang, 86 km di sebelah barat Surakarta, dan 40 km di sebelah barat laut Yogyakarta. Candi berbentuk stupa ini didirikan oleh para penganut agama Buddha Mahayana sekitar tahun 800-an Masehi pada masa pemerintahan wangsa Syailendra.",
    minPeople: 1,
    itinerary: [
        { day: 1, title: "Tiba di Yogyakarta & Eksplorasi Kota", description: "Tiba di Yogyakarta, check-in hotel. Mengunjungi Keraton Yogyakarta dan Taman Sari. Menikmati suasana malam di Malioboro." },
        { day: 2, title: "Borobudur Sunrise & Prambanan", description: "Berangkat pagi-pagi untuk menikmati sunrise di Candi Borobudur. Setelah itu, mengunjungi Candi Prambanan yang megah sebelum kembali." }
    ],
    mapCoordinates: { lat: -7.6079, lng: 110.2038 },
    facilities: ['Transportasi Darat', 'Akomodasi Hotel', 'Pemandu Lokal', 'Tiket Masuk Wisata'],
    categories: ['Sejarah', 'Budaya', 'Religi']
  },
  { 
    id: 5, 
    title: 'Danau Toba, Sumatera Utara', 
    priceTiers: [
        { minPeople: 2, price: 1500000 },
        { minPeople: 4, price: 1400000 }
    ],
    duration: 4, 
    imageUrl: 'https://images.unsplash.com/photo-1607503389242-77e997087652?q=80&w=2070&auto=format&fit=crop',
    galleryImages: [
        'https://images.unsplash.com/photo-1607503389242-77e997087652?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1621294839352-070b43a8e9e2?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1597813092015-84918f673428?q=80&w=2074&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1621294841108-410a7a0b5b1e?q=80&w=2070&auto=format&fit=crop'
    ],
    longDescription: "Danau Toba adalah danau alami berukuran besar di Indonesia yang berada di kaldera gunung supervulkan. Danau ini memiliki panjang 100 kilometer, lebar 30 kilometer, dan kedalaman 505 meter. Danau ini terletak di tengah pulau Sumatra bagian utara dengan ketinggian permukaan sekitar 900 meter. Danau ini merupakan danau terbesar di Indonesia dan danau vulkanik terbesar di dunia.",
    minPeople: 2,
    itinerary: [
        { day: 1, title: "Medan ke Parapat", description: "Tiba di Medan, perjalanan darat menuju Parapat, kota di tepi Danau Toba. Check-in hotel dengan pemandangan danau." },
        { day: 2, title: "Eksplorasi Pulau Samosir", description: "Menyeberang ke Pulau Samosir. Mengunjungi Desa Tomok untuk melihat makam raja-raja Batak dan Desa Ambarita dengan kursi batunya." },
        { day: 3, title: "Keliling Samosir & Budaya Batak", description: "Menyewa sepeda motor untuk berkeliling pulau. Mengunjungi Museum Huta Bolon Simanindo dan belajar tarian Tor-Tor." },
        { day: 4, title: "Kembali ke Medan", description: "Menikmati pagi terakhir di Samosir sebelum kembali ke Parapat dan melanjutkan perjalanan ke Medan." }
    ],
    mapCoordinates: { lat: 2.6104, lng: 98.8105 },
    facilities: ['Transportasi Darat', 'Akomodasi Hotel', 'Makan Siang & Malam', 'Pemandu Lokal'],
    categories: ['Danau', 'Alam', 'Budaya']
  },
  { 
    id: 6, 
    title: 'Labuan Bajo, NTT', 
    priceTiers: [
        { minPeople: 4, price: 3200000 },
        { minPeople: 6, price: 3000000 },
        { minPeople: 10, price: 2850000 }
    ],
    duration: 3, 
    imageUrl: 'https://images.unsplash.com/photo-1566411598464-a6912440b8e7?q=80&w=1974&auto=format&fit=crop',
    galleryImages: [
        'https://images.unsplash.com/photo-1566411598464-a6912440b8e7?q=80&w=1974&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1554522968-80f742059b87?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1559923483-c286e081734f?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1574293159920-53b0a5f70414?q=80&w=1974&auto=format&fit=crop'
    ],
    longDescription: "Labuan Bajo merupakan salah satu dari lima Destinasi Super Prioritas yang sedang dikembangkan di Indonesia. Destinasi ini berada di Kabupaten Manggarai Barat, Provinsi Nusa Tenggara Timur, yang berbatasan langsung dengan Nusa Tenggara Barat dan dipisahkan oleh Selat Sape. Labuan Bajo adalah gerbang menuju Taman Nasional Komodo yang menyimpan keindahan alam yang menakjubkan dan hewan purba yang mendunia.",
    minPeople: 4,
    itinerary: [
        { day: 1, title: "Sailing Trip: Kelor, Rinca, Kalong", description: "Tiba di Labuan Bajo, langsung memulai sailing trip. Trekking di Pulau Kelor, melihat komodo di Pulau Rinca, dan menyaksikan ribuan kalong di Pulau Kalong." },
        { day: 2, title: "Padar, Pink Beach, Manta Point", description: "Trekking pagi di Pulau Padar untuk pemandangan ikonik. Snorkeling di Pink Beach dan berenang bersama pari manta di Manta Point." },
        { day: 3, title: "Pulau Kanawa & Kembali", description: "Menikmati keindahan bawah laut di Pulau Kanawa sebelum berlayar kembali ke Labuan Bajo untuk penerbangan pulang." }
    ],
    mapCoordinates: { lat: -8.4856, lng: 119.8762 },
    facilities: ['Transportasi Laut', 'Akomodasi Villa', 'Makan 3x Sehari', 'Pemandu Lokal', 'Dokumentasi (Foto & Video)', 'Asuransi Perjalanan'],
    categories: ['Bahari', 'Pantai', 'Petualangan', 'Snorkeling']
  }
];

export const allDestinations = destinationBase.map(d => ({ ...d, slug: `${d.id}-${slugify(d.title)}` }));
export const popularDestinations = allDestinations.slice(0, 4);

const _blogPosts: BlogPost[] = [
    { id: 1, title: '10 Tips Packing Cerdas untuk Liburan Anti Ribet', imageUrl: 'https://images.unsplash.com/photo-1566493725832-6012c5324e4b?q=80&w=2070&auto=format&fit=crop', category: 'Tips', author: 'Jane Doe', date: '15 Jul 2024', content: 'Merencanakan liburan bisa menjadi hal yang menyenangkan, tetapi proses packing seringkali menjadi sumber stres. Berikut adalah 10 tips cerdas untuk membantu Anda berkemas secara efisien dan efektif.\n1. Buat Daftar Bawaan: Sebelum mulai memasukkan barang ke dalam koper, buatlah daftar semua yang Anda butuhkan. Ini akan membantu Anda tetap terorganisir dan memastikan tidak ada yang tertinggal.\n2. Gulung Pakaian, Jangan Dilipat: Menggulung pakaian dapat menghemat ruang secara signifikan dan mengurangi kerutan. Ini adalah teknik klasik yang digunakan oleh para pelancong berpengalaman.\n3. Manfaatkan Ruang Kosong: Gunakan setiap inci ruang yang tersedia. Masukkan kaus kaki atau barang-barang kecil ke dalam sepatu.\n4. Bawa Botol Perawatan Ukuran Travel: Hindari membawa botol sampo atau losion ukuran penuh. Pindahkan produk favorit Anda ke dalam wadah berukuran travel untuk menghemat ruang dan berat.\n5. Batasi Jumlah Sepatu: Sepatu memakan banyak tempat. Batasi diri Anda pada tiga pasang: satu untuk berjalan santai, satu formal (jika perlu), dan satu pasang sandal atau sepatu khusus lainnya.\n6. Gunakan Packing Cubes: Kubus pengepakan adalah penyelamat. Mereka membantu Anda mengelompokkan barang-barang serupa dan menjaga koper Anda tetap rapi.\n7. Simpan Baju Terberat untuk Dipakai Saat Perjalanan: Kenakan jaket, sepatu bot, atau pakaian paling tebal Anda di pesawat untuk menghemat ruang di dalam koper.\n8. Siapkan Tas untuk Pakaian Kotor: Bawa kantong plastik atau tas kain untuk memisahkan pakaian kotor dari yang bersih.\n9. Amankan Barang Cair: Tempatkan semua barang cair dalam satu tas tahan air untuk mencegah kebocoran yang bisa merusak barang-barang lain.\n10. Beri Label pada Koper Anda: Pastikan koper Anda memiliki label nama dan kontak yang jelas. Ini akan sangat membantu jika koper Anda hilang.' },
    { id: 2, title: 'Menjelajahi Surga Tersembunyi di Sumba', imageUrl: 'https://images.unsplash.com/photo-1579888941838-3435132a6829?q=80&w=2070&auto=format&fit=crop', category: 'Destinasi', author: 'John Smith', date: '12 Jul 2024', content: 'Jauh dari keramaian Bali, Pulau Sumba di Nusa Tenggara Timur menawarkan pesona alam yang liar dan budaya yang otentik. Pulau ini adalah surga bagi para petualang yang mencari pengalaman berbeda.\nKeindahan alam Sumba sangat beragam. Anda akan menemukan padang savana yang luas seperti di Afrika, di mana kuda-kuda liar berlarian bebas. Bukit Wairinding dan Bukit Tenau adalah tempat yang sempurna untuk menyaksikan matahari terbenam dengan pemandangan perbukitan yang menakjubkan.\nPantai-pantai di Sumba juga tak kalah memukau. Pantai Nihiwatu terkenal sebagai salah satu spot selancar terbaik di dunia. Ada juga Pantai Walakiri dengan pohon-pohon bakau menari yang ikonik saat senja, serta Pantai Mandorak yang diapit oleh dua tebing karang besar.\nSelain alamnya, budaya Sumba juga sangat kaya. Kunjungi desa-desa adat seperti Ratenggaro dengan atap rumah menara yang menjulang tinggi. Saksikan tradisi Pasola, sebuah ritual perang berkuda yang spektakuler, jika Anda berkunjung pada waktu yang tepat (biasanya Februari atau Maret).\nSumba adalah destinasi yang akan memikat Anda dengan keindahan alamnya yang masih perawan dan kehangatan budayanya yang tulus.' },
    { id: 3, title: 'Kuliner Wajib Coba Saat Berkunjung ke Yogyakarta', imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop', category: 'Kuliner', author: 'Alice Johnson', date: '10 Jul 2024', content: 'Yogyakarta, atau Jogja, tidak hanya kaya akan budaya dan seni, tetapi juga merupakan surga bagi para pencinta kuliner. Berikut adalah beberapa hidangan yang wajib Anda cicipi saat berada di kota ini.\n1. Gudeg: Ikon kuliner Jogja. Nangka muda yang dimasak dengan santan dan rempah-rempeh selama berjam-jam hingga empuk dan manis. Biasanya disajikan dengan nasi, krecek (kulit sapi pedas), telur, dan ayam.\n2. Sate Klatak: Sate kambing unik yang ditusuk dengan jeruji sepeda, bukan tusuk sate biasa. Dibumbui hanya dengan garam dan merica, sate ini dipanggang di atas arang, menghasilkan daging yang empuk dengan rasa otentik.\n3. Bakmi Jawa: Mie rebus atau goreng yang dimasak di atas anglo arang, memberikan aroma smokey yang khas. Dimasak dengan suwiran ayam kampung, telur, dan sayuran.\n4. Kopi Joss: Kopi hitam yang disajikan dengan bongkahan arang panas yang dicelupkan langsung ke dalam gelas. Bunyi \\\'joss\\\' saat arang masuk menjadi asal-usul namanya. Arang dipercaya dapat menetralkan asam lambung.\n5. Oseng-Oseng Mercon: Bagi penyuka pedas, ini adalah hidangan yang tepat. Terbuat dari tetelan daging sapi yang dimasak dengan cabai rawit dalam jumlah besar, siap-siap berkeringat!\nSetiap sudut Jogja menawarkan petualangan rasa yang berbeda, menjadikannya destinasi yang sempurna untuk dijelajahi melalui makanannya.' },
    { id: 4, title: 'Panduan Solo Traveling Aman untuk Wanita', imageUrl: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?q=80&w=2070&auto=format&fit=crop', category: 'Tips', author: 'Jane Doe', date: '05 Jul 2024', content: 'Solo traveling bagi wanita bisa menjadi pengalaman yang sangat memberdayakan dan membebaskan. Namun, keamanan tetap menjadi prioritas utama. Berikut adalah beberapa panduan untuk memastikan perjalanan solo Anda aman dan menyenangkan.\n1. Riset Mendalam: Sebelum berangkat, lakukan riset tentang destinasi Anda. Pelajari budaya lokal, norma berpakaian, dan area mana yang aman atau perlu dihindari, terutama pada malam hari.\n2. Pilih Akomodasi yang Aman: Pilihlah hotel, hostel, atau guesthouse yang memiliki ulasan bagus, terutama mengenai keamanan. Hostel khusus wanita bisa menjadi pilihan yang baik.\n3. Berpakaian Seperti Warga Lokal: Cobalah untuk berbaur dan tidak terlalu menonjol sebagai turis. Perhatikan cara berpakaian penduduk setempat dan sesuaikan gaya Anda.\n4. Informasikan Rencana Perjalanan Anda: Beri tahu keluarga atau teman dekat tentang itinerary Anda. Check-in secara teratur agar mereka tahu Anda baik-baik saja.\n5. Percayai Insting Anda: Jika suatu situasi atau seseorang membuat Anda merasa tidak nyaman, segeralah pergi. Insting adalah alat pertahanan terbaik Anda.\n6. Jaga Barang Berharga: Jangan memamerkan barang-barang mahal. Gunakan tas anti-pencurian dan sebarkan uang serta kartu Anda di tempat yang berbeda.\n7. Datang di Siang Hari: Usahakan untuk tiba di destinasi baru saat hari masih terang. Ini akan memudahkan Anda menemukan akomodasi dan membiasakan diri dengan lingkungan sekitar.\n8. Pelajari Beberapa Frasa Lokal: Mengetahui beberapa frasa dasar seperti "tolong," "terima kasih," atau "di mana toilet?" dapat sangat membantu dalam berinteraksi dengan penduduk lokal.\nDengan persiapan yang matang dan sikap waspada, solo traveling bisa menjadi salah satu petualangan terbaik dalam hidup Anda.' },
];

export const blogPosts: BlogPost[] = _blogPosts.map(p => ({ ...p, slug: `${p.id}-${slugify(p.title)}` }));