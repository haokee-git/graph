const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const fs = require('fs');

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Endpoint to download the latest Windows installer
app.get('/download', (req, res) => {
  const releaseDir = path.join(__dirname, '../release');
  
  // Check if release directory exists
  if (!fs.existsSync(releaseDir)) {
    return res.status(404).send('Release directory not found. Please build the electron app first.');
  }

  // Find the .exe file
  fs.readdir(releaseDir, (err, files) => {
    if (err) {
      console.error('Error reading release dir:', err);
      return res.status(500).send('Internal Server Error');
    }

    const exeFile = files.find(file => file.endsWith('.exe') && !file.includes('blockmap'));
    
    if (exeFile) {
      const filePath = path.join(releaseDir, exeFile);
      res.download(filePath, exeFile);
    } else {
      res.status(404).send('Installer not found.');
    }
  });
});

// Handle client-side routing, return all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

function startServer(portToUse) {
  return new Promise((resolve, reject) => {
    const server = app.listen(portToUse, () => {
      const address = server.address();
      const actualPort = typeof address === 'string' ? address : address.port;
      console.log(`Server is running on http://localhost:${actualPort}`);
      resolve(actualPort);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer(port).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
