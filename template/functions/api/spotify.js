// functions/api/spotify.js
const express = require('express');
const router = express.Router();

// Use process.env directly (new Firebase standard)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Validate on startup
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('⚠️ Spotify credentials not found in environment variables!');
  console.error('Please create a .env file in the functions directory with:');
  console.error('SPOTIFY_CLIENT_ID=your_client_id');
  console.error('SPOTIFY_CLIENT_SECRET=your_client_secret');
}

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

let fetch;
try {
  fetch = global.fetch;
} catch (e) {
  fetch = require('node-fetch');
}

// Cache for Spotify access token
let spotifyToken = null;
let tokenExpiry = null;

/**
 * Get Spotify access token (Client Credentials flow)
 */
async function getSpotifyToken() {
  // Check if we have a valid cached token
  if (spotifyToken && tokenExpiry && new Date() < tokenExpiry) {
    return spotifyToken;
  }

  console.log('Fetching new Spotify access token...');
  
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.status}`);
  }

  const data = await response.json();
  
  // Cache the token
  spotifyToken = data.access_token;
  tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // Subtract 1 minute for safety
  
  console.log('Spotify token obtained, expires at:', tokenExpiry);
  
  return spotifyToken;
}

/**
 * Test endpoint
 */
router.get('/test', (req, res) => {
  console.log('Spotify test endpoint hit');
  res.json({ 
    success: true, 
    message: 'Spotify router is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * Search for album by UPC
 */
router.get('/album/:upc', async (req, res) => {
  console.log('Spotify album endpoint hit with UPC:', req.params.upc);
  
  try {
    const { upc } = req.params;
    const cleanUPC = upc.replace(/[\s-]/g, '');
    
    // Get access token
    const token = await getSpotifyToken();
    
    console.log('Searching Spotify for UPC:', cleanUPC);
    
    // Search for album by UPC
    const searchUrl = `${SPOTIFY_API_BASE}/search?q=upc:${cleanUPC}&type=album&limit=1`;
    console.log('Calling Spotify API:', searchUrl);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Spotify search error:', searchResponse.status, errorText);
      throw new Error(`Spotify API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.albums || !searchData.albums.items || searchData.albums.items.length === 0) {
      console.log('Album not found on Spotify for UPC:', cleanUPC);
      return res.status(404).json({ 
        success: false,
        error: { message: 'Album not found on Spotify' },
        upc: cleanUPC
      });
    }
    
    // Get the album
    const album = searchData.albums.items[0];
    console.log('Found album on Spotify:', album.name, 'ID:', album.id);
    
    // Get full album details with tracks
    const albumUrl = `${SPOTIFY_API_BASE}/albums/${album.id}`;
    const albumResponse = await fetch(albumUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!albumResponse.ok) {
      throw new Error(`Failed to get album details: ${albumResponse.status}`);
    }
    
    const fullAlbum = await albumResponse.json();
    
    // Get track details with ISRCs (Spotify includes ISRCs in track details)
    const trackIds = fullAlbum.tracks.items.map(t => t.id).join(',');
    const tracksUrl = `${SPOTIFY_API_BASE}/tracks?ids=${trackIds}`;
    console.log('Fetching track details for ISRCs...');
    
    const tracksResponse = await fetch(tracksUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!tracksResponse.ok) {
      console.error('Failed to get track details');
      // Continue without ISRCs if this fails
      fullAlbum.tracks_with_isrc = fullAlbum.tracks.items;
    } else {
      const tracksData = await tracksResponse.json();
      fullAlbum.tracks_with_isrc = tracksData.tracks;
      
      // Log ISRCs found
      const isrcCount = tracksData.tracks.filter(t => t.external_ids?.isrc).length;
      console.log(`Found ISRCs for ${isrcCount}/${tracksData.tracks.length} tracks`);
    }
    
    console.log('Successfully fetched Spotify album:', fullAlbum.name);
    
    res.json({ 
      success: true, 
      album: fullAlbum
    });
    
  } catch (error) {
    console.error('Error in Spotify album endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: { 
        message: 'Failed to fetch album from Spotify', 
        details: error.message 
      } 
    });
  }
});

/**
 * Get track by ID (includes ISRC)
 */
router.get('/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    const token = await getSpotifyToken();
    
    console.log('Fetching Spotify track:', trackId);
    
    const response = await fetch(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const track = await response.json();
    
    res.json({ 
      success: true,
      track 
    });
    
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ 
      success: false,
      error: { message: 'Failed to fetch track from Spotify' } 
    });
  }
});

module.exports = router;