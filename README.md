# Filp

Static storefront built from the supplied product catalog. Product data is served from `data/products.json`; product detail pages use the same template and support size selection.

Checkout, account actions and tracking are not included in this public preview. Product photos load from the image URLs stored in the catalog.

## Local preview

From the workspace root, run:

```sh
python3 -m http.server 4174 --directory filp
```

Open `http://127.0.0.1:4174/`.

## GitHub Pages

Publish the `main` branch from the repository root in **Settings → Pages**. The pages and asset links are relative, so the storefront works under the repository path.