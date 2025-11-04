import { Router } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

// Media routes are public for audio files (authentication handled at chat level)
// router.use(authMiddleware);

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  region: process.env['DO_SPACES_REGION'] || 'sfo3',
  endpoint: process.env['DO_SPACES_ENDPOINT'] || 'https://sfo3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env['DO_SPACES_ACCESS_KEY']!,
    secretAccessKey: process.env['DO_SPACES_SECRET_KEY']!,
  },
});

// HEAD /api/media/audio/* - Existence check for audio files
router.head('/audio/*', async (req, res) => {
  const startTime = Date.now();
  try {
    const filePath = (req.params as any)[0];
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Request received for filePath:`, filePath);
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Full request URL:`, req.originalUrl);
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Request headers:`, req.headers);

    if (!filePath) {
      console.error(`[MediaRoutes:HEAD] [${new Date().toISOString()}] No filePath provided`);
      res.status(400).json({
        success: false,
        message: 'File path is required'
      });
      return;
    }

    const s3Key = `incoming/audio/${filePath}`;
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] S3 key constructed:`, s3Key);
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] DO_SPACES_BUCKET:`, process.env['DO_SPACES_BUCKET']);
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] DO_SPACES_REGION:`, process.env['DO_SPACES_REGION']);

    // Get the object metadata from Spaces
    const command = new GetObjectCommand({
      Bucket: process.env['DO_SPACES_BUCKET']!,
      Key: s3Key,
    });

    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Sending GetObjectCommand to S3`);
    const response = await s3Client.send(command);
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] S3 response received:`, {
      hasBody: !!response.Body,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag
    });

    if (!response.Body) {
      console.error(`[MediaRoutes:HEAD] [${new Date().toISOString()}] No body in S3 response for key:`, s3Key);
      res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
      return;
    }

    const fileName = filePath.toLowerCase();
    let contentType = response.ContentType;
    
    // 🔧 CORREÇÃO: Arquivos .bin são áudios OGG/MP3 salvos com extensão errada
    // Forçar Content-Type correto para que o navegador possa reproduzir
    if (!contentType || contentType === 'application/octet-stream') {
      if (fileName.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (fileName.endsWith('.ogg')) {
        contentType = 'audio/ogg';
      } else if (fileName.endsWith('.wav')) {
        contentType = 'audio/wav';
      } else if (fileName.endsWith('.bin')) {
        // Arquivos .bin na pasta audio/ são áudios OGG
        contentType = 'audio/ogg';
        console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] ⚠️ Arquivo .bin detectado, forçando audio/ogg`);
      } else {
        contentType = 'audio/mpeg';
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    const processingTime = Date.now() - startTime;
    console.log(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Successfully processed HEAD request for ${filePath} in ${processingTime}ms`);
    // No body for HEAD
    res.status(200).end();
    return;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Error fetching audio (HEAD) from Spaces after ${processingTime}ms:`, error);
    console.error(`[MediaRoutes:HEAD] [${new Date().toISOString()}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code,
      statusCode: (error as any)?.statusCode,
      stack: error instanceof Error ? error.stack : 'No stack'
    });

    // Return 404 for any error to indicate file not available
    res.status(404).end();
    return;
  }
});

// GET /api/media/audio/* - Proxy audio files from DigitalOcean Spaces
router.get('/audio/*', async (req, res) => {
  try {
    const filePath = (req.params as any)[0]; // Gets the wildcard part

    if (!filePath) {
      res.status(400).json({
        success: false,
        message: 'File path is required'
      });
      return;
    }

    // Get the object from Spaces
    const command = new GetObjectCommand({
      Bucket: process.env['DO_SPACES_BUCKET']!,
      Key: `incoming/audio/${filePath}`,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      res.status(404).json({
        success: false,
        message: 'Audio file not found'
      });
      return;
    }

    // Set appropriate headers
    const fileName = filePath.toLowerCase();
    let contentType = response.ContentType;
    
    // Fix for .bin files that should be audio/ogg
    if (fileName.endsWith('.bin') && (contentType === 'application/octet-stream' || !contentType)) {
      contentType = 'audio/ogg';
      console.log(`[MediaRoutes:GET] ⚠️ Arquivo .bin detectado, forçando audio/ogg: ${filePath}`);
    } else if (!contentType || contentType === 'application/octet-stream') {
      // Fallback to extension-based detection
      if (fileName.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (fileName.endsWith('.ogg')) {
        contentType = 'audio/ogg';
      } else if (fileName.endsWith('.wav')) {
        contentType = 'audio/wav';
      } else {
        contentType = 'audio/mpeg'; // Default to MP3
      }
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for audio
    res.setHeader('Access-Control-Allow-Headers', 'Range'); // Allow range requests for audio

    // Stream the file
    (response.Body as any).pipe(res);
    return;
  } catch (error) {
    console.error('Error fetching audio from Spaces:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audio file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export { router as mediaRoutes };