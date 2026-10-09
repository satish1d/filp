#!/usr/bin/env python3
"""
CLI Pipeline to import products from a CSV file into data/products.json
Usage:
    python3 scripts/import_csv.py <path_to_csv> [--replace | --append]
"""

import sys
import os
import csv
import json
import re

DATA_PATH = "data/products.json"

def clean_brand(title, explicit_brand=""):
    if explicit_brand and explicit_brand.strip():
        return explicit_brand.strip()
    KNOWN_BRANDS = [
        'ACTIVA', 'Amazon Basics', 'Atomberg', 'Bosch', 'Cello', 'Faber',
        'Havells', 'HIFRESH', 'Hindware', 'IBELL', 'Larah by Borosil', 'Larah',
        'LG', 'Lifelong', 'LONGWAY', 'MILTON', 'Nirlon', 'NUUK', 'Philips',
        'Pigeon', 'Polycab', 'Preethi', 'Prestige', 'Sunshine', 'SUPER TOY', 'Symphony',
        'USHA', 'V-Guard', 'Vinod', 'Whirlpool', 'Wonderchef', 'Sujata', 'Bajaj',
        'Crompton', 'Wipro', 'Borosil', 'Sunmeet', 'Libra', 'Vidiem',
        'Orpat', 'KWER', 'LOMESH', 'PAGASUS', 'CostarMatter', 'FLIPZON', 'Synergy',
        'LiMETRO STEEL', 'LiMETRO', 'AGARO', 'Glen', 'KENT', 'Butterfly', 'Hawkins'
    ]
    if not title:
        return 'Kitchen'
    for b in KNOWN_BRANDS:
        if title.lower().startswith(b.lower()):
            return b
    parts = title.strip().split()
    return parts[0] if parts else 'Kitchen'

def clean_short_name(name):
    if not name:
        return 'Kitchen Item'
    clean = re.sub(r'\s+', ' ', name).strip()
    return clean if len(clean) <= 32 else clean[:29] + '...'

def slugify(text):
    if not text:
        return 'item'
    text = re.sub(r'[^a-zA-Z0-9\s-]', '', text).strip().lower()
    return re.sub(r'[\s_-]+', '-', text)[:40]

def parse_num(val, default_val=0):
    if val is None or val == '':
        return default_val
    try:
        clean = re.sub(r'[^0-9.]', '', str(val))
        return int(round(float(clean)))
    except Exception:
        return default_val

def build_features_and_specs(name, brand, category, sp, mrp):
    t_lower = (name or '').lower()
    features = [
        "<b>Premium Food-Grade Quality:</b> High durability and heat resistant design.",
        "<b>Uniform Heat Distribution:</b> Optimized base for fast, efficient kitchen cooking.",
        "<b>Easy Cleaning & Maintenance:</b> Stain-resistant surface and dishwasher friendly.",
        "<b>Manufacturer Warranty:</b> 1 Year standard replacement warranty."
    ]
    specs = {
        "Brand": brand,
        "Category": category,
        "Warranty": "1 Year Manufacturer Warranty",
        "Flipkart Assured": "Yes - 100% Genuine Quality Check Verified",
        "Package Contents": "1 Main Unit, User Manual, Warranty Card",
        "Material": "Food-Grade Stainless Steel / Heavy-Gauge Aluminium",
        "Dishwasher Safe": "Yes",
        "Compatibility": "Gas Stove & Induction Compatible"
    }
    features_html = f"<p><b>{brand} - Official Big Billion Days Selection</b></p><ul>" + "".join(f"<li>{f}</li>" for f in features) + "</ul>"
    return features_html, specs

def import_csv(csv_path, mode="replace"):
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return False

    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = list(reader)

    print(f"Read {len(rows)} rows from CSV with headers: {headers}")

    # Header normalization mapping
    norm_map = {}
    for h in headers:
        clean = re.sub(r'[^a-z0-9]', '', h.lower())
        if clean in ['id', 'productid', 'sku', 'itemid', 'srno', 'sno']:
            norm_map['id'] = h
        elif clean in ['name', 'productname', 'title', 'producttitle', 'itemname']:
            norm_map['name'] = h
        elif clean in ['price', 'sellingprice', 'sp', 'dealprice', 'saleprice']:
            norm_map['selling_price'] = h
        elif clean in ['mrp', 'regularprice', 'originalprice', 'listprice']:
            norm_map['mrp'] = h
        elif clean in ['category', 'cat', 'department', 'type']:
            norm_map['category'] = h
        elif clean in ['brand', 'brandname', 'maker']:
            norm_map['brand'] = h
        elif clean in ['img', 'image', 'images', 'imageurl', 'imgurl', 'img1', 'photo']:
            norm_map['img1'] = h
        elif clean in ['rating', 'rate', 'stars']:
            norm_map['rating'] = h
        elif clean in ['reviews', 'reviewcount']:
            norm_map['review_count'] = h

    # Load existing products
    current_data = {"products": [], "similar_products": [], "reviews": [], "review_photos": []}
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, 'r', encoding='utf-8') as f:
                current_data = json.load(f)
        except Exception as e:
            print(f"Warning reading existing data: {e}")

    existing_products = current_data.get("products", [])
    max_id = max([p.get("id", 0) for p in existing_products] or [0])

    imported_products = []
    for idx, row in enumerate(rows):
        raw_id = row.get(norm_map.get('id', 'id'), '')
        p_id = parse_num(raw_id, max_id + idx + 1)
        name = (row.get(norm_map.get('name', 'name'), '') or f"Kitchen Item {p_id}").strip()
        cat = (row.get(norm_map.get('category', 'category'), 'Kitchen') or 'Kitchen').strip()
        brand_raw = row.get(norm_map.get('brand', 'brand'), '')
        brand = clean_brand(name, brand_raw)
        short_name = clean_short_name(name)
        
        sp = parse_num(row.get(norm_map.get('selling_price', 'selling_price'), 499))
        mrp = parse_num(row.get(norm_map.get('mrp', 'mrp'), 0))
        if mrp <= sp:
            mrp = max(sp + 200, int(round(sp * 1.5)))

        discount_percent = int(round((1.0 - (sp / mrp)) * 100)) if mrp > sp else 50
        discount_percent = max(5, min(95, discount_percent))
        deal_price = max(49, sp - 30)

        img_raw = (row.get(norm_map.get('img1', 'img1'), '') or '').strip()
        imgs = [i.strip() for i in re.split(r'[,;\n|]', img_raw) if i.strip()]
        primary_img = imgs[0] if imgs else 'https://cdn.shopify.com/s/files/1/0596/9743/0617/files/81-sJRhEapL._SX679.jpg?v=1713050191'
        all_imgs = imgs if imgs else [primary_img]

        rating_val = str(row.get(norm_map.get('rating', 'rating'), '4.4'))
        rev_val = str(row.get(norm_map.get('review_count', 'review_count'), '1,200'))

        features_html, specs = build_features_and_specs(name, brand, cat, sp, mrp)
        slug = f"{slugify(brand)}-{slugify(name[:20])}-{p_id}"

        prod = {
            "id": p_id,
            "md5_id": slug,
            "name": name,
            "short_name": short_name,
            "brand": brand,
            "category": cat,
            "rating": rating_val,
            "rating_stars": float(re.sub(r'[^0-9.]', '', rating_val) or 4.4),
            "review_count": rev_val,
            "ad": p_id % 5 == 0,
            "authorized_seller": True,
            "discount_label": f"↓ {discount_percent}%",
            "discount_percent": discount_percent,
            "mrp": mrp,
            "selling_price": sp,
            "deal_price": deal_price,
            "badge": "Big Billion Days Price",
            "delivery_text": "Delivery by 11 Oct, Sun",
            "seller_name": "RetailNet",
            "seller_rating": "4.4 ★ • 5 years with Flipkart",
            "img1": primary_img,
            "images": all_imgs,
            "features": features_html,
            "specs": specs,
            "assured": True
        }
        imported_products.append(prod)

    if mode == "append":
        existing_ids = {p.get("id") for p in existing_products}
        for p in imported_products:
            if p["id"] in existing_ids:
                existing_products = [p if ep.get("id") == p["id"] else ep for ep in existing_products]
            else:
                existing_products.append(p)
        final_list = existing_products
    else:
        final_list = imported_products

    current_data["products"] = final_list
    os.makedirs("data", exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(current_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved {len(final_list)} products to {DATA_PATH}!")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/import_csv.py <path_to_csv> [--replace | --append]")
        sys.exit(1)
    csv_file = sys.argv[1]
    import_mode = "replace"
    if len(sys.argv) > 2 and sys.argv[2] == "--append":
        import_mode = "append"
    import_csv(csv_file, import_mode)
