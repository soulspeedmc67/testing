export const ALL_PRODUCTS = [
  // Dairy
  {
    id: 1,
    name: "Amul Gold Full Cream Milk",
    unit: "500 ml",
    price: 36,
    originalPrice: 38,
    rating: "4.8",
    ratingCount: "16.7 lac",
    time: "8 mins",
    options: "2 sizes",
    badge: "Full Cream",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    cat: "Dairy",
    variants: [
      { id: "1-500ml", unit: "500 ml", price: 36, originalPrice: 38 },
      { id: "1-1l", unit: "1 L", price: 70, originalPrice: 74 }
    ]
  },
  {
    id: 3,
    name: "Mother Dairy Classic Curd",
    unit: "390 g",
    price: 35,
    originalPrice: 38,
    rating: "4.7",
    ratingCount: "2 lac",
    time: "8 mins",
    options: "2 sizes",
    badge: "Bestseller",
    img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80",
    cat: "Dairy",
    variants: [
      { id: "3-390g", unit: "390 g", price: 35, originalPrice: 38 },
      { id: "3-1kg", unit: "1 kg", price: 85, originalPrice: 95 }
    ]
  },
  { id: 11, name: "Amul Butter Salted", unit: "100 g", price: 58, originalPrice: 60, rating: "4.9", ratingCount: "8.2 lac", time: "8 mins", options: null, badge: "Bestseller", img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80", cat: "Dairy" },
  { id: 12, name: "Nestlé MUNCH Chocolate Bar", unit: "12 g", price: 10, originalPrice: 10, rating: "4.6", ratingCount: "5 lac", time: "8 mins", options: null, badge: "Chocolate", img: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&auto=format&fit=crop&q=80", cat: "Dairy" },

  // Snacks
  {
    id: 5,
    name: "Lay's Magic Masala Chips",
    unit: "50 g",
    price: 20,
    originalPrice: 20,
    rating: "4.5",
    ratingCount: "12 lac",
    time: "8 mins",
    options: "3 sizes",
    badge: "Snacks",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    cat: "Snacks",
    variants: [
      { id: "5-50g", unit: "50 g", price: 20, originalPrice: 20 },
      { id: "5-115g", unit: "115 g", price: 50, originalPrice: 55 },
      { id: "5-200g", unit: "200 g", price: 95, originalPrice: 110 }
    ]
  },
  { id: 6, name: "Cadbury Dairy Milk Silk", unit: "150 g", price: 175, originalPrice: 190, rating: "4.9", ratingCount: "5.4 lac", time: "8 mins", options: null, badge: "Treats", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 13, name: "Kurkure Masala Munch", unit: "90 g", price: 30, originalPrice: 30, rating: "4.4", ratingCount: "9 lac", time: "8 mins", options: null, badge: "Snacks", img: "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=400&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 14, name: "Good Day Cashew Cookies", unit: "120 g", price: 35, originalPrice: 40, rating: "4.6", ratingCount: "3 lac", time: "8 mins", options: null, badge: "Biscuits", img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80", cat: "Snacks" },

  // Grocery
  { id: 8, name: "Fortune Kachi Ghani Mustard Oil", unit: "1 L", price: 145, originalPrice: 165, rating: "4.8", ratingCount: "9.1 lac", time: "10 mins", options: null, badge: "Cooking Essential", img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80", cat: "Grocery" },
  { id: 15, name: "Tata Salt Iodized", unit: "1 kg", price: 22, originalPrice: 24, rating: "4.8", ratingCount: "20 lac", time: "8 mins", options: null, badge: "Essential", img: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&auto=format&fit=crop&q=80", cat: "Grocery" },
  {
    id: 16,
    name: "Patanjali Organic Atta",
    unit: "5 kg",
    price: 299,
    originalPrice: 320,
    rating: "4.5",
    ratingCount: "4 lac",
    time: "10 mins",
    options: "2 sizes",
    badge: "Organic",
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=80",
    cat: "Grocery",
    variants: [
      { id: "16-5kg", unit: "5 kg", price: 299, originalPrice: 320 },
      { id: "16-10kg", unit: "10 kg", price: 580, originalPrice: 630 }
    ]
  },
  {
    id: 17,
    name: "India Gate Basmati Rice",
    unit: "1 kg",
    price: 110,
    originalPrice: 125,
    rating: "4.8",
    ratingCount: "11 lac",
    time: "10 mins",
    options: "2 sizes",
    badge: "Premium",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e8ac?w=400&auto=format&fit=crop&q=80",
    cat: "Grocery",
    variants: [
      { id: "17-1kg", unit: "1 kg", price: 110, originalPrice: 125 },
      { id: "17-5kg", unit: "5 kg", price: 520, originalPrice: 580 }
    ]
  },

  // Bakery
  { id: 7, name: "Fresh Kashmiri Lavas Bread", unit: "4 pcs", price: 30, originalPrice: 40, rating: "4.8", ratingCount: "34k", time: "8 mins", options: null, badge: "Freshly Baked", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&auto=format&fit=crop&q=80", cat: "Bakery" },
  { id: 18, name: "Modern Sandwich White Bread", unit: "400 g", price: 40, originalPrice: 45, rating: "4.5", ratingCount: "7 lac", time: "8 mins", options: null, badge: "Fresh", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80", cat: "Bakery" },
  { id: 19, name: "Britannia Cake Delights", unit: "100 g", price: 35, originalPrice: 40, rating: "4.4", ratingCount: "2.8 lac", time: "8 mins", options: null, badge: "Treats", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80", cat: "Bakery" },

  // Drinks
  { id: 20, name: "Coca-Cola Classic Can", unit: "330 ml", price: 45, originalPrice: 50, rating: "4.7", ratingCount: "15 lac", time: "8 mins", options: null, badge: "Cold", img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&auto=format&fit=crop&q=80", cat: "Drinks" },
  {
    id: 21,
    name: "Tropicana Mixed Fruit Juice",
    unit: "200 ml",
    price: 25,
    originalPrice: 30,
    rating: "4.5",
    ratingCount: "6 lac",
    time: "8 mins",
    options: "2 sizes",
    badge: "Fresh Juice",
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&auto=format&fit=crop&q=80",
    cat: "Drinks",
    variants: [
      { id: "21-200ml", unit: "200 ml", price: 25, originalPrice: 30 },
      { id: "21-1l", unit: "1 L", price: 110, originalPrice: 130 }
    ]
  },
  { id: 22, name: "Red Bull Energy Drink", unit: "250 ml", price: 115, originalPrice: 125, rating: "4.6", ratingCount: "3 lac", time: "8 mins", options: null, badge: "Energy", img: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80", cat: "Drinks" },
  { id: 4, name: "Fresh Kashmiri Red Apples", unit: "1 kg", price: 140, originalPrice: 170, rating: "4.9", ratingCount: "85k", time: "10 mins", options: null, badge: "Orchard Fresh", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80", cat: "Grocery" },
  { id: 2, name: "Fresh Tender Green Coconut", unit: "1 pc", price: 90, originalPrice: 108, rating: "4.6", ratingCount: "4.2 lac", time: "8 mins", options: null, badge: "Fresh Produce", img: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80", cat: "Grocery" },
];
