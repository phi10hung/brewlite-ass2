// Dữ liệu mẫu của BrewLite: menu, nguyên liệu, công thức, mã giảm giá, tài khoản (ADR 003).
// Menu và mã giảm giá chỉ được tạo bằng seed, không có màn hình quản lý (FR-25, FR-26 là Won't).
import { DiscountType, Role } from '../generated/prisma/enums.js';

// Lượng trong công thức tính theo đơn vị của nguyên liệu (g, ml, quả).
type RecipeLine = { ingredient: string; amount: number };

type SeedProduct = {
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  recipe: RecipeLine[];
};

type SeedTopping = { name: string; price: number; recipe: RecipeLine[] };

export const INGREDIENTS = [
  { name: 'Cà phê xay', unit: 'g', stock: 3000 },
  { name: 'Sữa đặc', unit: 'ml', stock: 3000 },
  { name: 'Sữa tươi', unit: 'ml', stock: 8000 },
  { name: 'Kem sữa', unit: 'ml', stock: 2000 },
  { name: 'Đường nước', unit: 'ml', stock: 3000 },
  { name: 'Trà đen', unit: 'g', stock: 1000 },
  { name: 'Trà xanh', unit: 'g', stock: 1000 },
  { name: 'Bột matcha', unit: 'g', stock: 500 },
  { name: 'Bột cacao', unit: 'g', stock: 500 },
  { name: 'Đào ngâm', unit: 'g', stock: 2000 },
  { name: 'Vải ngâm', unit: 'g', stock: 2000 },
  { name: 'Sả', unit: 'g', stock: 500 },
  { name: 'Cam tươi', unit: 'quả', stock: 60 },
  { name: 'Chanh tươi', unit: 'quả', stock: 50 },
  // Cố ý để ít để menu có món "Hết món" (FR-02).
  { name: 'Bơ sáp', unit: 'g', stock: 100 },
  { name: 'Bánh cookie', unit: 'g', stock: 1000 },
  { name: 'Trân châu đen', unit: 'g', stock: 2000 },
  { name: 'Trân châu trắng', unit: 'g', stock: 1500 },
  { name: 'Thạch cà phê', unit: 'g', stock: 1500 },
  { name: 'Thạch dừa', unit: 'g', stock: 1500 },
  { name: 'Pudding trứng', unit: 'g', stock: 1000 },
  { name: 'Kem cheese', unit: 'ml', stock: 1000 },
];

// Công thức món tính cho size M; size S × 0,8, size L × 1,3, làm tròn lên (BR-03).
export const PRODUCTS: SeedProduct[] = [
  {
    name: 'Cà phê đen đá',
    description: 'Cà phê phin đậm vị, thêm chút đường, uống cùng đá.',
    category: 'Cà phê',
    price: 25000,
    imageUrl: '/images/products/ca-phe-den-da.jpg',
    recipe: [
      { ingredient: 'Cà phê xay', amount: 20 },
      { ingredient: 'Đường nước', amount: 15 },
    ],
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin pha cùng sữa đặc, vị ngọt béo quen thuộc.',
    category: 'Cà phê',
    price: 29000,
    imageUrl: '/images/products/ca-phe-sua-da.jpg',
    recipe: [
      { ingredient: 'Cà phê xay', amount: 20 },
      { ingredient: 'Sữa đặc', amount: 30 },
    ],
  },
  {
    name: 'Bạc xỉu',
    description: 'Nhiều sữa, ít cà phê, vị nhẹ dễ uống.',
    category: 'Cà phê',
    price: 32000,
    imageUrl: '/images/products/bac-xiu.jpg',
    recipe: [
      { ingredient: 'Cà phê xay', amount: 10 },
      { ingredient: 'Sữa đặc', amount: 20 },
      { ingredient: 'Sữa tươi', amount: 80 },
    ],
  },
  {
    name: 'Cappuccino',
    description: 'Espresso với sữa tươi đánh bọt, rắc bột cacao.',
    category: 'Cà phê',
    price: 45000,
    imageUrl: '/images/products/cappuccino.jpg',
    recipe: [
      { ingredient: 'Cà phê xay', amount: 18 },
      { ingredient: 'Sữa tươi', amount: 150 },
      { ingredient: 'Bột cacao', amount: 2 },
    ],
  },
  {
    name: 'Latte',
    description: 'Espresso hòa cùng nhiều sữa tươi, vị béo nhẹ.',
    category: 'Cà phê',
    price: 45000,
    imageUrl: '/images/products/latte.jpg',
    recipe: [
      { ingredient: 'Cà phê xay', amount: 18 },
      { ingredient: 'Sữa tươi', amount: 200 },
    ],
  },
  {
    name: 'Trà đào cam sả',
    description: 'Trà đen thơm mùi sả, thêm đào ngâm và cam tươi.',
    category: 'Trà',
    price: 45000,
    imageUrl: '/images/products/tra-dao-cam-sa.jpg',
    recipe: [
      { ingredient: 'Trà đen', amount: 5 },
      { ingredient: 'Đào ngâm', amount: 60 },
      { ingredient: 'Cam tươi', amount: 1 },
      { ingredient: 'Sả', amount: 5 },
      { ingredient: 'Đường nước', amount: 20 },
    ],
  },
  {
    name: 'Trà vải',
    description: 'Trà đen thanh mát cùng vải ngâm.',
    category: 'Trà',
    price: 42000,
    imageUrl: '/images/products/tra-vai.jpg',
    recipe: [
      { ingredient: 'Trà đen', amount: 5 },
      { ingredient: 'Vải ngâm', amount: 60 },
      { ingredient: 'Đường nước', amount: 20 },
    ],
  },
  {
    name: 'Trà sữa',
    description: 'Trà đen pha sữa tươi, hợp với các loại trân châu.',
    category: 'Trà',
    price: 35000,
    imageUrl: '/images/products/tra-sua.jpg',
    recipe: [
      { ingredient: 'Trà đen', amount: 6 },
      { ingredient: 'Sữa tươi', amount: 100 },
      { ingredient: 'Đường nước', amount: 15 },
    ],
  },
  {
    name: 'Trà chanh',
    description: 'Trà xanh với chanh tươi, chua ngọt giải khát.',
    category: 'Trà',
    price: 25000,
    imageUrl: '/images/products/tra-chanh.jpg',
    recipe: [
      { ingredient: 'Trà xanh', amount: 5 },
      { ingredient: 'Chanh tươi', amount: 1 },
      { ingredient: 'Đường nước', amount: 25 },
    ],
  },
  {
    name: 'Matcha latte',
    description: 'Bột matcha Nhật pha cùng sữa tươi.',
    category: 'Trà',
    price: 45000,
    imageUrl: '/images/products/matcha-latte.jpg',
    recipe: [
      { ingredient: 'Bột matcha', amount: 5 },
      { ingredient: 'Sữa tươi', amount: 180 },
      { ingredient: 'Đường nước', amount: 15 },
    ],
  },
  {
    name: 'Cookie đá xay',
    description: 'Bánh cookie xay cùng sữa và đá, phủ kem sữa.',
    category: 'Đá xay',
    price: 55000,
    imageUrl: '/images/products/cookie-da-xay.jpg',
    recipe: [
      { ingredient: 'Bánh cookie', amount: 40 },
      { ingredient: 'Sữa tươi', amount: 120 },
      { ingredient: 'Kem sữa', amount: 30 },
    ],
  },
  {
    name: 'Matcha đá xay',
    description: 'Matcha xay cùng sữa và đá, phủ kem sữa.',
    category: 'Đá xay',
    price: 55000,
    imageUrl: '/images/products/matcha-da-xay.jpg',
    recipe: [
      { ingredient: 'Bột matcha', amount: 8 },
      { ingredient: 'Sữa tươi', amount: 120 },
      { ingredient: 'Kem sữa', amount: 30 },
    ],
  },
  {
    name: 'Nước ép cam',
    description: 'Cam tươi vắt nguyên chất.',
    category: 'Nước ép, sinh tố',
    price: 40000,
    imageUrl: '/images/products/nuoc-ep-cam.jpg',
    recipe: [{ ingredient: 'Cam tươi', amount: 3 }],
  },
  {
    name: 'Sinh tố bơ',
    description: 'Bơ sáp xay cùng sữa đặc và sữa tươi.',
    category: 'Nước ép, sinh tố',
    price: 45000,
    imageUrl: '/images/products/sinh-to-bo.jpg',
    recipe: [
      { ingredient: 'Bơ sáp', amount: 150 },
      { ingredient: 'Sữa đặc', amount: 30 },
      { ingredient: 'Sữa tươi', amount: 50 },
    ],
  },
];

// Topping: lượng nguyên liệu không đổi theo size (BR-03).
export const TOPPINGS: SeedTopping[] = [
  {
    name: 'Trân châu đen',
    price: 8000,
    recipe: [{ ingredient: 'Trân châu đen', amount: 50 }],
  },
  {
    name: 'Trân châu trắng',
    price: 10000,
    recipe: [{ ingredient: 'Trân châu trắng', amount: 50 }],
  },
  {
    name: 'Thạch cà phê',
    price: 8000,
    recipe: [{ ingredient: 'Thạch cà phê', amount: 50 }],
  },
  {
    name: 'Thạch dừa',
    price: 8000,
    recipe: [{ ingredient: 'Thạch dừa', amount: 50 }],
  },
  {
    name: 'Pudding trứng',
    price: 10000,
    recipe: [{ ingredient: 'Pudding trứng', amount: 60 }],
  },
  {
    name: 'Kem cheese',
    price: 12000,
    recipe: [{ ingredient: 'Kem cheese', amount: 40 }],
  },
  {
    name: 'Đào miếng',
    price: 10000,
    recipe: [{ ingredient: 'Đào ngâm', amount: 40 }],
  },
  {
    name: 'Vải miếng',
    price: 10000,
    recipe: [{ ingredient: 'Vải ngâm', amount: 40 }],
  },
  {
    name: 'Shot espresso',
    price: 12000,
    recipe: [{ ingredient: 'Cà phê xay', amount: 10 }],
  },
];

// Hai mã dùng được và hai mã để thử trường hợp lỗi hết hạn, ngừng hoạt động.
export const PROMOTIONS = [
  {
    code: 'GIAM10',
    type: DiscountType.PERCENT,
    value: 10,
    minOrder: 50000,
    active: true,
    expiresAt: new Date('2027-12-31T23:59:59+07:00'),
  },
  {
    code: 'GIAM20K',
    type: DiscountType.FIXED,
    value: 20000,
    minOrder: 100000,
    active: true,
    expiresAt: new Date('2027-12-31T23:59:59+07:00'),
  },
  {
    code: 'HETHAN',
    type: DiscountType.PERCENT,
    value: 15,
    minOrder: 0,
    active: true,
    expiresAt: new Date('2026-01-01T00:00:00+07:00'),
  },
  {
    code: 'NGUNG',
    type: DiscountType.FIXED,
    value: 10000,
    minOrder: 0,
    active: false,
    expiresAt: new Date('2027-12-31T23:59:59+07:00'),
  },
];

export const SAMPLE_PASSWORD = '123456';

export const SAMPLE_USERS = [
  { email: 'khach@brewlite.vn', name: 'Khách hàng mẫu', role: Role.CUSTOMER },
  { email: 'staff@brewlite.vn', name: 'Nhân viên quầy', role: Role.STAFF },
];
