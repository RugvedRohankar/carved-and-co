// The one place that says where purchases happen. Every buy link on the site
// uses this: vite.config.js writes it into index.html wherever %STORE_URL%
// appears, so the links work even before (or without) JavaScript.
export const STORE_URL = 'https://secure.touchnet.net/C21575_ustores/web/product_detail.jsp?PRODUCTID=2404';
