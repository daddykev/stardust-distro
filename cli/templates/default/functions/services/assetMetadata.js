const { onCall, HttpsError } = require('firebase-functions/v2/https');
const axios = require('axios');
const musicMetadata = require('music-metadata');
const sharp = require('sharp');
const admin = require('firebase-admin');

/**
 * Extract detailed metadata from audio files
 */
exports.extractAudioMetadata = onCall({
  timeoutSeconds: 60,
  memory: '512MB',
  cors: true
}, async (request) => {
  // Validate auth
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const { url, fileName, fileSize } = request.data;

  if (!url) {
    throw new HttpsError('invalid-argument', 'URL is required');
  }

  try {
    console.log(`Extracting audio metadata from: ${fileName}`);
    
    // Download the audio file
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    });

    // Parse metadata using music-metadata
    const metadata = await musicMetadata.parseStream(response.data, {
      mimeType: response.headers['content-type'],
      size: fileSize
    });

    // Extract comprehensive metadata
    const audioMetadata = {
      // Format information
      format: {
        container: metadata.format.container || 'unknown',
        codec: metadata.format.codec || metadata.format.container,
        mimeType: metadata.format.mime || response.headers['content-type'],
        lossless: metadata.format.lossless || false,
        numberOfChannels: metadata.format.numberOfChannels || 2,
        channelLayout: metadata.format.numberOfChannels === 1 ? 'mono' : 'stereo',
        sampleRate: metadata.format.sampleRate || null,
        bitrate: metadata.format.bitrate || null,
        bitsPerSample: metadata.format.bitsPerSample || null,
        duration: metadata.format.duration || 0,
        fileSize: fileSize || metadata.format.size || 0
      },
      
      // Common tags (if embedded in file)
      tags: {
        title: metadata.common.title || null,
        artist: metadata.common.artist || null,
        album: metadata.common.album || null,
        albumArtist: metadata.common.albumartist || null,
        year: metadata.common.year || null,
        genre: metadata.common.genre ? metadata.common.genre[0] : null,
        track: metadata.common.track?.no || null,
        disk: metadata.common.disk?.no || null,
        isrc: metadata.common.isrc ? metadata.common.isrc[0] : null,
        bpm: metadata.common.bpm || null,
        comment: metadata.common.comment ? metadata.common.comment[0] : null
      },
      
      // Technical details
      technical: {
        encoder: metadata.format.encoder || null,
        encoderSettings: metadata.format.encoderSettings || null,
        dataFormat: metadata.format.dataformat || null,
        trackGain: metadata.common.replaygain_track_gain?.dB || null,
        trackPeak: metadata.common.replaygain_track_peak?.ratio || null
      },
      
      // Quality assessment
      quality: {
        isHighResolution: (metadata.format.sampleRate || 0) > 44100 || 
                         (metadata.format.bitsPerSample || 0) > 16,
        isLossless: metadata.format.lossless || false,
        compressionRatio: metadata.format.bitrate && fileSize ? 
          ((metadata.format.bitrate * metadata.format.duration) / 8) / fileSize : null
      },
      
      // Extracted timestamp
      extractedAt: admin.firestore.Timestamp.now()
    };

    return audioMetadata;
  } catch (error) {
    console.error('Error extracting audio metadata:', error);
    throw new HttpsError('internal', `Failed to extract audio metadata: ${error.message}`);
  }
});

/**
 * Extract detailed metadata from image files
 */
exports.extractImageMetadata = onCall({
  timeoutSeconds: 30,
  memory: '256MB',
  cors: true
}, async (request) => {
  // Validate auth
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const { url, fileName, fileSize } = request.data;

  if (!url) {
    throw new HttpsError('invalid-argument', 'URL is required');
  }

  try {
    console.log(`Extracting image metadata from: ${fileName}`);
    
    // Download the image file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50MB max for images
    });

    const buffer = Buffer.from(response.data);
    
    // Use sharp to extract metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // Calculate additional properties
    const megapixels = metadata.width && metadata.height ? 
      (metadata.width * metadata.height / 1000000).toFixed(2) : null;
    
    const aspectRatio = metadata.width && metadata.height ? 
      calculateAspectRatio(metadata.width, metadata.height) : null;

    // Extract comprehensive metadata
    const imageMetadata = {
      // Basic properties
      dimensions: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        megapixels: parseFloat(megapixels) || 0,
        aspectRatio: aspectRatio,
        orientation: metadata.orientation || 1
      },
      
      // Format information
      format: {
        format: metadata.format || 'unknown',
        mimeType: `image/${metadata.format}` || response.headers['content-type'],
        space: metadata.space || 'srgb', // Color space
        channels: metadata.channels || 3,
        hasAlpha: metadata.hasAlpha || false,
        hasProfile: metadata.hasProfile || false,
        isProgressive: metadata.isProgressive || false,
        fileSize: fileSize || buffer.length
      },
      
      // Technical details
      technical: {
        density: metadata.density || 72, // DPI
        depth: metadata.depth || 'uchar', // Bit depth
        compression: metadata.compression || null,
        chromaSubsampling: metadata.chromaSubsampling || null,
        interlace: metadata.isProgressive || false,
        palette: metadata.palette || false,
        quality: estimateJpegQuality(metadata) // Estimate for JPEG
      },
      
      // Color statistics
      colorStats: {
        channels: stats.channels.map(channel => ({
          min: channel.min,
          max: channel.max,
          mean: Math.round(channel.mean),
          stdev: Math.round(channel.stdev),
          dominant: Math.round(channel.mean) // Simplified dominant color
        })),
        isMonochrome: stats.isOpaque === false || 
                     (stats.channels.length === 1) ||
                     checkIfGrayscale(stats.channels),
        hasTransparency: metadata.hasAlpha || false
      },
      
      // EXIF data (if available)
      exif: {
        make: metadata.exif?.Make || null,
        model: metadata.exif?.Model || null,
        software: metadata.exif?.Software || null,
        dateTime: metadata.exif?.DateTime || null,
        copyright: metadata.exif?.Copyright || null,
        artist: metadata.exif?.Artist || null
      },
      
      // Quality assessment
      quality: {
        isHighResolution: (metadata.width || 0) >= 3000 && (metadata.height || 0) >= 3000,
        isSquare: metadata.width === metadata.height,
        meetsRequirements: {
          coverArt: (metadata.width || 0) >= 3000 && (metadata.height || 0) >= 3000,
          thumbnail: (metadata.width || 0) >= 200 && (metadata.height || 0) >= 200
        }
      },
      
      // Extracted timestamp
      extractedAt: admin.firestore.Timestamp.now()
    };

    return imageMetadata;
  } catch (error) {
    console.error('Error extracting image metadata:', error);
    throw new HttpsError('internal', `Failed to extract image metadata: ${error.message}`);
  }
});

// Helper functions
function calculateAspectRatio(width, height) {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function checkIfGrayscale(channels) {
  if (channels.length < 3) return true;
  // Check if RGB channels have similar values (grayscale)
  const [r, g, b] = channels;
  const threshold = 5;
  return Math.abs(r.mean - g.mean) < threshold && 
         Math.abs(g.mean - b.mean) < threshold && 
         Math.abs(r.mean - b.mean) < threshold;
}

function estimateJpegQuality(metadata) {
  // Rough estimation based on file size and dimensions
  if (metadata.format !== 'jpeg') return null;
  // This is a simplified estimation
  return metadata.quality || 85;
}