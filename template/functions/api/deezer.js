// functions/api/deezer.js
const express = require('express');
const router = express.Router();

// For now, let's use the built-in fetch if available in Node 18+, or node-fetch
let fetch;
try {
  // Try native fetch first (Node 18+)
  fetch = global.fetch;
} catch (e) {
  // Fall back to node-fetch
  fetch = require('node-fetch');
}

// Deezer API base URL
const DEEZER_BASE_URL = 'https://api.deezer.com';

// Test endpoint - this should work first
router.get('/test', (req, res) => {
  console.log('Deezer test endpoint hit');
  res.json({ 
    success: true, 
    message: 'Deezer router is working',
    timestamp: new Date().toISOString()
  });
});

// Album lookup by UPC - CORRECTED VERSION
router.get('/album/:upc', async (req, res) => {
  console.log('Album endpoint hit with UPC:', req.params.upc);
  
  try {
    const { upc } = req.params;
    const cleanUPC = upc.replace(/[\s-]/g, '');
    
    console.log('Fetching Deezer album for UPC:', cleanUPC);
    
    // Use direct UPC lookup like in the working example
    const albumUrl = `${DEEZER_BASE_URL}/album/upc:${cleanUPC}`;
    console.log('Calling Deezer API:', albumUrl);
    
    const response = await fetch(albumUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Album not found on Deezer for UPC:', cleanUPC);
        
        // Fallback: try search if direct lookup fails
        console.log('Trying search fallback...');
        const searchUrl = `${DEEZER_BASE_URL}/search/album?q=${cleanUPC}`;
        const searchResponse = await fetch(searchUrl);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            // Found via search, get full album details
            const albumId = searchData.data[0].id;
            const albumResponse = await fetch(`${DEEZER_BASE_URL}/album/${albumId}`);
            const album = await albumResponse.json();
            
            console.log('Found album via search:', album.title);
            return res.json({ 
              success: true, 
              album: album,
              method: 'search'
            });
          }
        }
        
        return res.status(404).json({ 
          success: false,
          error: { message: 'Album not found on Deezer' },
          upc: cleanUPC
        });
      }
      throw new Error(`Deezer API error: ${response.status}`);
    }
    
    const album = await response.json();
    
    // Check for API error response
    if (album.error) {
      console.log('Deezer API returned error:', album.error);
      
      // Try search fallback
      console.log('Trying search fallback after error...');
      const searchUrl = `${DEEZER_BASE_URL}/search/album?q=${cleanUPC}`;
      const searchResponse = await fetch(searchUrl);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          const albumId = searchData.data[0].id;
          const albumResponse = await fetch(`${DEEZER_BASE_URL}/album/${albumId}`);
          const fullAlbum = await albumResponse.json();
          
          console.log('Found album via search:', fullAlbum.title);
          return res.json({ 
            success: true, 
            album: fullAlbum,
            method: 'search'
          });
        }
      }
      
      return res.status(404).json({ 
        success: false,
        error: { message: album.error.message || 'Album not found' },
        upc: cleanUPC
      });
    }
    
    console.log('Found album via direct UPC lookup:', album.title);
    
    res.json({ 
      success: true, 
      album: album,
      method: 'direct'
    });
    
  } catch (error) {
    console.error('Error in album endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: { 
        message: 'Failed to fetch album', 
        details: error.message 
      } 
    });
  }
});

// Get album tracks
router.get('/album/:albumId/tracks', async (req, res) => {
  try {
    const { albumId } = req.params;
    const { index = 0, limit = 50 } = req.query;
    
    console.log(`Fetching tracks for album ${albumId}, index: ${index}, limit: ${limit}`);
    
    const response = await fetch(
      `${DEEZER_BASE_URL}/album/${albumId}/tracks?index=${index}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ 
        error: { message: data.error.message } 
      });
    }
    
    res.json(data);
    
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    res.status(500).json({ 
      error: { message: 'Failed to fetch tracks from Deezer' } 
    });
  }
});

// Get track details (with ISRC)
router.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    
    console.log('Fetching track details for ID:', trackId);
    
    const response = await fetch(`${DEEZER_BASE_URL}/track/${trackId}`);
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }
    
    const track = await response.json();
    
    if (track.error) {
      return res.status(400).json({ 
        error: { message: track.error.message } 
      });
    }
    
    res.json(track);
    
  } catch (error) {
    console.error('Error fetching track details:', error);
    res.status(500).json({ 
      error: { message: 'Failed to fetch track details from Deezer' } 
    });
  }
});

// Batch fetch track ISRCs (optimized for rate limiting)
router.post('/tracks/batch-isrc', async (req, res) => {
  try {
    const { trackIds } = req.body;
    
    if (!trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({ 
        error: { message: 'trackIds array is required' } 
      });
    }
    
    console.log(`Batch fetching ISRCs for ${trackIds.length} tracks`);
    
    // Fetch all tracks in parallel (be careful with rate limits)
    const promises = trackIds.map(async (trackId) => {
      try {
        const response = await fetch(`${DEEZER_BASE_URL}/track/${trackId}`);
        if (response.ok) {
          const track = await response.json();
          return {
            id: trackId,
            isrc: track.isrc || null,
            title: track.title
          };
        }
        return { id: trackId, isrc: null };
      } catch (error) {
        console.error(`Failed to fetch track ${trackId}:`, error);
        return { id: trackId, isrc: null };
      }
    });
    
    const results = await Promise.all(promises);
    
    res.json({ tracks: results });
    
  } catch (error) {
    console.error('Error batch fetching ISRCs:', error);
    res.status(500).json({ 
      error: { message: 'Failed to batch fetch ISRCs' } 
    });
  }
});

module.exports = router;