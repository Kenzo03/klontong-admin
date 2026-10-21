import { config } from 'dotenv';
import { copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Uom } from '../src/generated/prisma/client';
import { hashPassword } from '../src/auth/password';

config({ path: '../../.env', quiet: true });
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed test data in production');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');

type Item = [name: string, price: number, weightG: number, uom: Uom];
type Cat = { name: string; prefix: string; dims: [w: number, l: number, h: number]; items: Item[] };

const CATALOG: Cat[] = [
  { name: 'Makanan Ringan', prefix: 'SNK', dims: [14.5, 5, 22], items: [
    ['Chitato Sapi Panggang 68g', 11500, 68, 'PCS'], ['Qtela Singkong Balado 60g', 9000, 60, 'PCS'],
    ['Taro Net Seaweed 65g', 8500, 65, 'PCS'], ['Lays Rumput Laut 68g', 11000, 68, 'PCS'],
    ['Tango Wafer Coklat 130g', 8500, 130, 'PCS'], ['Oreo Original 133g', 9500, 133, 'PCS'],
    ['Beng-Beng 20g', 2500, 20, 'PCS'], ['SilverQueen Chunky Bar 58g', 16500, 58, 'PCS'],
    ['Kacang Garuda Kulit 200g', 18000, 200, 'PCS'], ['Good Time Chocochips 72g', 9000, 72, 'PCS'] ] },
  { name: 'Mi Instan', prefix: 'NDL', dims: [12, 3.5, 15.5], items: [
    ['Indomie Goreng 85g (dus isi 40)', 115000, 3400, 'BOX'], ['Indomie Goreng 85g', 3500, 85, 'PCS'],
    ['Indomie Soto Mie 75g', 3300, 75, 'PCS'], ['Mie Sedaap Goreng 90g', 3400, 90, 'PCS'],
    ['Mie Sedaap Kari Spesial 87g', 3400, 87, 'PCS'], ['Sarimi Isi 2 Ayam Bawang 126g', 4500, 126, 'PCS'],
    ['Pop Mie Ayam Bawang 75g', 6000, 75, 'PCS'], ['Supermi Ayam Bawang 75g', 3200, 75, 'PCS'],
    ['Indomie Goreng Rendang 91g', 3800, 91, 'PCS'], ['Mie Gelas Ayam Bawang 28g', 1500, 28, 'PCS'] ] },
  { name: 'Minuman', prefix: 'BEV', dims: [6.5, 6.5, 20.5], items: [
    ['Aqua Air Mineral 600ml', 4000, 600, 'BOTTLE'], ['Teh Botol Sosro 450ml', 5500, 450, 'BOTTLE'],
    ['Teh Kotak Jasmine 300ml', 5000, 300, 'PCS'], ['Coca-Cola 390ml', 6500, 390, 'BOTTLE'],
    ['Pocari Sweat 500ml', 8000, 500, 'BOTTLE'], ['Ultra Milk Coklat 250ml', 6500, 250, 'PCS'],
    ['Good Day Cappuccino 250ml', 7500, 250, 'BOTTLE'], ['Kopi Kapal Api Special Mix 25g (renceng isi 10)', 15000, 250, 'STRIP'],
    ['Fanta Stroberi 390ml', 6500, 390, 'BOTTLE'], ['Le Minerale 1,5L', 7000, 1500, 'BOTTLE'] ] },
  { name: 'Beras dan Tepung', prefix: 'RCE', dims: [30, 10, 45], items: [
    ['Beras Setra Ramos 5kg', 75000, 5000, 'SACK'], ['Beras Pandan Wangi 5kg', 78000, 5000, 'SACK'],
    ['Beras Rojolele 5kg', 80000, 5000, 'SACK'], ['Tepung Terigu Segitiga Biru 1kg', 14000, 1000, 'PCS'],
    ['Tepung Terigu Cakra Kembar 1kg', 15000, 1000, 'PCS'], ['Tepung Beras Rose Brand 500g', 8000, 500, 'PCS'],
    ['Tepung Tapioka Rose Brand 500g', 7500, 500, 'PCS'], ['Tepung Maizena Maizenaku 100g', 5000, 100, 'PCS'],
    ['Tepung Bumbu Sajiku 80g', 4500, 80, 'PCS'], ['Beras Merah Organik 1kg', 25000, 1000, 'PCS'] ] },
  { name: 'Minyak Goreng', prefix: 'OIL', dims: [9.5, 9.5, 28], items: [
    ['Minyak Goreng Bimoli 2L', 38500, 1900, 'BOTTLE'], ['Minyak Goreng Filma 2L', 37000, 1900, 'BOTTLE'],
    ['Minyak Goreng Sania 2L', 36000, 1900, 'BOTTLE'], ['Minyak Goreng Tropical 1L', 19500, 950, 'BOTTLE'],
    ['Minyak Goreng Sunco 2L (pouch)', 36500, 1900, 'PACK'], ['Minyak Goreng Fortune 1L (pouch)', 17500, 950, 'PACK'],
    ['Minyak Goreng Bimoli 1L', 20000, 950, 'BOTTLE'], ['Minyak Kelapa Barco 1L', 25000, 950, 'BOTTLE'],
    ['Margarin Blue Band 200g', 9500, 200, 'PCS'], ['Mentega Palmia 200g', 8500, 200, 'PCS'] ] },
  { name: 'Bumbu Dapur', prefix: 'SPC', dims: [10, 3, 14], items: [
    ['Masako Kaldu Ayam 250g', 12000, 250, 'PCS'], ['Kecap Manis Bango 520ml', 24000, 600, 'BOTTLE'],
    ['Saus Sambal ABC 335ml', 12000, 400, 'BOTTLE'], ['Garam Dapur Refina 250g', 4000, 250, 'PCS'],
    ['Merica Bubuk Ladaku 4g (renceng isi 12)', 7000, 48, 'STRIP'], ['Royco Kaldu Ayam 8g (renceng isi 12)', 6000, 96, 'STRIP'],
    ['Saori Saus Tiram 133ml', 9000, 160, 'BOTTLE'], ['Bumbu Racik Indofood Nasi Goreng 20g', 2500, 20, 'SACHET'],
    ['Kecap Asin ABC 133ml', 7000, 160, 'BOTTLE'], ['Terasi Udang ABC 4g (renceng isi 10)', 5000, 40, 'STRIP'] ] },
  { name: 'Susu dan Olahan', prefix: 'DRY', dims: [8, 8, 12], items: [
    ['Dancow Fortigro 400g', 48000, 400, 'PCS'], ['Indomilk Kental Manis 37g (renceng isi 6)', 9000, 222, 'STRIP'],
    ['Ultra Milk Full Cream 1L', 19500, 1000, 'PCS'], ['Susu Kental Manis Frisian Flag 370g', 13900, 370, 'CAN'],
    ['Keju Kraft Cheddar 165g', 22000, 165, 'PCS'], ['Yakult (pak isi 5)', 11500, 325, 'PACK'],
    ['Bear Brand 189ml', 10500, 189, 'CAN'], ['Milo 3in1 (renceng isi 10)', 22000, 350, 'STRIP'],
    ['Cimory Yogurt Drink 250ml', 9500, 250, 'BOTTLE'], ['Dancow Instan 27g (renceng isi 10)', 21000, 270, 'STRIP'] ] },
  { name: 'Perawatan Diri', prefix: 'TLT', dims: [6, 3, 10], items: [
    ['Pepsodent 190g', 13000, 190, 'PCS'], ['Shampo Sunsilk 170ml', 22000, 170, 'BOTTLE'],
    ['Shampo Clear 10ml (renceng isi 12)', 6000, 120, 'STRIP'], ['Sabun Lux Botanicals 85g', 4500, 85, 'PCS'],
    ['Sabun Nuvo Family 72g', 4000, 72, 'PCS'], ['Rexona Roll On 45ml', 18500, 45, 'BOTTLE'],
    ['Lifebuoy Sabun Batang 75g', 4200, 75, 'PCS'], ['Sikat Gigi Formula', 6500, 25, 'PCS'],
    ['Pembalut Charm isi 8', 9000, 100, 'PACK'], ['Minyak Telon Cap Lang 60ml', 21000, 60, 'BOTTLE'] ] },
  { name: 'Kebersihan Rumah', prefix: 'HSE', dims: [8, 6, 22], items: [
    ['Rinso Anti Noda 770g', 23500, 770, 'PACK'], ['So Klin Lantai 780ml', 13000, 780, 'PACK'],
    ['Sunlight Jeruk Nipis 755ml', 17500, 755, 'PCS'], ['Molto Pewangi 800ml', 15500, 800, 'PACK'],
    ['Baygon Aerosol 600ml', 42000, 600, 'CAN'], ['Wipol Karbol 780ml', 16000, 780, 'PACK'],
    ['Stella Pengharum Ruangan 70g', 11000, 70, 'PCS'], ['Daia Deterjen 850g', 18500, 850, 'PACK'],
    ['Tissue Paseo 250 lembar', 14000, 300, 'PACK'], ['Spons Cuci Piring Scotch-Brite', 6000, 20, 'PCS'] ] },
  { name: 'Makanan Beku', prefix: 'FRZ', dims: [20, 4, 25], items: [
    ['Fiesta Chicken Nugget 500g', 52000, 500, 'PACK'], ['Sosis So Nice 20g (pak isi 10)', 22000, 200, 'PACK'],
    ['Kanzler Bratwurst 360g', 48000, 360, 'PACK'], ['Champ Nugget Ayam 250g', 22000, 250, 'PACK'],
    ['Bakso Sapi Bernardi 500g', 45000, 500, 'PACK'], ['Sosis Bernardi Ayam 500g', 38000, 500, 'PACK'],
    ['Fiesta Spicy Wing 500g', 58000, 500, 'PACK'], ["Wall's Paddle Pop", 6000, 60, 'PCS'],
    ['Campina Hula Hula', 3000, 50, 'PCS'], ['Kentang Goreng Golden Farm 1kg', 38000, 1000, 'PACK'] ] },
];

const USERS = [
  { email: 'admin@klontong.test', name: 'Admin Toko', role: 'ADMIN', status: 'ACTIVE' },
  { email: 'staff@klontong.test', name: 'Sari Wulandari', role: 'STAFF', status: 'ACTIVE' },
  { email: 'pending@klontong.test', name: 'Budi Santoso', role: 'STAFF', status: 'PENDING' },
] as const;

async function seedImage(prefix: string, idx: number): Promise<string | null> {
  const src = path.join(__dirname, 'seed-images', `${prefix.toLowerCase()}.jpg`);
  try { await access(src); } catch { console.warn(`No seed image ${src}; ${prefix} products get no image`); return null; }
  const name = `00000000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}.jpg`;
  await mkdir(path.join(UPLOAD_DIR, 'products'), { recursive: true });
  await copyFile(src, path.join(UPLOAD_DIR, 'products', name));
  return `/uploads/products/${name}`;
}

async function main() {
  const passwordHash = await hashPassword(process.env.SEED_USER_PASSWORD ?? 'Password123!');
  const userIds: Record<string, number> = {};
  for (const u of USERS) {
    const { id } = await prisma.user.upsert({ where: { email: u.email }, update: { password: passwordHash }, create: { ...u, password: passwordHash } });
    userIds[u.email] = id;
  }
  const adminId = userIds['admin@klontong.test']; // seeded products are created by the admin

  const products = [];
  let i = 0;
  for (const [c, cat] of CATALOG.entries()) {
    const { id: categoryId } = await prisma.category.upsert({ where: { name: cat.name }, update: {}, create: { name: cat.name } });
    const image = await seedImage(cat.prefix, c);
    for (const [n, [name, price, weight, uom]] of cat.items.entries()) {
      const archived = i % 25 === 24; // 4 archived
      products.push({
        sku: `${cat.prefix}-${String(n + 1).padStart(4, '0')}`,
        name, price, uom, categoryId,
        weight: weight / 1000, // the catalog lists grams; the column stores kg
        createdById: adminId, updatedById: adminId,
        width: cat.dims[0], length: cat.dims[1], height: cat.dims[2],
        description: i % 3 === 0 ? null : `${name}. Kategori ${cat.name}.`,
        stock: (i * 37) % 150,                       // includes 0, for the out-of-stock state
        isActive: !archived && i % 10 !== 9,         // ~10 inactive; archived are always inactive
        archivedAt: archived ? new Date() : null,
        image: i % 10 === 3 ? null : image,          // 10 without image, for the fallback state
      });
      i++;
    }
  }
  const { count } = await prisma.product.createMany({ data: products, skipDuplicates: true });
  console.log(`Seeded ${USERS.length} users, ${CATALOG.length} categories, ${count} new products (${products.length} defined).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());