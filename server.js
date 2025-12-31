const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_PREMIUM) },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

const storageRoutes = require('./routes/storageRoutes');
app.use('/api/storage', storageRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'VaguadaCloud Storage',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor de almacenamiento ejecutándose en puerto ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}`);
});