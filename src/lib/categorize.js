/**
 * Puts a product on the right shelf from its name.
 *
 * The catalogue's own category came from a loose keyword match, so "Amul
 * Butter Cookies" sat in Dairy, "Amul White Chocolate" in Drinks and "Coca
 * Cola" in Biscuits. Here the rules run top to bottom and the first one that
 * matches wins, so the specific things (pet food, baby food, ice cream,
 * biscuits) are decided before the loose words they also contain ("fish",
 * "milk", "cream", "butter", "chocolate").
 *
 * Returns { cat, sub }: the aisle (same names as shopAisles.js) and the
 * smaller shelf inside it. A name no rule knows keeps the category it came
 * with, and has no sub.
 */

// [aisle, shelf inside it, what the name must contain]
import { isAgeRestricted, TOBACCO_CATEGORY } from "./ageGate";

const RULES = [
  // ---- Decided first: their names borrow words from other shelves ----------
  ["Pet Care", "Cat & dog food", /\b(whiskas|whi|pedigree|drools?|drolls|me ?o|meow|pure ?pet|kitekat|sheba|grainzero|kitty yums|kitten|temptation dry)\b/],
  ["Pet Care", "Pet supplies", /\b(cat (litter|nip|ball|pumpkin)|pet (toy|bowl|collar)|dog (toy|collar|leash)|bow collar|puppy)\b/],

  ["Ice Cream", "", /\b(kwality|kw|magnum|cornetto|corenetto|kulfi|kulfeez|ice ?cream|ice candy|cream ?bell|vadilal|sundae|capella|choco bar|cassat+a|sorbet)\b/],
  ["Sweets & Chocolates", "Candy & gum", /\b(candy|candies|toffees?|lolli ?pops?|chupa|chewing gum|bubble gum|gums?|sour punk|warheads|juicy drops|marsh ?m[ae]llow\w*|nerds|haribo|fruit ?tella)\b/],
  ["Instant Food", "Frozen & ready to cook", /\b(baby corn|corn baby|sweet corn|golden corn)\b/],

  ["Baby Care", "Diapers & wipes", /\b(diapers?|dipers?|pampers|mamy ?poko|huggies|littles|wowper|dry (sheet|shhet)|baby (cozy )?wipes|baby skincare wipes)\b/],
  ["Baby Care", "Baby food", /\b(cerelac|lactogen|nan (pro|\d)|similac|weanolac|dexolac|nestum|farex|baby food)\b/],
  ["Baby Care", "Baby bath & skin", /\b(johnsons?|gohnsons|baby|babay|sebamed|aveeno|feeder|feeding bottle|teether|pacifier|breast pump|sensodyne kids|toddler|inf(l)?ant)\b/],

  ["Health & Wellness", "Sexual wellness", /\b(condoms?|durex|manforce|skore|kamasutra|lube|delay spray|bold care)\b/],
  ["Personal Care", "Feminine hygiene", /\b(whisper|stayfree|sofy|period pant(y|ies)|penty|sanitary|pads?|tampons?|panty liners?|evereve)\b/],
  ["Health & Wellness", "Medicine cabinet", /\b(eno|ors|isabgol|vicks|volini|moov|band ?aid|bandage|ointment|inhaler|pain killer|antiseptic|digene|hajmola|pudin ?hara|crocin|strepsils|zandu|iodex|thermometer|glucoplus|glucon)\b/],

  ["Clothing", "", /\b(jockey|van ?h[ea]usen|thermals?|thrm[a]?l|socks|sox|boxers?|briefs?|vests?|trunks?|hexxed|reebok|leggings|lggs|3 4 top|top skin|top of wht|innerwear|glitzberg|polar wear)\b/],

  ["Personal Care", "Skin care", /\b(face ?wash|facewash|face (scrub|pack|mask|serum|cream|gel|fresh\w*)|de ?tan|scrub(?!ber)|sun ?screen|sun scre|moisturi[sz]e?r?s?|moistures|lotion|serum|syrum|cleanser|cleansing|toner|sheet mask|night cream|day cream|cold cream|lip (balm|care)|rose water|aloe vera gel|petroleum jelly|vaseline|wax strips?|veet|acne|pimple|tea tree|shea|derma( co)?|dot (and )?key|aqualogica|foxta[il]{2}e?|de ?construct|minimalist|mamaearth|m caffeine|oxyglow|biotique|khadi|ponds|nivea|lacto cal\w+|glow lovely|dr rashe+ls?|clean clear|himalaya\w* .*(cream|wash|scrub))\b/],
  ["Personal Care", "Hair care", /\b(shampoo|shampo|shmp|conditioner|hair ?(oil|colou?r|mask|spray|spa|serum|gel|wax|volume|remov\w*)|h oil|parachute|trichup|indulekha|bajaj|streax|head (and|n)? ?shoulders?|pantene|sunsilk|clinic plus|tresemme|dandruff|l ?ore?al|loral|garnier|gliss|b ?blunt|set wet|gatsby|godrej expert|combs?|toni guy)\b/],
  ["Personal Care", "Fragrances & deos", /\b(deo|deodorants?|perfumes?|perfuem|body ?(spray|mist)|attar|oudh?|edp|edt|cologne|roll ?on|bellavita|denver|park avenue|wotta ?girl|secret (temptation|romance)|layer(r)? ?(shot|wtag)|envy|fogg|engage|axe|wild stone|altressa|al birr|lattafa|swiss arabian|david ?off)\b/],
  ["Personal Care", "Oral care", /\b(tooth ?paste|tooth ?brush|mouth ?wash|tongue cleaner|floss|colgate|sensodyne|sensoprox|pepsodent|close ?up|dentoshine|oral b|dabur red|meswak)\b/],
  ["Personal Care", "Men's grooming", /\b(razors?|blades?|shaving|after ?shave|beard|trimmers?|groomer|gil+ett?e|wilkinson|bombay shaving|bsc|b s c)\b/],
  ["Personal Care", "Makeup", /\b(lip ?stick|lip ?liner|lip ?gloss|kajal|mascara|eye ?liner|eye ?shadow|nail (polish|paint|enamel|remover|clipper)|foundation|compact|concealer|make ?up|bleach|lakme|maybelline|fit ?me|faces ?canada|swiss beauty|gubb|beauty blender|mars|sindoor|bindi|mehndi|mehandi|henna|tweezer)\b/],
  ["Personal Care", "Bath & body", /\b(soaps?|body ?wash|bodywash|shower gel|hand ?wash|sanitizers?|loofah|talc|cinthol|lux|lifebuoy|pears|santoor|dove|dettol|savlon|medimix|margo|fiama|pumice|cotton (balls|buds)|buds|ear buds)\b/],
  ["Health & Wellness", "Vitamins & supplements", /\b(multi ?vitamins?|vitamins? (tablets?|capsules?|gummies)|collagen|hk vitals|chyawanprash|protein powder|whey|supplement|omega|fish oil|biotin|ashwagandha|centrum|apple cider)\b/],

  ["Kitchen Care", "Kitchen needs", /\b(toilet (rolls?|tissues?|paper)|tissues?|napkins?)\b/],
  ["Home Care", "Laundry", /\b(detergent|washing (powder|liquid|soap)|surf|ariel|tide|rin|wheel|fena|ghadi|nirma|henko|vanish|comfort|ezee|fabric|starch|dr wool|mr white|ujala)\b/],
  ["Home Care", "Cleaners", /\b(lizol|harpic|domex|colin|floor cleaner|surface cleaner|multi cleaner|toilet|bathroom|phenyl|disinfectant|drain|glass cleaner|mops?|brooms?|dust(er|pan)|garbage bags?|naphth?alene|shoe (polish|shiner)|kiwi shine\w*)\b/],
  ["Home Care", "Fresheners & pooja", /\b(odonil|aer|ambi ?pure?|air freshener|room (spray|fresh\w*)|car (fragrance|perfume|jasmine)|dhoop|agarbath?t?i|incense|candles?|camphor|kapoor|pour home)\b/],
  ["Home Care", "Pest control", /\b(mosquito|good ?knight|all ?out|mortein|hit (spray|chalk|black|red)|odomos|cockroach|rat kill|lakshman rekha)\b/],
  ["Home Care", "Towels & more", /\b(towels?|bed ?sheet|pillow|hangers?|hooks?|clothes? clips?|umbrella)\b/],
  ["Kitchen Care", "Dishwashing", /\b(vim|pril|dish ?wash\w*|scrubbers?|scotch ?brite|steel wool|sponge wipes?)\b/],
  ["Kitchen Care", "Kitchen needs", /\b(foil(?! ball)|cling|butter paper|kitchen (towels?|wiper|roll)|paper (cups?|plates?)|tooth ?picks?|lighters?|match ?box|straws?|sports bottle|water bottle|lunch box|tiffin)\b/],

  ["Stationery", "", /\b(pens?|pencils?|erasers?|sharpe?ners?|note ?books?|diary|drawing|glue|fevi\w+|tape|markers?|highlighter|stap?lers?|steplar|scissors|cutter|doms|natraj|apsara|camlin|cello|pilot|flair|class?mate|colou?rs|crayons?|envelopes?|chart papers?|a4|sticky notes|geometry|registers?|stickers?|whitener|calculator)\b/],
  ["Toys & Games", "", /\b(toys?|playing cards|pl[ae]ying cards|uno|ball?oons?|clay|(modelling|play) dough|robot|party popper|puzzle|ball|games?|money bank|slime)\b/],
  ["Electronics", "", /\b(cables?|chargers?|batter(y|ies)|duracell?|eveready|power cell?|bulbs?|led|fans?|earphones?|headphones?|frother|lint remover|writing tablet|adapter|torch|extension)\b/],

  // ---- Food and drink ------------------------------------------------------
  ["Sauces & Spreads", "Sauces & pickles", /\b(ketchup|(pasta|pizza|red|cheese|chilli|momo) sauce|pickles?|achar)\b/],
  ["Snacks", "Health bars", /\b(proti?e?in ?(wafer )?bars?|yoga ?bar|max proti?e?in|energy (bar|bites)|granola bar|super ?you|rite bite|get my mette|exo bar)\b/],

  ["Beverages", "Milk drinks", /\b(milk ?shakes?|milshake|shake|cold coffee|lassi|chaas|butter ?milk|flavou?red milk|amul (kool|masti)|badam (milk|shake)|horlicks|bournvita|boost|complan|protinex|yakult|falooda drink)\b/],
  ["Beverages", "Tea & coffee", /\b(tea|chai|cahi|coffee|nescafe|bru|kahwa|kehwa|qawah|tetley|lipton|taj mahal|red label|tata tea|tatatea|marvel|bevzilla)\b/],
  ["Beverages", "Soft drinks", /\b(cola|pepsi|coke|sprite|fanta|thums ?up|mountain dew|7 ?up|limca|mirinda|soda|tonic|mocktail|mojito|ginger ale|appy fizz|campa|sparkling|coolberg)\b/],
  ["Beverages", "Energy drinks", /\b(energy (drink|sips)|monster|red ?bull|sting|hell energy|gatorade|electral)\b/],
  ["Beverages", "Juices", /\b(juices?|(fruit|lemon|coco|probiotic) drink|drink|beverage|tropicana|frooti|maaza|slice|appy|paper (boat|body)|vinut|aamras|minute maid|real (guava|mango|apple|green|heart|mixed|orange|litchi|pineapple|pomegranate)|b natural|al[o0] ?fru[it]+|coco frut|uji|raw (alphonso|valencia|turmeric|good|refreshers?)|nawan|ocean|camel|storia|joiner|zyro|fresher|batook|chabba|cravova|nata|jumpin|squash|sharbat|rooh afza|tang|rasna|boba|jrink|basil seed|swasco|stirred)\b/],
  ["Beverages", "Water", /\b(mineral water|drinking water|packaged water|coconut water|tender coconut|bisleri|aquafina|kinley|bailey|kashmir springs)\b/],

  // Chocolate bars that name a biscuit, then biscuits and cakes, then the
  // rest of chocolate: "Dairy Milk Oreo" is chocolate, "Chocolate biscuit" is not.
  ["Sweets & Chocolates", "Chocolates", /\b(dairy milk|kit ?kat|hershe?y\w* kisses|snic?kers|ferr[eo]r?o|kinder|galaxy)\b/],
  ["Biscuits", "Wafers & rusks", /\b(wafers?|waffy|rusks?|toasts?|rik rak)\b/],
  ["Biscuits", "Cookies", /\b(cookies?|good ?day|unibic|dark fantasy|milano|mom s magic|chocochip|choco chip)\b/],
  ["Biscuits", "Biscuits", /\b(biscuits?|bourbon|bour bon|marie|oreo|hide ?(and)? ?seek|monaco|krack ?jack|50 50|nutri ?choice|digestive|parle|britann?ia (treat|tiger|milk bikis|nice|little)|sunfeast|m[ac]c?t?i?vit\w+|jim jam|little hearts|bounce|fab|cremica|priyagold|malkist|creme sandwich\w*)\b/],
  ["Bakery", "Cakes", /\b(cakes?|brownies?|muffins?|swiss roll|winkies|kuppies|donuts?|pastr(y|ies)|kunafa|gobbles|truffle|love bite|waffle)\b/],
  ["Bakery", "Bread", /\b(bread|buns?|pav|lavas|kulcha|croissants?|bagels?|pizza base)\b/],

  ["Sweets & Chocolates", "Candy & gum", /\b(mints?|trident|icebreakers?|jell(y|ies)|eclairs|mukhwas|mouth fresh\w*|fox ?s|mentos|polo|alpenliebe|melody|kismi|happydent|center f\w+|boomer|orbit)\b/],
  ["Sauces & Spreads", "Spreads & syrups", /\b(peanut butter|nutella|spreads?|syrup|honey|jam|marmalade|murabb?a)\b/],
  ["Sweets & Chocolates", "Chocolates", /\b(chocolates?|choclate|cadbury|5 ?sta\w*r|munch|perk|bounty|twix|hershe?y\w*|milky ?bar|bar one|toblerone|lindt|gems|silk|fuse|temptations|celebrations|amul dark|wayanad|chocozy|kisses|milka)\b/],
  ["Sweets & Chocolates", "Indian sweets", /\b(gulab jamun|rasgul+a|rasmala?i|gasgoola|soan papdi|kaju katl?ri|barfi|ladoo|laddu|halwa|kheer|peda|mithai)\b/],

  ["Instant Food", "Frozen & ready to cook", /\b(mccain|frozen|fries|nuggets?|kebabs?|parathas?|parota|naan|momos?|sausages?|sasuages?|salami|meat ?balls?|chaap|dough sheets)\b/],
  ["Snacks", "Namkeen", /\b(haldirams?|jabsons|bi[ck]ano|bikaji)\b/],
  ["Instant Food", "Noodles & pasta", /\b(noodles?|ramen|pasta|pazzta|yipp?ee?|maa?ggi(?! magic)|samyang|buldak|nissin|korean|macaroni|vermicelli|top ramen|wai wai|u dong)\b/],
  ["Instant Food", "Breakfast cereals", /\b(oats?|oatmeal|corn ?flakes|muesli|granola|chocos|kell?ogg?s?|cereals?|crispy choco|soulfull)\b/],
  ["Instant Food", "Frozen & ready to cook", /\b(soups?|ready to (eat|cook)|mushrooms?|olives?(?! oil)|canned|instant mix|popping)\b/],

  ["Snacks", "Chips", /\b(chips|lay ?s|lays|kurkure|bingo|pringles|doritos|cornitos|nachos|uncle chipps?|too yumm|potazos|crisps|puffs?|cheetos|cheese balls)\b/],
  ["Snacks", "Popcorn & makhana", /\b(pop ?corn|act ii|makhana)\b/],
  ["Snacks", "Namkeen", /\b(namkeen|bhujia|mixture|sev|chevdo|chivda|kachori|papdi|peanuts?|chann?a|moong|mathri|khakhra|chikki|koh kae)\b/],

  ["Dry Fruits", "Dates", /\b(dates|khajoor|ajwa|safawi|mabroom|medjool|tamur)\b/],
  ["Dry Fruits", "Seeds & berries", /\b((chia|flax|sunflower|pumpkin|melon|sabja) seeds?|seed mix|seeds|cranberr(y|ies)|blueberr(y|ies)|apricots?|prunes?|figs?|anjeer)\b/],
  ["Dry Fruits", "Nuts", /\b(almonds?|almon|badam|cashews?|kaju|pista|pistachios?|raisins?|kishmish|walnuts?|akhrot|hazelnuts?|dry ?fru?its?|nutraj|farmley|nutty gritties|mixed nuts)\b/],

  ["Spices", "Whole & powder", /\b(masala|masla|chill?[ie]e? (powder|flakes)|turmeric|haldi|coriander|corinder|dhania|jeera|zeera|cumin|hing|cinnamon|elaichi|cardamom|cloves?|fennel|saunf|pepper|paprika|oregano|parsley|seasoning|seasion\w*|herbs?|star anise|kasoo?ri|ajwain|mustard seeds?|saff?ron|catch|orika|kanwal|shan|everest|mdh|keya)\b/],
  ["Sauces & Spreads", "Sauces & pickles", /\b(sauces?|mayo\w*|chutney|chatni|chitney|vinegar|paste|puree|schezwan|soy|dips?|mustard)\b/],
  ["Meat & Fish", "", /\b(chicken|mutton|fish|prawns?|eggs?)\b/],

  ["Dairy", "Curd & yogurt", /\b(curd|dahi|yogh?urt|yougurt|epigamia)\b/],
  ["Dairy", "Butter & cheese", /\b(butter|cheese|mozzarella|paneer|ghee|fresh cream|malai|khoa|mawa)\b/],
  ["Dairy", "Milk", /\b(milk|doodh|milkmaid|condensed|amul gold|amul taaza|toned)\b/],

  ["Staples", "Atta, rice & dal", /\b(atta|aata|flour|maida|besan|sooji|suji|rava|rice|basmati|sella|seela|dal|rajma|poha|sabudana|soya|daliya|india gate|dawaat|aashirvaa?d|rajdhani)\b/],
  ["Staples", "Oil, sugar & salt", /\b(oil|sugar|salt|jaggery|gur|saffola|fortune|sundrop|baking (powder|soda)|corn ?flour|custard|yeast)\b/],

  ["Fruits", "", /\bfresh\b.*\b(apples?|bananas?|oranges?|mango(es)?|grapes|pomegranate|papaya|watermelon)\b/],

  // A brand on its own, when the name says nothing else.
  ["Dairy", "Milk", /\b(amul|mother d\w+|milky ?mist|nandini|verka|khyber)\b/],
];

function normalise(name) {
  return ` ${String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

export function categorize(name, currentCat = "") {
  const text = normalise(name);
  for (const [cat, sub, pattern] of RULES) {
    if (pattern.test(text)) return { cat, sub };
  }
  // One catch-all shelf: a stock import files unknown items under "Other".
  const kept = String(currentCat || "").trim();
  return { cat: !kept || /^other$/i.test(kept) ? "Others" : kept, sub: "" };
}

/** The same product, on the shelf its name says it belongs on. */
export function withShelf(product) {
  if (!product || !product.name) return product;
  // Tobacco has its own shelf, so staff can find it under Stock. Shoppers
  // never browse it: every shop list drops age-restricted items first.
  if (isAgeRestricted(product)) {
    return product.cat === TOBACCO_CATEGORY ? product : { ...product, cat: TOBACCO_CATEGORY, sub: "" };
  }
  const { cat, sub } = categorize(product.name, product.cat || product.category);
  if (cat === product.cat && sub === (product.sub || "")) return product;
  return { ...product, cat, sub };
}
