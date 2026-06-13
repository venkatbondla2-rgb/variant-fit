const { Jimp } = require('jimp');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo.png');
const out192 = path.join(__dirname, '../public/icon-192.png');
const out512 = path.join(__dirname, '../public/icon-512.png');
const outIcon = path.join(__dirname, '../src/app/icon.png');

Jimp.read(inputPath).then(image => {
  // Autocrop borders
  image.autocrop();

  // Resize and write using Jimp v1 format object parameter
  const task192 = image.clone().resize({ w: 192, h: 192 }).write(out192);
  const task512 = image.clone().resize({ w: 512, h: 512 }).write(out512);
  const taskIcon = image.clone().resize({ w: 32, h: 32 }).write(outIcon);

  console.log("Successfully generated all transparent PWA icons from public/logo.png!");
}).catch(err => {
  console.error("Jimp error:", err);
});
