const https = require('https');

const testUrl = 'https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1m/BTCUSDT-1m-2024-10.zip.CHECKSUM';

console.log("Fetching: " + testUrl);

https.get(testUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response:", data);
  });
}).on('error', (e) => {
  console.error("Error connecting to Binance:", e.message);
});
