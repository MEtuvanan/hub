// mobile-data.js — shared demo + live data layer for the phone-first app.
// Live Supabase data is merged over a curated set so the mobile app always has
// something to show (and works offline / before login).

const IMG = {
  arun: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=900&auto=format&fit=crop&q=80',
  temple: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=900&auto=format&fit=crop&q=80',
  city: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=900&auto=format&fit=crop&q=80',
  food: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=900&auto=format&fit=crop&q=80',
  market: 'https://images.unsplash.com/photo-1512003867696-6d5ce6835040?w=900&auto=format&fit=crop&q=80',
  market2: 'https://images.unsplash.com/photo-1540704260519-4ae72e0e35a2?w=900&auto=format&fit=crop&q=80',
  park: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&auto=format&fit=crop&q=80',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80',
  island: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&auto=format&fit=crop&q=80',
  mountain: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&auto=format&fit=crop&q=80',
  chiangmai: 'https://images.unsplash.com/photo-1512553353614-82a7370096dc?w=900&auto=format&fit=crop&q=80',
  boat: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=900&auto=format&fit=crop&q=80',
  elephant: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=900&auto=format&fit=crop&q=80',
  sunset: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80',
};

export const CATEGORIES = [
  { id: 'temple', label: 'วัด & โบราณสถาน', emoji: 'building', icon: 'building', color: '#f2a81d' },
  { id: 'nature', label: 'ธรรมชาติ & ภูเขา', emoji: 'leaf', icon: 'leaf', color: '#38d996' },
  { id: 'beach', label: 'ทะเล & เกาะ', emoji: 'sun', icon: 'sun', color: '#2ec5e8' },
  { id: 'market', label: 'ตลาด & สตรีทฟู้ด', emoji: 'store', icon: 'store', color: '#ff8a5c' },
  { id: 'culture', label: 'พิพิธภัณฑ์ & วัฒนธรรม', emoji: 'building', icon: 'building', color: '#c9a7ff' },
  { id: 'park', label: 'สวน & พักผ่อน', emoji: 'leaf', icon: 'leaf', color: '#7ee787' },
];

export const DEMO_PLACES = [
  {
    id: 'demo-wat-arun', name: 'วัดอรุณราชวราราม', name_en: 'Wat Arun (Temple of Dawn)',
    province: 'กรุงเทพมหานคร', district: 'บางกอกใหญ่', category: 'temple', categoryLabel: 'วัด & โบราณสถาน',
    lat: 13.7437, lng: 100.4889, rating: 4.9, reviews: 2841, verified: true,
    image: IMG.arun, fallbackEmoji: 'building', fee: 'ชาวไทยฟรี · ต่างชาติ 100 ฿', hours: '08:00 – 18:00',
    bestTime: '17:00 – 18:30 น. แสงทองยามเย็น',
    summary: 'พระปรางค์ริมเจ้าพระยาที่สวยที่สุดในยามพระอาทิตย์ตก ประดับด้วยถ้วยชามเบญจรงค์ทั้งองค์',
    description: 'วัดอรุณราชวราราม หรือ "วัดแจ้ง" คือสัญลักษณ์ของกรุงเทพฯ ที่ทุกคนต้องมาเช็คอินสักครั้ง พระปรางค์ประธานสูงกว่า 81 เมตร ประดับด้วยกระเบื้องเคลือบและถ้วยชามเบญจรงค์โบราณนับล้านชิ้น จุดชมพระอาทิตย์ตกและถ่ายรูปชุดไทยที่ขึ้นชื่อที่สุด',
    highlights: [
      { icon: 'sun', title: 'จุดชมพระอาทิตย์ตก', desc: 'วิวแม่น้ำเจ้าพระยาสุดโรแมนติก' },
      { icon: 'shirt', title: 'เช่าชุดไทยถ่ายรูป', desc: 'ชุดไทยพร้อมช่างภาพรอบวัด' },
      { icon: 'shield', title: 'ยักษ์วัดแจ้ง', desc: 'ตำนานยักษ์ทวารบาลคู่แม่น้ำ' },
    ],
    tags: ['ถ่ายรูปสวย', 'ริมน้ำ', 'ชุดไทย', 'พระอาทิตย์ตก'],
  },
  {
    id: 'demo-wat-pho', name: 'วัดพระเชตุพน (วัดโพธิ์)', name_en: 'Wat Pho',
    province: 'กรุงเทพมหานคร', district: 'พระนคร', category: 'temple', categoryLabel: 'วัด & โบราณสถาน',
    lat: 13.7465, lng: 100.4927, rating: 4.8, reviews: 3920, verified: true,
    image: IMG.temple, fallbackEmoji: 'building', fee: 'ชาวไทยฟรี · ต่างชาติ 200 ฿', hours: '08:00 – 18:30',
    bestTime: '14:00 – 17:00 น.',
    summary: 'ที่ประดิษฐานพระนอนองค์ยักษ์ยาว 46 เมตร และต้นกำเนิดนวดแผนไทย',
    description: 'วัดโพธิ์คือมหาวิทยาลัยแห่งแรกของสยาม เป็นที่ประดิษฐานพระพุทธไสยาสน์องค์ใหญ่สีทองอร่ามยาว 46 เมตร พร้อมตำรับนวดแผนไทยที่ได้รับการขึ้นทะเบียนมรดกโลก',
    highlights: [
      { icon: 'star', title: 'พระนอน 46 เมตร', desc: 'พระพุทธไสยาสน์องค์ใหญ่ที่สุด' },
      { icon: 'heart', title: 'นวดแผนไทยตำรับวัด', desc: 'ผ่อนคลายหลังเดินเที่ยว' },
      { icon: 'building', title: 'พระมหาเจดีย์ 4 รัชกาล', desc: 'เจดีย์กระเบื้องเคลือบสีสดใส' },
    ],
    tags: ['สายบุญ', 'ประวัติศาสตร์', 'นวดไทย'],
  },
  {
    id: 'demo-wat-phra-kaew', name: 'วัดพระศรีรัตนศาสดาราม', name_en: 'Wat Phra Kaew',
    province: 'กรุงเทพมหานคร', district: 'พระนคร', category: 'temple', categoryLabel: 'วัด & โบราณสถาน',
    lat: 13.75, lng: 100.4914, rating: 4.9, reviews: 5120, verified: true,
    image: IMG.temple, fallbackEmoji: 'building', fee: 'ชาวไทยฟรี · ต่างชาติ 500 ฿', hours: '08:30 – 15:30',
    bestTime: '08:30 – 10:30 น.',
    summary: 'วัดคู่บ้านคู่เมือง ประดิษฐานพระแก้วมรกตและจิตรกรรมรามเกียรติ์',
    description: 'วัดพระแก้วตั้งอยู่ในพระบรมมหาราชวัง เป็นที่ประดิษฐานพระแก้วมรกตและภาพจิตรกรรมฝาผนังรามเกียรติ์ที่ยาวที่สุดในโลก',
    highlights: [
      { icon: 'trophy', title: 'พระแก้วมรกต', desc: 'พระพุทธรูปคู่ชาติไทย' },
      { icon: 'palette', title: 'จิตรกรรมรามเกียรติ์', desc: 'ภาพเขียน 178 ห้องรอบระเบียง' },
      { icon: 'shield', title: 'ยักษ์ทวารบาล', desc: 'ยักษ์สูง 6 เมตร 12 ตน' },
    ],
    tags: ['แลนด์มาร์ก', 'สายบุญ', 'ต้องมา'],
  },
  {
    id: 'demo-yaowarat', name: 'ถนนเยาวราช', name_en: 'Yaowarat Chinatown',
    province: 'กรุงเทพมหานคร', district: 'สัมพันธวงศ์', category: 'market', categoryLabel: 'ตลาด & สตรีทฟู้ด',
    lat: 13.7398, lng: 100.51, rating: 4.8, reviews: 1860, verified: true,
    image: IMG.food, fallbackEmoji: 'store', fee: 'ฟรี', hours: '17:00 – 24:00',
    bestTime: '18:30 – 21:30 น.',
    summary: 'สวรรค์สตรีทฟู้ดระดับมิชลิน ท่ามกลางแสงนีออนและกลิ่นหอมตลอดถนนมังกร',
    description: 'เยาวราชคือถนนมังกรที่คึกคักที่สุดในกรุงเทพฯ ยิ่งค่ำยิ่งสวย ร้านอาหารริมทางระดับมิชลินเรียงรายทั้งกวยจั๊บ ขนมปังปิ้ง ซีฟู้ดย่าง และหลวงพ่อทองคำวัดไตรมิตร',
    highlights: [
      { icon: 'store', title: 'สตรีทฟู้ดมิชลิน', desc: 'กวยจั๊บนายเอ็ก ขนมปังเจ้าอร่อย' },
      { icon: 'star', title: 'ประตูโอเดียน', desc: 'ซุ้มประตูจีนสีแดงทอง' },
      { icon: 'camera', title: 'ถ่ายรูปแสงนีออน', desc: 'มุมกล้องสุดคลาสสิก' },
    ],
    tags: ['ของกิน', 'กลางคืน', 'ถ่ายรูป'],
  },
  {
    id: 'demo-chatuchak', name: 'ตลาดนัดจตุจักร', name_en: 'Chatuchak Weekend Market',
    province: 'กรุงเทพมหานคร', district: 'จตุจักร', category: 'market', categoryLabel: 'ตลาด & สตรีทฟู้ด',
    lat: 13.7999, lng: 100.55, rating: 4.6, reviews: 2410, verified: true,
    image: IMG.market2, fallbackEmoji: 'store', fee: 'ฟรี', hours: '09:00 – 18:00 (เสาร์–อาทิตย์)',
    bestTime: '09:00 – 11:00 น.',
    summary: 'ตลาดนัดใหญ่ที่สุดในโลก 15,000 แผงค้า ครบทั้งแฟชั่น ของแต่งบ้าน และของกิน',
    description: 'จตุจักรมี 27 โครงการและมากกว่า 15,000 แผง เดินทั้งวันก็ไม่หมด เป็นสวรรค์ของนักช้อปและนักสะสมของวินเทจ',
    highlights: [
      { icon: 'store', title: 'แฟชั่นวินเทจ', desc: 'เสื้อผ้าและของสะสมหายาก' },
      { icon: 'leaf', title: 'โซนต้นไม้', desc: 'แคคตัสและบอนไซราคาดี' },
      { icon: 'store', title: 'โซนอาหาร', desc: 'ของกินทั่วไทยในที่เดียว' },
    ],
    tags: ['ช้อปปิ้ง', 'วันหยุด', 'ของกิน'],
  },
  {
    id: 'demo-lumphini', name: 'สวนลุมพินี', name_en: 'Lumphini Park',
    province: 'กรุงเทพมหานคร', district: 'ปทุมวัน', category: 'park', categoryLabel: 'สวน & พักผ่อน',
    lat: 13.7315, lng: 100.5417, rating: 4.7, reviews: 1240, verified: true,
    image: IMG.park, fallbackEmoji: 'leaf', fee: 'ฟรี', hours: '04:30 – 21:00',
    bestTime: '06:00 – 08:00 น. หรือ 17:00 – 19:00 น.',
    summary: 'ปอดของกรุงเทพฯ วิ่งริมทะเลสาบ ท่ามกลางตึกสูงและฝูงนก',
    description: 'สวนลุมพินีคือพื้นที่สีเขียวใจกลางเมือง เหมาะกับวิ่ง ปั่นจักรยาน และพักผ่อนชมพระอาทิตย์ตกท่ามกลางตึกระฟ้า',
    highlights: [
      { icon: 'user', title: 'เส้นทางวิ่ง', desc: 'ลู่วิ่งริมทะเลสาบ 2.5 กม.' },
      { icon: 'leaf', title: 'เต่าและนก', desc: 'สัตว์เล็กๆ ริมน้ำ' },
      { icon: 'sun', title: 'พระอาทิตย์ตก', desc: 'วิวตึกสูงสุดอลังการ' },
    ],
    tags: ['ออกกำลังกาย', 'ครอบครัว', 'ฟรี'],
  },
  {
    id: 'demo-mahanakhon', name: 'มหานครสกายวอล์ค', name_en: 'Mahanakhon SkyWalk',
    province: 'กรุงเทพมหานคร', district: 'บางรัก', category: 'culture', categoryLabel: 'พิพิธภัณฑ์ & วัฒนธรรม',
    lat: 13.7237, lng: 100.5285, rating: 4.8, reviews: 1680, verified: true,
    image: IMG.city, fallbackEmoji: 'sun', fee: 'เริ่มต้น 880 ฿', hours: '10:00 – 24:00',
    bestTime: '17:30 – 19:30 น.',
    summary: 'จุดชมวิวกลางเมืองที่สูงที่สุด พื้นกระจกใสและบาร์กลางฟ้า',
    description: 'มหานครสกายวอล์คชั้น 78 ให้วิวกรุงเทพฯ แบบ 360 องศา พร้อมพื้นกระจกใสที่เหมือนลอยอยู่กลางอากาศ',
    highlights: [
      { icon: 'sun', title: 'ชมวิว 360°', desc: 'ชั้น 78 ใจกลางสาทร' },
      { icon: 'building', title: 'พื้นกระจกใส', desc: 'มุมกล้องสุดเสียว' },
      { icon: 'store', title: 'บาร์พระอาทิตย์ตก', desc: 'ค็อกเทลพร้อมวิว' },
    ],
    tags: ['จุดชมวิว', 'กลางคืน', 'ถ่ายรูป'],
  },
  {
    id: 'demo-doi-suthep', name: 'ดอยสุเทพ', name_en: 'Doi Suthep',
    province: 'เชียงใหม่', district: 'เมืองเชียงใหม่', category: 'nature', categoryLabel: 'ธรรมชาติ & ภูเขา',
    lat: 18.8049, lng: 98.9216, rating: 4.9, reviews: 3410, verified: true,
    image: IMG.chiangmai, fallbackEmoji: 'leaf', fee: 'ชาวไทยฟรี · ต่างชาติ 30 ฿', hours: '06:00 – 18:00',
    bestTime: '06:00 – 09:00 น.',
    summary: 'วัดบนภูเขาสูงสุดของเชียงใหม่ วิวหมอกและบันได Nagas อันเลื่องชื่อ',
    description: 'พระธาตุดอยสุเทพเป็นสถานที่ศักดิ์สิทธิ์คู่เชียงใหม่ ขึ้นบันได 306 ขั้นสู่ลานวัดที่มองเห็นเมืองทั้งเมือง',
    highlights: [
      { icon: 'building', title: 'พระธาตุดอยสุเทพ', desc: 'เจดีย์ทองคำคู่เมือง' },
      { icon: 'leaf', title: 'ทะเลหมอก', desc: 'วิวเชียงใหม่ยามเช้า' },
      { icon: 'flag', title: 'บันได Nagas', desc: 'บันไดมังกร 306 ขั้น' },
    ],
    tags: ['ภูเขา', 'สายบุญ', 'หมอก'],
  },
  {
    id: 'demo-ayutthaya', name: 'อุทยานประวัติศาสตร์อยุธยา', name_en: 'Ayutthaya Historical Park',
    province: 'พระนครศรีอยุธยา', district: 'พระนครศรีอยุธยา', category: 'culture', categoryLabel: 'พิพิธภัณฑ์ & วัฒนธรรม',
    lat: 14.3532, lng: 100.5685, rating: 4.8, reviews: 2210, verified: true,
    image: IMG.sunset, fallbackEmoji: 'building', fee: 'ชาวไทย 10 ฿ · ต่างชาติ 40 ฿', hours: '08:00 – 18:00',
    bestTime: '16:30 – 18:00 น.',
    summary: 'เมืองหลวงเก่าที่เต็มไปด้วยวัดร้างและพระปรางค์ ขึ้นทะเบียนมรดกโลก',
    description: 'นครประวัติศาสตร์แห่งราชอาณาจักรอยุธยา 216 ปี มีวัดร้าง ปรางค์ และพระพุทธรูปโบราณให้สำรวจ พร้อมบรรยากาศย้อนเวลาที่ได้ทั้งประวัติศาสตร์และภาพสวย',
    highlights: [
      { icon: 'building', title: 'วัดมหาธาตุ', desc: 'เศียรพระพุทธรูปในรากไม้ชื่อดัง' },
      { icon: 'bike', title: 'ปั่นจักรยานชมเมือง', desc: 'เส้นทางเรียบและร่มรื่น' },
      { icon: 'sun', title: 'แสงเย็นที่วัด', desc: 'ภาพพระปรางค์ยามชมพู' },
    ],
    tags: ['มรดกโลก', 'ประวัติศาสตร์', 'ถ่ายรูป'],
  },
  {
    id: 'demo-patong', name: 'หาดป่าตอง', name_en: 'Patong Beach',
    province: 'ภูเก็ต', district: 'กะทู้', category: 'beach', categoryLabel: 'ทะเล & เกาะ',
    lat: 7.8965, lng: 98.2966, rating: 4.7, reviews: 4120, verified: true,
    image: IMG.beach, fallbackEmoji: 'sun', fee: 'ฟรี', hours: '24 ชั่วโมง',
    bestTime: '16:00 – 19:00 น.',
    summary: 'หาดยอดนิยมของภูเก็ต คลื่นสวย น้ำใส และไนต์ไลฟ์คึกคัก',
    description: 'หาดป่าตองเป็นหัวใจของภูเก็ต มีร้านอาหาร บาร์ และกิจกรรมทางน้ำครบครัน เหมาะทั้งพักผ่อนและปาร์ตี้',
    highlights: [
      { icon: 'sun', title: 'กิจกรรมทางน้ำ', desc: 'เจ็ทสกี พาราเซลล์' },
      { icon: 'sun', title: 'พระอาทิตย์ตก', desc: 'วิวทะเลสุดโรแมนติก' },
      { icon: 'store', title: 'ซีฟู้ด', desc: 'กุ้งเผาและอาหารทะเลสด' },
    ],
    tags: ['ทะเล', 'ปาร์ตี้', 'ครอบครัว'],
  },
  {
    id: 'demo-phi-phi', name: 'เกาะพีพี', name_en: 'Phi Phi Islands',
    province: 'กระบี่', district: 'เมืองกระบี่', category: 'beach', categoryLabel: 'ทะเล & เกาะ',
    lat: 7.7407, lng: 98.7784, rating: 4.9, reviews: 3820, verified: true,
    image: IMG.island, fallbackEmoji: 'sun', fee: 'เรือทัวร์เริ่ม 1,200 ฿', hours: '08:00 – 17:00',
    bestTime: '09:00 – 15:00 น.',
    summary: 'หมู่เกาะหินปูนระดับโลก น้ำทะเลสีเทอร์ควอยซ์และอ่าวมาหยา',
    description: 'พีพีคือหมู่เกาะในฝันของนักดำน้ำและนักถ่ายรูป มีอ่าวมาหยา ลากูนลับ และ reefs ที่อุดมสมบูรณ์',
    highlights: [
      { icon: 'sun', title: 'ดำน้ำตื้น', desc: 'ปะการังและปลาการ์ตูน' },
      { icon: 'navigate', title: 'ทัวร์เรือ', desc: 'อ่าวมาหยาและลากูน' },
      { icon: 'sun', title: 'หาดทรายขาว', desc: 'วิวเกาะหินปูน' },
    ],
    tags: ['เกาะ', 'ดำน้ำ', 'สุดยอดวิว'],
  },
  {
    id: 'demo-sri-nakharin', name: 'เขื่อนศรีนครินทร์', name_en: 'Srinakarin Dam',
    province: 'กาญจนบุรี', district: 'ศรีสวัสดิ์', category: 'nature', categoryLabel: 'ธรรมชาติ & ภูเขา',
    lat: 14.3846, lng: 99.124, rating: 4.7, reviews: 980, verified: true,
    image: IMG.mountain, fallbackEmoji: 'leaf', fee: 'ฟรี', hours: '06:00 – 18:00',
    bestTime: '05:30 – 08:00 น.',
    summary: 'เขื่อนใหญ่ที่สุดของไทย วิวน้ำสีเขียวมรกตและการล่องเรือ',
    description: 'เขื่อนศรีนครินทร์ท่ามกลางขุนเขาและป่าไม้ เหมาะกับล่องเรือ พายเรือคายัค และชมพระอาทิตย์ขึ้นเหนือน้ำ',
    highlights: [
      { icon: 'navigate', title: 'ล่องเรือ', desc: 'ชมวิวน้ำและภูเขา' },
      { icon: 'navigate', title: 'คายัค', desc: 'กิจกรรมกลางน้ำ' },
      { icon: 'sun', title: 'พระอาทิตย์ขึ้น', desc: 'หมอกเหนือเขื่อน' },
    ],
    tags: ['ธรรมชาติ', 'แคมป์ปิ้ง', 'เงียบสงบ'],
  },
  {
    id: 'demo-bangsaen', name: 'หาดบางแสน', name_en: 'Bang Saen Beach',
    province: 'ชลบุรี', district: 'เมืองชลบุรี', category: 'beach', categoryLabel: 'ทะเล & เกาะ',
    lat: 13.2777, lng: 100.9278, rating: 4.5, reviews: 1520, verified: true,
    image: IMG.beach, fallbackEmoji: 'sun', fee: 'ฟรี', hours: '24 ชั่วโมง',
    bestTime: '16:00 – 19:00 น.',
    summary: 'ทะเลใกล้กรุงเทพฯ เดินทางง่าย อาหารทะเลอร่อยและบรรยากาศชิล',
    description: 'บางแสนเป็นชายหาดยอดนิยมสำหรับคนกรุง เดินทางไม่ไกล มีร้านซีฟู้ดและกิจกรรมริมทะเลครบ',
    highlights: [
      { icon: 'store', title: 'ซีฟู้ดบางแสน', desc: 'ปูม้าและหอยเชลล์' },
      { icon: 'bike', title: 'ปั่นเลียบทะเล', desc: 'เส้นทางริมชายหาด' },
      { icon: 'sun', title: 'พระอาทิตย์ตก', desc: 'วิวอ่าวไทย' },
    ],
    tags: ['ใกล้กรุงเทพ', 'ทะเล', 'ของกิน'],
  },
  {
    id: 'demo-sukhothai', name: 'อุทยานประวัติศาสตร์สุโขทัย', name_en: 'Sukhothai Historical Park',
    province: 'สุโขทัย', district: 'เมืองสุโขทัย', category: 'culture', categoryLabel: 'พิพิธภัณฑ์ & วัฒนธรรม',
    lat: 17.0174, lng: 99.7035, rating: 4.9, reviews: 1320, verified: true,
    image: IMG.sunset, fallbackEmoji: 'sun', fee: '20 ฿', hours: '06:00 – 21:00',
    bestTime: '17:00 – 19:00 น.',
    summary: 'เมืองหลวงแรกของไทย วัดร้างและพระพุทธรูปกลางทะเลสาบ',
    description: 'สุโขทัยคือรุ่งอรุณแห่งความสุขของไทย มีวัดมหาธาตุ พระพุทธรูปสำริด และบรรยากาศย้อนยุคที่งดงาม',
    highlights: [
      { icon: 'sun', title: 'พระอาทิตย์ตก', desc: 'เงาพระพุทธรูปกลางน้ำ' },
      { icon: 'bike', title: 'จักรยาน', desc: 'ปั่นชมเมืองโบราณ' },
      { icon: 'heart', title: 'วัดมหาธาตุ', desc: 'พระพุทธรูปสำริดองค์ใหญ่' },
    ],
    tags: ['มรดกโลก', 'ประวัติศาสตร์', 'บรรยากาศดี'],
  },
];

export const DEMO_QUESTS = [
  {
    id: 'q-arun-sunset', title: 'ตามล่าพระอาทิตย์ตกที่วัดอรุณ', placeId: 'demo-wat-arun', placeName: 'วัดอรุณราชวราราม',
    province: 'กรุงเทพมหานคร', type: 'photo', typeLabel: 'ถ่ายภาพ', difficulty: 'easy', reward: 80, minutes: 20,
    image: IMG.arun, emoji: 'sun', code: 'ARUN',
    summary: 'ถ่ายภาพพระปรางค์ยามแสงทองกับเงาสะท้อนแม่น้ำเจ้าพระยา แล้วแชร์มุมที่คุณชอบที่สุด',
    steps: ['เดินไปยังท่าริมแม่น้ำด้านหน้าวัด', 'ถ่ายรูปพระปรางค์ในมุมที่เห็นเงาสะท้อนน้ำ', 'กรอกรหัสเช็คอินที่ป้ายกิจกรรมเพื่อรับโทเคน'],
    tags: ['ถ่ายรูป', 'ริมน้ำ', 'พระอาทิตย์ตก'],
  },
  {
    id: 'q-pho-recline', title: 'ปริศนาพระนอน 46 เมตร', placeId: 'demo-wat-pho', placeName: 'วัดพระเชตุพน (วัดโพธิ์)',
    province: 'กรุงเทพมหานคร', type: 'quiz', typeLabel: 'ตอบคำถาม', difficulty: 'easy', reward: 60, minutes: 15,
    image: IMG.temple, emoji: 'star', code: 'PHO',
    summary: 'สำรวจพระพุทธไสยาสน์และตอบคำถามเกี่ยวกับมรดกโลกแห่งการนวดแผนไทย',
    steps: ['เดินชมพระวิหารพระนอน', 'สังเกตภาพมงคล 108 ประการที่ฝ่าเท้า', 'ตอบคำถามให้ถูกเพื่อรับรางวัล'],
    tags: ['สายบุญ', 'ประวัติศาสตร์'],
  },
  {
    id: 'q-kaew-emerald', title: 'ผู้พิทักษ์พระแก้วมรกต', placeId: 'demo-wat-phra-kaew', placeName: 'วัดพระศรีรัตนศาสดาราม',
    province: 'กรุงเทพมหานคร', type: 'culture', typeLabel: 'วัฒนธรรม', difficulty: 'medium', reward: 120, minutes: 30,
    image: IMG.temple, emoji: 'trophy', code: 'KAEW',
    summary: 'ตามหารายละเอียดจิตรกรรมรามเกียรติ์และเครื่องทรงพระแก้วมรกตทั้ง 3 ฤดู',
    steps: ['เดินชมระเบียงคดรอบพระอุโบสถ', 'หาภาพยักษ์ทวารบาลและจดชื่อ', 'กรอกรหัสจากป้ายกิจกรรม'],
    tags: ['วัฒนธรรม', 'สายบุญ', 'ท้าทาย'],
  },
  {
    id: 'q-yaowarat-food', title: 'ทัวร์สตรีทฟู้ดเยาวราช', placeId: 'demo-yaowarat', placeName: 'ถนนเยาวราช',
    province: 'กรุงเทพมหานคร', type: 'exploration', typeLabel: 'สำรวจ', difficulty: 'easy', reward: 75, minutes: 45,
    image: IMG.food, emoji: 'store', code: 'YAW',
    summary: 'ชิมอาหารริมทางอย่างน้อย 3 ร้านและถ่ายรูปป้ายนีออนสุดคลาสสิก',
    steps: ['เริ่มจากซุ้มประตูโอเดียน', 'เลือกชิม 3 ร้านที่คนต่อแถว', 'ถ่ายรูปป้ายไฟและกรอกรหัส'],
    tags: ['ของกิน', 'กลางคืน', 'ถ่ายรูป'],
  },
  {
    id: 'q-chatuchak-hunt', title: 'นักล่าของหายากจตุจักร', placeId: 'demo-chatuchak', placeName: 'ตลาดนัดจตุจักร',
    province: 'กรุงเทพมหานคร', type: 'exploration', typeLabel: 'สำรวจ', difficulty: 'hard', reward: 150, minutes: 90,
    image: IMG.market2, emoji: 'store', code: 'JJ',
    summary: 'ตามหา 3 สิ่งของในตลาด 15,000 แผง แล้วบันทึกพิกัดร้านที่เจอ',
    steps: ['หาแผงขายแคคตัสที่ใหญ่ที่สุด', 'ตามหาร้านเสื้อวินเทจ', 'หาของกินชื่อดังโซน 26', 'กรอกรหัสเช็คอิน'],
    tags: ['ช้อปปิ้ง', 'ท้าทาย', 'วันหยุด'],
  },
  {
    id: 'q-lumphini-run', title: 'วิ่งลุมพินี 2.5 กม.', placeId: 'demo-lumphini', placeName: 'สวนลุมพินี',
    province: 'กรุงเทพมหานคร', type: 'photo', typeLabel: 'ถ่ายภาพ', difficulty: 'medium', reward: 90, minutes: 30,
    image: IMG.park, emoji: 'user', code: 'RUN',
    summary: 'วิ่งรอบทะเลสาบและถ่ายรูปเหงื่อพร้อมวิวตึกสูง',
    steps: ['วอร์มที่ประตูสวน', 'วิ่งรอบทะเลสาบ 1 รอบ', 'ถ่ายรูปที่จุดชมวิว', 'กรอกรหัส'],
    tags: ['ออกกำลังกาย', 'ฟรี'],
  },
  {
    id: 'q-mahanakhon-view', title: 'พิชิตยอดฟ้ามหานคร', placeId: 'demo-mahanakhon', placeName: 'มหานครสกายวอล์ค',
    province: 'กรุงเทพมหานคร', type: 'photo', typeLabel: 'ถ่ายภาพ', difficulty: 'medium', reward: 110, minutes: 25,
    image: IMG.city, emoji: 'sun', code: 'SKY',
    summary: 'ขึ้นไปชั้น 78 ถ่ายภาพกรุงเทพฯ แบบ 360 องศาในช่วงพระอาทิตย์ตก',
    steps: ['ขึ้นลิฟต์ไปชั้น 74', 'เดินขึ้นสกายวอล์คชั้น 78', 'ถ่ายรูปและกรอกรหัส'],
    tags: ['จุดชมวิว', 'ถ่ายรูป', 'กลางคืน'],
  },
  {
    id: 'q-doi-suthep-mist', title: 'ตามหาหมอกดอยสุเทพ', placeId: 'demo-doi-suthep', placeName: 'ดอยสุเทพ',
    province: 'เชียงใหม่', type: 'nature', typeLabel: 'ธรรมชาติ', difficulty: 'medium', reward: 130, minutes: 60,
    image: IMG.chiangmai, emoji: 'leaf', code: 'DOI',
    summary: 'ขึ้นบันไดมังกร 306 ขั้น และถ่ายภาพทะเลหมอกยามเช้า',
    steps: ['ขึ้นบันได Nagas 306 ขั้น', 'ชมพระธาตุดอยสุเทพ', 'ถ่ายภาพวิวเมืองเชียงใหม่', 'กรอกรหัส'],
    tags: ['ภูเขา', 'หมอก', 'สายบุญ'],
  },
  {
    id: 'q-ayutthaya-bike', title: 'ปั่นย้อนเวลาอยุธยา', placeId: 'demo-ayutthaya', placeName: 'อุทยานประวัติศาสตร์อยุธยา',
    province: 'พระนครศรีอยุธยา', type: 'culture', typeLabel: 'วัฒนธรรม', difficulty: 'hard', reward: 160, minutes: 120,
    image: IMG.sunset, emoji: 'building', code: 'AYU',
    summary: 'ปั่นจักรยานชมวัดร้าง 5 แห่งและตามหาเศียรพระในรากไม้',
    steps: ['เช่าจักรยานที่ทางเข้า', 'เยี่ยมวัดมหาธาตุและวัดราชบูรณะ', 'ถ่ายรูปเศียรพระในรากไม้', 'กรอกรหัส'],
    tags: ['มรดกโลก', 'จักรยาน', 'ประวัติศาสตร์'],
  },
  {
    id: 'q-patong-sunset', title: 'เก็บพระอาทิตย์ตกป่าตอง', placeId: 'demo-patong', placeName: 'หาดป่าตอง',
    province: 'ภูเก็ต', type: 'photo', typeLabel: 'ถ่ายภาพ', difficulty: 'easy', reward: 70, minutes: 20,
    image: IMG.beach, emoji: 'sun', code: 'PATONG',
    summary: 'ถ่ายภาพเงาริมหาดป่าตองยามพระอาทิตย์ตกและชิมซีฟู้ด',
    steps: ['เดินเลียบหาดช่วงเย็น', 'ถ่ายภาพพระอาทิตย์ตก', 'กรอกรหัสจากร้านร่วมรายการ'],
    tags: ['ทะเล', 'พระอาทิตย์ตก', 'ของกิน'],
  },
  {
    id: 'q-phi-snorkel', title: 'สำรวจโลกใต้ทะเลพีพี', placeId: 'demo-phi-phi', placeName: 'เกาะพีพี',
    province: 'กระบี่', type: 'nature', typeLabel: 'ธรรมชาติ', difficulty: 'medium', reward: 140, minutes: 90,
    image: IMG.island, emoji: 'sun', code: 'PHIPHI',
    summary: 'ดำน้ำตื้นชมปะการังและถ่ายรูปอ่าวมาหยา',
    steps: ['ลงเรือจากท่าเรือกระบี่', 'ดำน้ำตื้นจุดแรก', 'ถ่ายรูปอ่าวมาหยา', 'กรอกรหัส'],
    tags: ['เกาะ', 'ดำน้ำ', 'ทะเล'],
  },
  {
    id: 'q-srinakarin-sunrise', title: 'ตื่นเช้าชมเขื่อนศรีนครินทร์', placeId: 'demo-sri-nakharin', placeName: 'เขื่อนศรีนครินทร์',
    province: 'กาญจนบุรี', type: 'nature', typeLabel: 'ธรรมชาติ', difficulty: 'easy', reward: 85, minutes: 40,
    image: IMG.mountain, emoji: 'sun', code: 'DAM',
    summary: 'ชมพระอาทิตย์ขึ้นเหนือน้ำและล่องเรือชมภูเขา',
    steps: ['ไปถึงเขื่อนก่อน 06:00', 'ถ่ายภาพหมอกเหนือน้ำ', 'กรอกรหัสที่ศูนย์บริการ'],
    tags: ['ธรรมชาติ', 'พระอาทิตย์ขึ้น', 'เงียบสงบ'],
  },
];

export const PROVINCES = [...new Set(DEMO_PLACES.map(p => p.province))];

export function districtsOf(province) {
  return [...new Set(DEMO_PLACES.filter(p => p.province === province).map(p => p.district))];
}

export function categoryMeta(key) {
  return CATEGORIES.find(c => c.id === key) || { id: key, label: key || 'สถานที่ท่องเที่ยว', emoji: 'pin', icon: 'pin', color: '#1f7a5c' };
}

export function getPlace(id) {
  return DEMO_PLACES.find(p => p.id === id) || null;
}

export function questsForPlace(placeId) {
  return DEMO_QUESTS.filter(q => q.placeId === placeId);
}

const DB_PLACE_COLORS = ['#1f7a5c', '#f2a81d', '#2ec5e8', '#ff8a5c', '#c9a7ff', '#38d996'];

function normalizeDbPlace(p, idx = 0) {
  const cat = p.place_categories?.name || p.category_th || '';
  let category = 'culture';
  if (/temple|วัด/i.test(cat)) category = 'temple';
  else if (/market|ตลาด/i.test(cat)) category = 'market';
  else if (/park|สวน/i.test(cat)) category = 'park';
  else if (/beach|ทะเล|เกาะ/i.test(cat)) category = 'beach';
  else if (/nature|ธรรมชาติ|ภูเขา/i.test(cat)) category = 'nature';
  const images = (p.place_images || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
  return {
    id: p.id,
    name: p.name_display || p.name || 'สถานที่ท่องเที่ยว',
    name_en: p.name_en_display || p.name || '',
    province: p.provinces?.name_th || p.provinces?.name_en || p.province || 'กรุงเทพมหานคร',
    district: p.districts?.name_th || p.districts?.name_en || p.district || '',
    category,
    categoryLabel: p.category_th || cat || categoryMeta(category).label,
    lat: Number(p.lat) || 13.75,
    lng: Number(p.lng) || 100.5,
    rating: p.rating || (4.5 + ((idx * 7) % 5) / 10),
    reviews: p.reviews || 120 + idx * 37,
    verified: !!p.verified,
    image: images[0]?.url || p.cover_image_display || IMG.temple,
    fallbackEmoji: categoryMeta(category).emoji,
    fee: p.entry_fee_display || p.entry_fee || 'โปรดตรวจสอบ',
    hours: p.opening_hours_display || p.opening_hours || 'เปิดทุกวัน',
    bestTime: p.best_time_display || p.best_time || 'ช่วงเช้าหรือเย็น',
    summary: p.summary_display || p.summary || '',
    description: p.description_display || p.description || p.summary || '',
    highlights: (p.highlights_display || p.highlights || []).slice(0, 3),
    tags: p.tags || [],
  };
}

function normalizeDbQuest(q, idx = 0) {
  const place = q.quest_places?.[0]?.places || {};
  return {
    id: q.id,
    title: q.title || 'เควสท์ท่องเที่ยว',
    placeId: place.id || '',
    placeName: place.name || '',
    province: place.provinces?.name_th || '',
    type: q.type || 'exploration',
    typeLabel: ({ quiz: 'ตอบคำถาม', code: 'รหัสเช็คอิน', photo: 'ถ่ายภาพ', exploration: 'สำรวจ', culture: 'วัฒนธรรม', history: 'ประวัติศาสตร์', nature: 'ธรรมชาติ' })[q.type] || 'ภารกิจ',
    difficulty: q.difficulty || 'easy',
    reward: Number(q.reward_tokens) || 50,
    minutes: 15 + (idx % 5) * 10,
    image: q.image_url || place.cover_image || IMG.temple,
    emoji: ['quest', 'camera', 'compass', 'store', 'building'][idx % 5],
    summary: q.description || q.instructions || 'ทำภารกิจให้สำเร็จเพื่อรับโทเคนรางวัล',
    steps: ['อ่านรายละเอียดภารกิจ', 'เดินทางไปยังสถานที่จริง', 'ทำภารกิจและกรอกรหัสเช็คอิน'],
    tags: [q.type || 'quest'],
    code: null,
  };
}

// Live data is best-effort. The curated set stays as a guaranteed fallback.
export async function fetchPlaces() {
  try {
    const mod = await import('./places.js');
    const rows = await mod.listPlaces();
    if (!Array.isArray(rows) || !rows.length) return [...DEMO_PLACES];
    const names = new Set(rows.map(p => (p.name || '').toLowerCase()));
    const extra = DEMO_PLACES.filter(p => !names.has(p.name.toLowerCase()));
    return [...rows.map(normalizeDbPlace), ...extra];
  } catch (e) {
    console.warn('mobile places: using curated set', e?.message || e);
    return [...DEMO_PLACES];
  }
}

export async function fetchQuests() {
  try {
    const mod = await import('./quests.js');
    const rows = await mod.listQuests();
    if (!Array.isArray(rows) || !rows.length) return [...DEMO_QUESTS];
    const titles = new Set(rows.map(q => (q.title || '').toLowerCase()));
    const extra = DEMO_QUESTS.filter(q => !titles.has(q.title.toLowerCase()));
    return [...rows.map(normalizeDbQuest), ...extra];
  } catch (e) {
    console.warn('mobile quests: using curated set', e?.message || e);
    return [...DEMO_QUESTS];
  }
}

export async function findPlace(id) {
  if (!id) return null;
  const demo = getPlace(id);
  if (demo) return demo;
  try {
    const mod = await import('./places.js');
    const p = await mod.getPlace(id);
    return p ? normalizeDbPlace(p) : null;
  } catch {
    return null;
  }
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  return value;
}

export const LIKED_PLACES_KEY = 'tc_mobile_liked_places';
export const LIKED_QUESTS_KEY = 'tc_mobile_liked_quests';
export const PASSED_PLACES_KEY = 'tc_mobile_passed_places';
export const PASSED_QUESTS_KEY = 'tc_mobile_passed_quests';
export const COMPLETED_QUESTS_KEY = 'tc_mobile_completed_quests';
export const OUTFIT_KEY = 'tc_mobile_outfit';

export function favoritePlaces() {
  return new Set(readJSON(LIKED_PLACES_KEY, []));
}
export function toggleFavoritePlace(id) {
  const set = favoritePlaces();
  if (set.has(id)) set.delete(id); else set.add(id);
  writeJSON(LIKED_PLACES_KEY, [...set]);
  return set.has(id);
}

export function completedQuests() {
  return new Set(readJSON(COMPLETED_QUESTS_KEY, []));
}

export const DEFAULT_OUTFIT = {
  preset: 'ray',
  hair: 'spiky',
  hairColor: '#2b1a13',
  top: 'jacket',
  topColor: '#2f6fed',
  bottom: 'cargo',
  bottomColor: '#25324a',
  shoes: 'boots',
  shoeColor: '#4a2f1b',
  hat: 'none',
  hatColor: '#f2a81d',
  accessory: 'camera',
  skin: '#f2c49b',
};

export function loadOutfit() {
  return { ...DEFAULT_OUTFIT, ...readJSON(OUTFIT_KEY, {}) };
}
export function saveOutfit(outfit) {
  return writeJSON(OUTFIT_KEY, outfit);
}

export const CHARACTERS = [
  { id: 'char-ray', name: 'นักสำรวจ — เรย์', image: '/assets/img/ray.png', rarity: 'epic', cost: 0, color: '#2f6fed', desc: 'นักสำรวจหนุ่มชุดน้ำเงิน-ขาว พร้อมกล้องส่องทางไกล', bonus: '×2 โทเคนเควสท์ใหม่' },
  { id: 'char-maya', name: 'นักสำรวจ — มายา', image: '/assets/img/maya.png', rarity: 'epic', cost: 0, color: '#38b26b', desc: 'นักสำรวจสาวพลังงานสูงชุดเหลือง-เขียว', bonus: '×2 โทเคนเควสท์ริมน้ำ' },
  { id: 'char-zael', name: 'พ่อมดกลางคืน — ซาเอล', image: '/assets/img/zael.png', rarity: 'legendary', cost: 500, color: '#7c4dff', desc: 'พ่อมดลึกลับสหายแมวดำตาเหลือง', bonus: '×3 โทเคนเควสท์กลางคืน' },
  { id: 'char-luna', name: 'พ่อมดแห่งวัด — ลูน่า', image: '/assets/img/luna.png', rarity: 'rare', cost: 350, color: '#e8564a', desc: 'นักมนตราสาวผมขาวชุดแดง-ขาว', bonus: '×2.5 โทเคนเควสท์วัด' },
];

export const OUTFIT_OPTIONS = {
  hair: [
    { id: 'spiky', label: 'ผมตั้ง', emoji: 'flame', icon: 'flame' },
    { id: 'bob', label: 'ผมบ๊อบ', emoji: 'scissors', icon: 'scissors' },
    { id: 'ponytail', label: 'หางม้า', emoji: 'star', icon: 'star' },
    { id: 'wizard', label: 'ผมยาว', emoji: 'user', icon: 'user' },
  ],
  hairColor: ['#2b1a13', '#5a3620', '#c98b4b', '#e8d7c4', '#f2a81d', '#7c4dff'],
  top: [
    { id: 'jacket', label: 'แจ็คเก็ตสำรวจ', emoji: 'shirt', icon: 'shirt' },
    { id: 'hoodie', label: 'ฮู้ดดี้', emoji: 'shirt', icon: 'shirt' },
    { id: 'dress', label: 'ชุดเดรส', emoji: 'palette', icon: 'palette' },
    { id: 'armor', label: 'เกราะนักรบ', emoji: 'shield', icon: 'shield' },
  ],
  topColor: ['#2f6fed', '#1f7a5c', '#e8564a', '#f2a81d', '#7c4dff', '#14261f'],
  bottom: [
    { id: 'cargo', label: 'กางเกงคาร์โก้', emoji: 'pants', icon: 'pants' },
    { id: 'shorts', label: 'กางเกงขาสั้น', emoji: 'pants', icon: 'pants' },
    { id: 'skirt', label: 'กระโปรง', emoji: 'palette', icon: 'palette' },
    { id: 'robe', label: 'ชุดคลุม', emoji: 'shirt', icon: 'shirt' },
  ],
  bottomColor: ['#25324a', '#3a2a1a', '#14261f', '#6b7a99', '#e8d7c4', '#7c4dff'],
  shoes: [
    { id: 'boots', label: 'บูทผจญภัย', emoji: 'boot', icon: 'boot' },
    { id: 'sneaker', label: 'สนีกเกอร์', emoji: 'boot', icon: 'boot' },
    { id: 'sandal', label: 'รองเท้าแตะ', emoji: 'boot', icon: 'boot' },
  ],
  shoeColor: ['#4a2f1b', '#14261f', '#f2a81d', '#e8564a', '#e8d7c4'],
  hat: [
    { id: 'none', label: 'ไม่ใส่หมวก', emoji: 'close', icon: 'close' },
    { id: 'cap', label: 'หมวกแก๊ป', emoji: 'hat', icon: 'hat' },
    { id: 'beanie', label: 'หมวกไหมพรม', emoji: 'hat', icon: 'hat' },
    { id: 'wizard', label: 'หมวกพ่อมด', emoji: 'hat', icon: 'hat' },
    { id: 'crown', label: 'มงกุฎ', emoji: 'trophy', icon: 'trophy' },
  ],
  hatColor: ['#f2a81d', '#2f6fed', '#e8564a', '#7c4dff', '#14261f'],
  accessory: [
    { id: 'none', label: 'ไม่มี', emoji: 'close', icon: 'close' },
    { id: 'camera', label: 'กล้อง', emoji: 'camera', icon: 'camera' },
    { id: 'backpack', label: 'เป้', emoji: 'backpack', icon: 'backpack' },
    { id: 'map', label: 'แผนที่', emoji: 'map', icon: 'map' },
    { id: 'sword', label: 'ดาบไม้', emoji: 'flag', icon: 'flag' },
  ],
  skin: ['#f2c49b', '#e0a878', '#c98754', '#8d5a34', '#f7d9bd'],
};

export const PRESETS = {
  ray: { preset: 'ray', hair: 'spiky', hairColor: '#2b1a13', top: 'jacket', topColor: '#2f6fed', bottom: 'cargo', bottomColor: '#25324a', shoes: 'boots', shoeColor: '#4a2f1b', hat: 'cap', hatColor: '#2f6fed', accessory: 'camera', skin: '#f2c49b' },
  maya: { preset: 'maya', hair: 'ponytail', hairColor: '#5a3620', top: 'hoodie', topColor: '#38b26b', bottom: 'shorts', bottomColor: '#f2a81d', shoes: 'sneaker', shoeColor: '#f2a81d', hat: 'beanie', hatColor: '#38b26b', accessory: 'backpack', skin: '#e0a878' },
  zael: { preset: 'zael', hair: 'wizard', hairColor: '#e8d7c4', top: 'armor', topColor: '#7c4dff', bottom: 'robe', bottomColor: '#14261f', shoes: 'boots', shoeColor: '#14261f', hat: 'wizard', hatColor: '#7c4dff', accessory: 'sword', skin: '#c98754' },
  luna: { preset: 'luna', hair: 'bob', hairColor: '#e8d7c4', top: 'dress', topColor: '#e8564a', bottom: 'skirt', bottomColor: '#e8d7c4', shoes: 'sandal', shoeColor: '#e8d7c4', hat: 'crown', hatColor: '#f2a81d', accessory: 'map', skin: '#f7d9bd' },
};
