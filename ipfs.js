var fs = require('fs');
const IPFS = require('ipfs-api');
const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });

var imagePath = 'images/NCIDiploma.jpg';

fs.readFile(imagePath, function(err, fileData) {
  if (err) {
    console.error('Error reading image file:', err);
    return;
  }

  // Add the image file to IPFS
  ipfs.add(fileData, (err, ipfsResult) => {
    if (err) {
      console.error('Error adding file to IPFS:', err);
      return;
    }

    if (ipfsResult && ipfsResult[0] && ipfsResult[0].hash) {
      const cid = ipfsResult[0].hash;
      console.log('Image saved to IPFS with CID:', cid);
    } else {
      console.log('Error adding file to IPFS');
    }
  });
});
