export const ALL_PRODUCTS = [
  // Dairy
  {
    id: 1,
    name: "Amul Gold Full Cream Milk",
    unit: "500 ml",
    price: 36,
    originalPrice: 38,
    rating: "4.8",
    ratingCount: "189",
    time: "8 mins",
    options: "2 sizes",
    badge: "Full Cream",
    img: "",
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
    ratingCount: "101",
    time: "8 mins",
    options: "2 sizes",
    badge: "Bestseller",
    img: "",
    cat: "Dairy",
    variants: [
      { id: "3-390g", unit: "390 g", price: 35, originalPrice: 38 },
      { id: "3-1kg", unit: "1 kg", price: 85, originalPrice: 95 }
    ]
  },
  { id: 11, name: "Amul Butter Salted", unit: "100 g", price: 58, originalPrice: 60, rating: "4.9", ratingCount: "226", time: "8 mins", options: null, badge: "Bestseller", img: "", cat: "Dairy" },
  { id: 12, name: "Nestlé MUNCH Chocolate Bar", unit: "12 g", price: 10, originalPrice: 10, rating: "4.6", ratingCount: "357", time: "8 mins", options: null, badge: "Chocolate", img: "", cat: "Snacks" },

  // Snacks
  {
    id: 5,
    name: "Lay's Magic Masala Chips",
    unit: "50 g",
    price: 20,
    originalPrice: 20,
    rating: "4.5",
    ratingCount: "48",
    time: "8 mins",
    options: "3 sizes",
    badge: "Snacks",
    img: "",
    cat: "Snacks",
    variants: [
      { id: "5-50g", unit: "50 g", price: 20, originalPrice: 20 },
      { id: "5-115g", unit: "115 g", price: 50, originalPrice: 55 },
      { id: "5-200g", unit: "200 g", price: 95, originalPrice: 110 }
    ]
  },
  { id: 6, name: "Cadbury Dairy Milk Silk", unit: "150 g", price: 175, originalPrice: 190, rating: "4.9", ratingCount: "61", time: "8 mins", options: null, badge: "Treats", img: "", cat: "Snacks" },
  { id: 13, name: "Kurkure Masala Munch", unit: "90 g", price: 30, originalPrice: 30, rating: "4.4", ratingCount: "444", time: "8 mins", options: null, badge: "Snacks", img: "", cat: "Snacks" },
  { id: 14, name: "Good Day Cashew Cookies", unit: "120 g", price: 35, originalPrice: 40, rating: "4.6", ratingCount: "298", time: "8 mins", options: null, badge: "Biscuits", img: "", cat: "Snacks" },

  // Grocery
  { id: 8, name: "Fortune Kachi Ghani Mustard Oil", unit: "1 L", price: 145, originalPrice: 165, rating: "4.8", ratingCount: "72", time: "8 mins", options: null, badge: "Cooking Essential", img: "", cat: "Grocery" },
  { id: 15, name: "Tata Salt Iodized", unit: "1 kg", price: 22, originalPrice: 24, rating: "4.8", ratingCount: "211", time: "8 mins", options: null, badge: "Essential", img: "", cat: "Grocery" },
  {
    id: 16,
    name: "Patanjali Organic Atta",
    unit: "5 kg",
    price: 299,
    originalPrice: 320,
    rating: "4.5",
    ratingCount: "322",
    time: "8 mins",
    options: "2 sizes",
    badge: "Organic",
    img: "",
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
    ratingCount: "53",
    time: "8 mins",
    options: "2 sizes",
    badge: "Premium",
    img: "",
    cat: "Grocery",
    variants: [
      { id: "17-1kg", unit: "1 kg", price: 110, originalPrice: 125 },
      { id: "17-5kg", unit: "5 kg", price: 520, originalPrice: 580 }
    ]
  },

  // Bakery
  { id: 7, name: "Fresh Kashmiri Lavas Bread", unit: "4 pcs", price: 30, originalPrice: 40, rating: "4.8", ratingCount: "112", time: "8 mins", options: null, badge: "Freshly Baked", img: "", cat: "Bakery" },
  { id: 18, name: "Modern Sandwich White Bread", unit: "400 g", price: 40, originalPrice: 45, rating: "4.5", ratingCount: "283", time: "8 mins", options: null, badge: "Fresh", img: "", cat: "Bakery" },
  { id: 19, name: "Britannia Cake Delights", unit: "100 g", price: 35, originalPrice: 40, rating: "4.4", ratingCount: "133", time: "8 mins", options: null, badge: "Treats", img: "", cat: "Bakery" },

  // Drinks
  { id: 20, name: "Coca-Cola Classic Can", unit: "330 ml", price: 45, originalPrice: 50, rating: "4.7", ratingCount: "43", time: "8 mins", options: null, badge: "Cold", img: "", cat: "Drinks" },
  {
    id: 21,
    name: "Tropicana Mixed Fruit Juice",
    unit: "200 ml",
    price: 25,
    originalPrice: 30,
    rating: "4.5",
    ratingCount: "68",
    time: "8 mins",
    options: "2 sizes",
    badge: "Fresh Juice",
    img: "",
    cat: "Drinks",
    variants: [
      { id: "21-200ml", unit: "200 ml", price: 25, originalPrice: 30 },
      { id: "21-1l", unit: "1 L", price: 110, originalPrice: 130 }
    ]
  },
  { id: 22, name: "Red Bull Energy Drink", unit: "250 ml", price: 115, originalPrice: 125, rating: "4.6", ratingCount: "298", time: "8 mins", options: null, badge: "Energy", img: "", cat: "Drinks" },
  { id: 4, name: "Fresh Kashmiri Red Apples", unit: "1 kg", price: 140, originalPrice: 170, rating: "4.9", ratingCount: "167", time: "8 mins", options: null, badge: "Orchard Fresh", img: "", cat: "Fresh Fruits" },
  { id: 2, name: "Fresh Tender Green Coconut", unit: "1 pc", price: 90, originalPrice: 108, rating: "4.6", ratingCount: "246", time: "8 mins", options: null, badge: "Fresh Produce", img: "", cat: "Fresh Fruits" },
  // Home Care
  { id: 30, name: "Surf Excel Easy Wash Detergent", unit: "1 kg", price: 165, originalPrice: 185, rating: "4.7", ratingCount: "412", time: "8 mins", options: null, badge: "Laundry", img: "", cat: "Home Care" },
  { id: 31, name: "Lizol Disinfectant Floor Cleaner", unit: "975 ml", price: 199, originalPrice: 225, rating: "4.8", ratingCount: "276", time: "8 mins", options: null, badge: "Disinfectant", img: "", cat: "Home Care" },
  { id: 32, name: "Harpic Power Toilet Cleaner", unit: "500 ml", price: 98, originalPrice: 110, rating: "4.6", ratingCount: "188", time: "8 mins", options: null, badge: "Bathroom", img: "", cat: "Home Care" },
  { id: 33, name: "Good Knight Gold Flash Refill", unit: "45 ml", price: 85, originalPrice: 95, rating: "4.5", ratingCount: "154", time: "8 mins", options: null, badge: "Mosquito Free", img: "", cat: "Home Care" },
  { id: 34, name: "Odonil Room Air Freshener", unit: "48 g", price: 75, originalPrice: 85, rating: "4.4", ratingCount: "97", time: "8 mins", options: null, badge: "Fresh Home", img: "", cat: "Home Care" },

  // Kitchen Care
  { id: 35, name: "Vim Dishwash Gel Lemon", unit: "500 ml", price: 115, originalPrice: 130, rating: "4.8", ratingCount: "364", time: "8 mins", options: null, badge: "Bestseller", img: "", cat: "Kitchen Care" },
  { id: 36, name: "Scotch-Brite Scrub Pad", unit: "3 pcs", price: 45, originalPrice: 55, rating: "4.7", ratingCount: "231", time: "8 mins", options: null, badge: "Essential", img: "", cat: "Kitchen Care" },
  { id: 37, name: "Home Foil Aluminium Wrap", unit: "9 m", price: 99, originalPrice: 115, rating: "4.5", ratingCount: "118", time: "8 mins", options: null, badge: "Kitchen", img: "", cat: "Kitchen Care" },
  { id: 38, name: "Origami Kitchen Tissue Roll", unit: "2 rolls", price: 80, originalPrice: 95, rating: "4.6", ratingCount: "142", time: "8 mins", options: null, badge: "Handy", img: "", cat: "Kitchen Care" },
  { id: 39, name: "Garbage Bags Medium", unit: "30 pcs", price: 99, originalPrice: 120, rating: "4.5", ratingCount: "203", time: "8 mins", options: null, badge: "Value Pack", img: "", cat: "Kitchen Care" },

  // Vegetables
  { id: 40, name: "Fresh Onion", unit: "1 kg", price: 35, originalPrice: 45, rating: "4.6", ratingCount: "521", time: "8 mins", options: null, badge: "Daily Staple", img: "", cat: "Vegetables" },
  { id: 41, name: "Fresh Potato", unit: "1 kg", price: 32, originalPrice: 40, rating: "4.7", ratingCount: "487", time: "8 mins", options: null, badge: "Daily Staple", img: "", cat: "Vegetables" },
  { id: 42, name: "Fresh Tomato", unit: "500 g", price: 25, originalPrice: 32, rating: "4.5", ratingCount: "398", time: "8 mins", options: null, badge: "Farm Fresh", img: "", cat: "Vegetables" },
  { id: 43, name: "Kashmiri Haakh Greens", unit: "250 g", price: 30, originalPrice: 35, rating: "4.9", ratingCount: "176", time: "8 mins", options: null, badge: "Local Favourite", img: "", cat: "Vegetables" },
  { id: 44, name: "Green Capsicum", unit: "250 g", price: 28, originalPrice: 35, rating: "4.4", ratingCount: "132", time: "8 mins", options: null, badge: "Farm Fresh", img: "", cat: "Vegetables" },
  { id: 45, name: "Coriander & Green Chilli Combo", unit: "1 pack", price: 20, originalPrice: 25, rating: "4.6", ratingCount: "214", time: "8 mins", options: null, badge: "Tadka Pack", img: "", cat: "Vegetables" },

  // Fresh Fruits
  { id: 46, name: "Fresh Bananas", unit: "6 pcs", price: 45, originalPrice: 55, rating: "4.6", ratingCount: "289", time: "8 mins", options: null, badge: "Everyday", img: "", cat: "Fresh Fruits" },
  { id: 47, name: "Nagpur Sweet Oranges", unit: "1 kg", price: 90, originalPrice: 110, rating: "4.7", ratingCount: "163", time: "8 mins", options: null, badge: "Juicy", img: "", cat: "Fresh Fruits" },
  { id: 48, name: "Kashmiri Cherries", unit: "250 g", price: 150, originalPrice: 180, rating: "4.9", ratingCount: "88", time: "8 mins", options: null, badge: "Seasonal", img: "", cat: "Fresh Fruits" },
  { id: 49, name: "Seedless Green Grapes", unit: "500 g", price: 75, originalPrice: 90, rating: "4.5", ratingCount: "127", time: "8 mins", options: null, badge: "Sweet", img: "", cat: "Fresh Fruits" },

  // Chicken
  { id: 50, name: "Fresh Chicken Curry Cut", unit: "500 g", price: 160, originalPrice: 190, rating: "4.7", ratingCount: "342", time: "8 mins", options: "2 sizes", badge: "Bestseller", img: "", cat: "Chicken", variants: [
      { id: "50-500g", unit: "500 g", price: 160, originalPrice: 190 },
      { id: "50-1kg", unit: "1 kg", price: 310, originalPrice: 360 }
    ] },
  { id: 51, name: "Boneless Chicken Breast", unit: "450 g", price: 220, originalPrice: 260, rating: "4.8", ratingCount: "196", time: "8 mins", options: null, badge: "High Protein", img: "", cat: "Chicken" },
  { id: 52, name: "Chicken Seekh Kebab", unit: "250 g", price: 185, originalPrice: 210, rating: "4.6", ratingCount: "134", time: "8 mins", options: null, badge: "Ready to Cook", img: "", cat: "Chicken" },
  { id: 53, name: "Whole Chicken Skinless", unit: "1 kg", price: 230, originalPrice: 270, rating: "4.7", ratingCount: "151", time: "8 mins", options: null, badge: "Farm Fresh", img: "", cat: "Chicken" },

  // Dairy additions
  { id: 54, name: "Farm Fresh Eggs", unit: "6 pcs", price: 48, originalPrice: 55, rating: "4.8", ratingCount: "409", time: "8 mins", options: "2 sizes", badge: "Daily Staple", img: "", cat: "Dairy", variants: [
      { id: "54-6pcs", unit: "6 pcs", price: 48, originalPrice: 55 },
      { id: "54-12pcs", unit: "12 pcs", price: 92, originalPrice: 105 }
    ] },
  { id: 55, name: "Amul Fresh Paneer", unit: "200 g", price: 95, originalPrice: 105, rating: "4.7", ratingCount: "178", time: "8 mins", options: null, badge: "Fresh", img: "", cat: "Dairy" },
  { id: 56, name: "Amul Cheese Slices", unit: "100 g", price: 85, originalPrice: 95, rating: "4.6", ratingCount: "144", time: "8 mins", options: null, badge: "Breakfast", img: "", cat: "Dairy" },
];
