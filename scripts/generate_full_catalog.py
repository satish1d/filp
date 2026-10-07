import sys
import os
import re
import json

sys.path.append('scripts')
from catalog_data import PRODUCTS_RAW
from catalog_batch2 import BATCH_2

all_sql_items = PRODUCTS_RAW + BATCH_2

print(f"Loaded {len(all_sql_items)} items from SQL datasets.")

known_brands = [
    'ACTIVA', 'Amazon Basics', 'Atomberg', 'atomberg', 'Bosch', 'Cello', 'Faber',
    'Havells', 'HIFRESH', 'Hindware', 'IBELL', 'iBELL', 'Larah by Borosil', 'Larah',
    'LG', 'Lifelong', 'LONGWAY', 'MILTON', 'Nirlon', 'NUUK', 'Philips', 'PHILIPS',
    'Pigeon', 'Polycab', 'Preethi', 'Prestige', 'Sunshine', 'SUPER TOY', 'Symphony',
    'USHA', 'V-Guard', 'Vinod', 'Whirlpool', 'Wonderchef', 'Sujata', 'Bajaj',
    'Crompton', 'CROMPTON', 'Wipro', 'wipro', 'Borosil', 'Sunmeet', 'Libra', 'Vidiem',
    'Orpat', 'KWER', 'LOMESH', 'PAGASUS', 'CostarMatter', 'FLIPZON', 'Synergy',
    'LiMETRO STEEL', 'LiMETRO', 'HP', 'SanDisk', 'GoRogue', 'AGARO', 'Glen', 'KENT',
    'MOTOROLA', 'Mi', 'Smartron', 'DIZO', 'Fastrack', 'Titan', 'Flipkart SmartBuy',
    'FENDER', 'Polo Club', 'Blaupunkt', 'Eufy', 'FOXSUN', 'Khaitan', 'RECONNECT',
    'Hammer', 'realme', 'SoundLOGIC'
]

def clean_brand(title):
    for b in known_brands:
        if title.lower().startswith(b.lower()):
            clean = b.title()
            if clean in ['Lg', 'Hp', 'Bldc', 'Otg']:
                clean = clean.upper()
            return clean
    parts = title.split()
    first = parts[0]
    return first.title()

def clean_short_name(title):
    t = re.sub(r'\s+', ' ', title).strip()
    if len(t) <= 32:
        return t
    return t[:29] + '...'

def slugify(text):
    text = re.sub(r'[^a-zA-Z0-9\s-]', '', text).strip().lower()
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:40]

def make_features_and_specs(title, brand, category, price, mrp):
    t_lower = title.lower()
    features_list = []
    specs = {
        "Brand": brand,
        "Category": category,
        "Warranty": "1 Year Manufacturer Warranty",
        "Flipkart Assured": "Yes - 100% Genuine Quality Check Verified",
        "Package Contents": "1 Main Unit, User Manual, Warranty Card"
    }

    if 'fan' in t_lower or 'ceiling' in t_lower:
        features_list = [
            f"<b>Energy Efficient BLDC Motor:</b> Consumes up to 65% less electricity compared to standard induction fans.",
            f"<b>Aerodynamic Blades:</b> High air delivery with silent operation for maximum room cooling.",
            f"<b>Smart Control:</b> Convenient speed adjustment and timer features with modern finish.",
            f"<b>Warranty:</b> 2 Years comprehensive brand warranty across India."
        ]
        specs["Motor Type"] = "BLDC High Efficiency"
        specs["Blade Sweep"] = "1200 mm" if "1200" in title else "High Airflow"
        specs["Number of Blades"] = "3" if "3" in title else ("4" if "4" in title else "3")
        specs["Power Consumption"] = "28W - 35W"

    elif 'mixer' in t_lower or 'grinder' in t_lower or 'juicer' in t_lower or 'blender' in t_lower:
        features_list = [
            f"<b>Heavy Duty Copper Motor:</b> High-torque motor for ultra-fine grinding of tough spices and batter.",
            f"<b>Multi-Utility Stainless Steel Jars:</b> Rust-resistant food-grade jars with flow breakers and ergonomic handles.",
            f"<b>Overload Protector:</b> Automatic auto-cut switch preventing motor overheating during heavy usage.",
            f"<b>Warranty:</b> 2 Years on motor, 1 Year on product."
        ]
        specs["Motor Power"] = "750W / 1000W Heavy Duty"
        specs["Jar Material"] = "100% Food Grade Stainless Steel"
        specs["Speed Settings"] = "3 Speeds + Pulse"
        specs["Locking System"] = "Hands-free lid locks"

    elif 'cook' in t_lower or 'casserole' in t_lower or 'dinner' in t_lower or 'set' in t_lower or 'stove' in t_lower or 'hob' in t_lower:
        features_list = [
            f"<b>Premium Build & Safety:</b> Heavy-gauge durable construction with high thermal resistance.",
            f"<b>Scratch-Resistant Finish:</b> Designed for everyday cooking with uniform heat distribution.",
            f"<b>Easy to Clean:</b> Stain resistant non-stick / food-grade stainless steel surface.",
            f"<b>Warranty:</b> 1 Year standard manufacturer warranty."
        ]
        specs["Material"] = "Food-Grade Aluminium / Stainless Steel / Toughened Glass"
        specs["Dishwasher Safe"] = "Yes"
        specs["Compatibility"] = "Gas Stove & Induction Compatible"

    elif 'cooler' in t_lower or 'air cooler' in t_lower:
        features_list = [
            f"<b>Honeycomb Cooling Pads:</b> Superior water retention providing long-lasting cool air delivery.",
            f"<b>Inverter Compatible:</b> Operates smoothly on domestic home inverters during power cuts.",
            f"<b>Ice Chamber:</b> Built-in dedicated ice chamber for instant chilled airflow.",
            f"<b>Warranty:</b> 1 Year brand warranty."
        ]
        specs["Cooling Media"] = "Dense Honeycomb Pads"
        specs["Air Throw"] = "Up to 25 Feet"
        specs["Castor Wheels"] = "Yes, 360-degree multi-directional"

    elif 'iron' in t_lower or 'steamer' in t_lower:
        features_list = [
            f"<b>Fast Heating Technology:</b> High wattage element ready to press garments in under 30 seconds.",
            f"<b>Non-Stick Ceramic / Golden Soleplate:</b> Smooth glide across all delicate and cotton fabrics without burning.",
            f"<b>Variable Temperature Dial:</b> Customized heat settings for silk, wool, cotton and linen.",
            f"<b>Warranty:</b> 2 Years manufacturer warranty."
        ]
        specs["Soleplate Type"] = "Non-Stick Ceramic Coated"
        specs["Swivel Cord"] = "360 Degree Flexible Cord"
        specs["Power Rating"] = "1000W - 1380W"

    elif 'smartwatch' in t_lower or 'band' in t_lower or 'watch' in t_lower:
        features_list = [
            f"<b>Vibrant Display:</b> Crisp bright touch screen with always-on display support and scratch resistance.",
            f"<b>Bluetooth Calling:</b> High-fidelity microphone and speaker to answer calls on the go.",
            f"<b>Health & Fitness Suite:</b> Real-time SpO2, heart rate, sleep monitoring, and 100+ sports modes.",
            f"<b>Battery Life:</b> Up to 7 days standby on a single fast charge."
        ]
        specs["Display"] = "High Definition AMOLED / Color LCD"
        specs["Battery Runtime"] = "Up to 7 Days"
        specs["Water Resistance"] = "IP68 Dust & Water Proof"
        specs["Bluetooth Version"] = "Bluetooth 5.3 LE"

    elif 'headset' in t_lower or 'earbuds' in t_lower or 'soundbar' in t_lower or 'speaker' in t_lower:
        features_list = [
            f"<b>Deep Bass Acoustic Sound:</b> Tuned dynamic drivers delivering punchy bass and crystal clear vocals.",
            f"<b>Environmental Noise Cancellation:</b> Dual mics filtering ambient background noise during calls.",
            f"<b>Long Playtime:</b> Up to 30 hours combined playtime with quick charging case.",
            f"<b>Warranty:</b> 1 Year standard manufacturer warranty."
        ]
        specs["Connectivity"] = "True Wireless Bluetooth 5.2"
        specs["Battery Backup"] = "Up to 30 Hours with Case"
        specs["Charging Port"] = "Type-C Fast Charging"

    else:
        features_list = [
            f"<b>Authentic Quality:</b> Certified Flipkart Assured product with strict multi-step inspection.",
            f"<b>Modern Design:</b> Engineered for reliable performance and high durability in Indian homes.",
            f"<b>Warranty:</b> 1 Year comprehensive brand warranty with pan-India service support."
        ]
        specs["Quality Standard"] = "100% Tested & Verified"

    features_html = f"<p><b>{brand} - Official Big Billion Days Selection</b></p><ul>"
    for feat in features_list:
        features_html += f"<li>{feat}</li>"
    features_html += "</ul>"

    return features_html, specs

products_list = []

# Ratings and reviews lookup for consistency
ratings_cycle = [4.5, 4.4, 4.6, 4.3, 4.7, 4.2, 4.5, 4.8, 4.4, 4.6, 4.3, 4.5]
review_counts_cycle = ["1,248", "852", "2.4k+", "419", "3.1k+", "720", "1.8k+", "4,510", "960", "2.1k+", "630", "1.5k+"]
delivery_cycle = ["Delivery by 10 Oct, Sat", "Delivery by 11 Oct, Sun", "Get it by 10 Oct", "Fast Delivery by 11 Oct"]

for idx, item in enumerate(all_sql_items):
    raw_id = item[0]
    name = item[1].strip()
    sp = int(item[2])
    mrp = int(item[3])
    cat = item[4].strip()
    img = item[5].strip()

    brand = clean_brand(name)
    short_name = clean_short_name(name)
    slug = f"{slugify(brand)}-{slugify(name[:20])}-{raw_id}"

    discount_percent = int(round((1.0 - (sp / mrp)) * 100)) if mrp > sp else 50
    discount_percent = max(5, min(95, discount_percent))

    rating_val = ratings_cycle[idx % len(ratings_cycle)]
    review_val = review_counts_cycle[idx % len(review_counts_cycle)]
    delivery_text = delivery_cycle[idx % len(delivery_cycle)]

    features_html, specs = make_features_and_specs(name, brand, cat, sp, mrp)

    deal_price = max(99, sp - 30)

    # Group catalog images by category so each product gets 4-6 related images
    cat_images = [x[5].strip() for x in all_sql_items if x[4].strip() == cat and x[5].strip() != img]
    item_images = [img]
    for ci in cat_images[:5]:
        if ci not in item_images:
            item_images.append(ci)

    p_dict = {
        "id": raw_id,
        "md5_id": slug,
        "name": name,
        "short_name": short_name,
        "brand": brand,
        "category": cat,
        "rating": str(rating_val),
        "rating_stars": rating_val,
        "review_count": review_val,
        "ad": (idx % 11 == 0),
        "authorized_seller": True,
        "discount_label": f"↓ {discount_percent}%",
        "discount_percent": discount_percent,
        "mrp": mrp,
        "selling_price": sp,
        "deal_price": deal_price,
        "badge": "Big Billion Days Price" if (idx % 3 != 1) else "Lowest price since launch",
        "delivery_text": delivery_text,
        "seller_name": "RetailNet" if (idx % 2 == 0) else "OmniTechRetail",
        "seller_rating": "4.4 ★ • 5 years with Flipkart",
        "img1": img,
        "images": item_images,
        "features": features_html,
        "specs": specs,
        "assured": True
    }
    products_list.append(p_dict)

# Add the 3 Festive Fashion Showcase products (Men, Women, Kids) so fashion filter & showcase strip work smoothly!
fashion_items = [
    {
        "id": 1001,
        "md5_id": "mufti-men-slim-fit-checkered-shirt",
        "name": "MUFTI Men Slim Fit Checkered Spread Collar Casual Shirt",
        "short_name": "MUFTI Men Slim Fit Checkered...",
        "brand": "MUFTI",
        "category": "Men",
        "rating": "4.5",
        "rating_stars": 4.5,
        "review_count": "1,221",
        "ad": True,
        "authorized_seller": True,
        "discount_label": "↓ 67%",
        "discount_percent": 67,
        "mrp": 2999,
        "selling_price": 999,
        "deal_price": 949,
        "badge": "Big Billion Days Price",
        "delivery_text": "Delivery by 10 Oct, Sat",
        "seller_name": "HSAtlastradeFashion",
        "seller_rating": "4.3 ★ • 4 years with Flipkart",
        "img1": "assets/images/cat_men.jpg",
        "pack_of": "1",
        "fabric": "Pure Cotton",
        "sleeve": "Full Sleeve",
        "pattern": "Checkered",
        "collar": "Spread",
        "color": "Blue, White, Yellow",
        "sizes": ["38", "40", "42", "44", "46", "48", "50"],
        "available_sizes": ["38", "40", "42", "44", "46"],
        "disabled_sizes": ["48", "50"],
        "features": "<p><b>MUFTI Men Slim Fit Checkered Casual Shirt</b></p><ul><li><b>Fabric:</b> 100% Pure Breathable Cotton for all-day comfort.</li><li><b>Collar &amp; Sleeve:</b> Spread collar with full sleeves and curved hemline.</li><li><b>Pattern:</b> Modern Yellow, Blue and White checkered tartan layout.</li><li><b>Fit:</b> Slim Fit tailored for smart festive and casual wear.</li><li><b>Care:</b> Machine wash cold, gentle cycle.</li></ul>",
        "specs": {
            "Brand": "MUFTI",
            "Category": "Men Fashion",
            "Fabric": "100% Pure Cotton",
            "Sleeve": "Full Sleeve",
            "Collar": "Spread Collar",
            "Pattern": "Checkered",
            "Fit": "Slim Fit"
        },
        "assured": True
    },
    {
        "id": 1002,
        "md5_id": "libas-women-embroidered-anarkali-suit",
        "name": "LIBAS Women Embroidered Pure Silk Kurta and Pant Set with Chiffon Dupatta",
        "short_name": "LIBAS Women Pure Silk Set...",
        "brand": "LIBAS",
        "category": "Women",
        "rating": "4.6",
        "rating_stars": 4.6,
        "review_count": "6.8k+",
        "ad": True,
        "authorized_seller": True,
        "discount_label": "↓ 80%",
        "discount_percent": 80,
        "mrp": 3299,
        "selling_price": 649,
        "deal_price": 599,
        "badge": "Big Billion Days Price",
        "delivery_text": "Get it by 10 Oct",
        "seller_name": "LibasOfficialStore",
        "seller_rating": "4.7 ★ • 6 years with Flipkart",
        "img1": "assets/images/cat_women.jpg",
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "available_sizes": ["S", "M", "L", "XL"],
        "disabled_sizes": ["XS", "XXL"],
        "features": "<p><b>LIBAS Festive Collection Embroidered Anarkali Kurta &amp; Pant Set</b></p><ul><li><b>Fabric:</b> Luxurious Chanderi Silk with soft cotton lining.</li><li><b>Embroidery:</b> Intricate Zari and Sequins handwork on yoke and border.</li><li><b>Dupatta:</b> Graceful matching Chiffon dupatta with golden lace border.</li><li><b>Care:</b> Dry clean recommended for long-lasting vibrancy.</li></ul>",
        "specs": {
            "Brand": "LIBAS",
            "Category": "Women Ethnic",
            "Fabric": "Pure Silk Blend",
            "Type": "Kurta, Pant and Dupatta Set",
            "Occasion": "Festive & Party Wear"
        },
        "assured": True
    },
    {
        "id": 1003,
        "md5_id": "max-kids-festive-ethnic-wear-set",
        "name": "MAX BOYS & GIRLS Festive Ethnic Kurta Pajama & Lehenga Party Wear Set",
        "short_name": "MAX Kids Ethnic Set...",
        "brand": "MAX",
        "category": "Kids",
        "rating": "4.5",
        "rating_stars": 4.5,
        "review_count": "2.9k+",
        "ad": False,
        "authorized_seller": True,
        "discount_label": "↓ 80%",
        "discount_percent": 80,
        "mrp": 1499,
        "selling_price": 299,
        "deal_price": 269,
        "badge": "Big Billion Days Price",
        "delivery_text": "Get it by 11 Oct",
        "seller_name": "MaxRetailOfficial",
        "seller_rating": "4.6 ★ • 5 years with Flipkart",
        "img1": "assets/images/cat_kids.jpg",
        "sizes": ["2-3 Y", "4-5 Y", "6-7 Y", "8-9 Y", "10-11 Y"],
        "available_sizes": ["2-3 Y", "4-5 Y", "6-7 Y", "8-9 Y"],
        "disabled_sizes": ["10-11 Y"],
        "features": "<p><b>MAX Kids Festive Traditional Ethnic Wear Collection</b></p><ul><li><b>Material:</b> 100% Skin-friendly breathable cotton blend, gentle on kids sensitive skin.</li><li><b>Design:</b> Festive traditional gold foil / jacquard motifs.</li><li><b>Comfort:</b> Soft elasticated waist for hassle-free fit and play.</li><li><b>Care:</b> Gentle machine wash cold.</li></ul>",
        "specs": {
            "Brand": "MAX",
            "Category": "Kids Festive Wear",
            "Fabric": "Cotton Silk Blend",
            "Age Group": "2 - 11 Years",
            "Care": "Gentle Machine Wash"
        },
        "assured": True
    }
]

# We place all 114 SQL products first, followed by the fashion items
full_catalog = products_list + fashion_items

print(f"Total products in catalog: {len(full_catalog)} ({len(products_list)} from SQL + {len(fashion_items)} Fashion)")

# Similar products for recommendation widget
similar_products = [
    {
        "id": 101,
        "name": "ACTIVA Lotus 5 Star 1200 mm BLDC Motor with Remote Fan",
        "short_name": "ACTIVA Lotus 5 Star...",
        "brand": "ACTIVA",
        "rating": "4.4",
        "discount_label": "↓ 91%",
        "mrp": 3699,
        "selling_price": 306,
        "badge": "Big Billion Days Price",
        "ad": True,
        "authorized_seller": True,
        "img1": "https://cdn.shopify.com/s/files/1/0596/9743/0617/files/original-imagz6radeccth8g.jpg?v=1713047300"
    },
    {
        "id": 102,
        "name": "Bosch TrueMixx Pro Mixer Grinder 1000W 4 Jars Black",
        "short_name": "Bosch TrueMixx Pro...",
        "brand": "BOSCH",
        "rating": "4.6",
        "discount_label": "↓ 89%",
        "mrp": 2499,
        "selling_price": 269,
        "badge": "Big Billion Days Price",
        "ad": True,
        "authorized_seller": True,
        "img1": "https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81Cir3akReL._SX679.jpg?v=1713047834"
    },
    {
        "id": 103,
        "name": "Faber Hob 3 Burner Auto-Ignition Spillage Proof",
        "short_name": "Faber Hob 3 Burner...",
        "brand": "FABER",
        "rating": "4.5",
        "discount_label": "↓ 97%",
        "mrp": 13630,
        "selling_price": 389,
        "badge": "Lowest price since launch",
        "ad": False,
        "authorized_seller": True,
        "img1": "https://cdn.shopify.com/s/files/1/0596/9743/0617/files/615eDuT_-6L._SX679.jpg?v=1713048866"
    }
]

reviews = [
    {
        "rating": 5,
        "title": "Exceptional value in Big Billion Days!",
        "time": "2 days ago",
        "comment": "Genuine branded product received in brand-sealed packaging. Fast delivery and working perfectly! Outstanding discount!"
    },
    {
        "rating": 5,
        "title": "Superb Quality & Flipkart Assured",
        "time": "1 week ago",
        "comment": "Got this at an unbelievable price during the live sale. Heavy quality and original warranty card included."
    },
    {
        "rating": 4,
        "title": "Value for money",
        "time": "2 weeks ago",
        "comment": "Working great so far. Delivery was on time and packing was very sturdy."
    }
]

review_photos = [
    "assets/images/rev_photo1.jpg",
    "assets/images/rev_photo2.jpg",
    "assets/images/rev_photo3.jpg"
]

catalog_dict = {
    "products": full_catalog,
    "similar_products": similar_products,
    "reviews": reviews,
    "review_photos": review_photos
}

with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump(catalog_dict, f, indent=2, ensure_ascii=False)

print("data/products.json successfully written with complete catalog!")
