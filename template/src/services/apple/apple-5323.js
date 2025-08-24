// services/apple/apple-5323.js
import { create } from 'xmlbuilder2'

/**
 * Apple Music Package Builder - Spec 5.3.23
 * Generates Apple's proprietary XML format for music delivery
 */
export class Apple5323Builder {
  constructor() {
    this.version = '5.3.23'
    this.namespace = 'http://apple.com/itunes/importer'
    this.schemaVersion = '5.3'
  }

  /**
   * Build Apple Music package XML
   */
  buildPackage(data, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Root package element
    const pkg = doc.ele('package', {
      'xmlns': this.namespace,
      'version': this.schemaVersion
    })
    
    // Add provider info
    this.buildProvider(pkg, config)
    
    // Add metadata section
    this.buildMetadata(pkg, data, config)
    
    // Add assets section
    this.buildAssets(pkg, data)
    
    // Add products section (album/tracks)
    this.buildProducts(pkg, data, config)
    
    return doc.end({ prettyPrint: true })
  }

  /**
   * Build provider section
   */
  buildProvider(parent, config) {
    parent.ele('provider').txt(config.provider)
    
    if (config.teamId) {
      parent.ele('team_id').txt(config.teamId)
    }
  }

  /**
   * Build metadata section
   */
  buildMetadata(parent, data, config) {
    const metadata = parent.ele('metadata')
    
    // Vendor identifier (usually UPC)
    metadata.ele('vendor_id').txt(data.vendorId)
    
    // UPC
    if (data.upc) {
      metadata.ele('upc').txt(data.upc)
    }
    
    // Grid (if available)
    if (data.grid) {
      metadata.ele('grid').txt(data.grid)
    }
    
    // Product type (A=Album, S=Single, E=EP)
    metadata.ele('product_type').txt(data.product_type)
    
    // Album metadata
    metadata.ele('title').txt(data.albumTitle)
    metadata.ele('artist').txt(data.albumArtist)
    metadata.ele('label').txt(data.label)
    
    // Genre
    const genre = metadata.ele('genre')
    genre.ele('genre_id').txt(String(data.genre.id))
    genre.ele('genre').txt(data.genre.name)
    
    // Release dates
    metadata.ele('release_date').txt(data.releaseDate)
    
    if (data.originalReleaseDate && data.originalReleaseDate !== data.releaseDate) {
      metadata.ele('original_release_date').txt(data.originalReleaseDate)
    }
    
    // Copyright
    metadata.ele('copyright_pline').txt(data.copyrightPline)
    metadata.ele('copyright_cline').txt(data.copyrightCline)
    
    // Parental advisory
    if (data.explicit) {
      metadata.ele('explicit').txt('explicit')
    } else if (data.clean) {
      metadata.ele('explicit').txt('clean')
    }
    
    // Volume and track counts
    metadata.ele('volume_count').txt(String(data.volume_count))
    metadata.ele('track_count').txt(String(data.track_count))
    
    // Compilation flag
    if (data.compilation) {
      metadata.ele('compilation').txt('true')
    }
    
    // Language
    metadata.ele('language').txt(data.language)
    
    // Sales information
    metadata.ele('sales_start_date').txt(data.salesStartDate)
    
    if (data.preorderDate) {
      metadata.ele('preorder_date').txt(data.preorderDate)
    }
    
    // Territories
    const territories = metadata.ele('territories')
    data.territories.forEach(territory => {
      territories.ele('territory').txt(territory)
    })
    
    // Excluded territories (if any)
    if (data.excludedTerritories && data.excludedTerritories.length > 0) {
      const excludedTerritories = metadata.ele('excluded_territories')
      data.excludedTerritories.forEach(territory => {
        excludedTerritories.ele('territory').txt(territory)
      })
    }
    
    // Pricing
    if (data.priceTier) {
      metadata.ele('price_tier').txt(data.priceTier)
    }
    
    if (data.wholesalePriceTier) {
      metadata.ele('wholesale_price_tier').txt(data.wholesalePriceTier)
    }
    
    // Additional URLs
    if (data.labelUrl) {
      metadata.ele('label_url').txt(data.labelUrl)
    }
    
    if (data.primaryArtistUrl) {
      metadata.ele('primary_artist_url').txt(data.primaryArtistUrl)
    }
    
    // Notes
    if (data.notes) {
      metadata.ele('notes').txt(data.notes)
    }
    
    // Tracks
    data.tracks.forEach(track => {
      this.buildTrackMetadata(metadata, track)
    })
  }

  /**
   * Build track metadata
   */
  buildTrackMetadata(parent, track) {
    const trackElem = parent.ele('track')
    
    trackElem.ele('track_number').txt(String(track.trackNumber))
    
    if (track.volumeNumber > 1) {
      trackElem.ele('volume_number').txt(String(track.volumeNumber))
    }
    
    trackElem.ele('title').txt(track.title)
    
    // Track artist (if different from album artist)
    if (track.artist) {
      trackElem.ele('artist').txt(track.artist)
    }
    
    // ISRC
    trackElem.ele('isrc').txt(track.isrc)
    
    // Duration in milliseconds
    const durationMs = Math.round(track.duration * 1000)
    trackElem.ele('duration').txt(String(durationMs))
    
    // Genre (if different from album)
    if (track.genre) {
      const genre = trackElem.ele('genre')
      genre.ele('genre_id').txt(String(track.genre.id || 14))
      genre.ele('genre').txt(track.genre.name || track.genre)
    }
    
    // Explicit content
    if (track.explicit) {
      trackElem.ele('explicit').txt('explicit')
    }
    
    // Preview times (in milliseconds)
    if (track.previewStart !== undefined) {
      trackElem.ele('preview_start').txt(String(track.previewStart * 1000))
      trackElem.ele('preview_duration').txt(String((track.previewDuration || 30) * 1000))
    }
    
    // Classical music metadata
    if (track.work_name) {
      trackElem.ele('work_name').txt(track.work_name)
    }
    
    if (track.movement_number) {
      trackElem.ele('movement_number').txt(String(track.movement_number))
    }
    
    if (track.movement_name) {
      trackElem.ele('movement_name').txt(track.movement_name)
    }
    
    // Contributors
    if (track.composer) {
      trackElem.ele('composer').txt(track.composer)
    }
    
    if (track.lyricist) {
      trackElem.ele('lyricist').txt(track.lyricist)
    }
    
    if (track.producer) {
      trackElem.ele('producer').txt(track.producer)
    }
    
    if (track.mixer) {
      trackElem.ele('mixer').txt(track.mixer)
    }
    
    if (track.publisher) {
      trackElem.ele('publisher').txt(track.publisher)
    }
    
    // P-line for track
    if (track.pline) {
      trackElem.ele('pline').txt(track.pline)
    }
    
    // Record label for track (if different from album)
    if (track.recordLabel) {
      trackElem.ele('record_label').txt(track.recordLabel)
    }
    
    // Language
    if (track.trackLanguage) {
      trackElem.ele('language').txt(track.trackLanguage)
    }
    
    // Audio file reference
    const audioFile = trackElem.ele('audio_file')
    audioFile.ele('file_name').txt(track.fileName)
    audioFile.ele('checksum', { 'type': 'md5' }).txt(track.checksum || '')
  }

  /**
   * Build assets section
   */
  buildAssets(parent, data) {
    const assets = parent.ele('assets')
    
    // Cover art asset
    const coverArt = assets.ele('asset', { 'type': 'image' })
    coverArt.ele('data_file')
      .ele('file_name').txt(data.coverArtFileName)
      .up()
      .ele('checksum', { 'type': 'md5' }).txt(data.coverArtChecksum || '')
    
    coverArt.ele('artwork_type').txt('cover_art')
    
    // For each track, reference its audio file
    data.tracks.forEach(track => {
      const audioAsset = assets.ele('asset', { 'type': 'audio' })
      audioAsset.ele('data_file')
        .ele('file_name').txt(track.fileName)
        .up()
        .ele('checksum', { 'type': 'md5' }).txt(track.checksum || '')
      
      audioAsset.ele('track_reference')
        .ele('track_number').txt(String(track.trackNumber))
        .up()
        .ele('volume_number').txt(String(track.volumeNumber || 1))
    })
  }

  /**
   * Build products section
   */
  buildProducts(parent, data, config) {
    const products = parent.ele('products')
    
    const product = products.ele('product')
    
    // Product reference (vendor_id)
    product.ele('vendor_id').txt(data.vendorId)
    
    // Product type
    product.ele('type').txt(data.product_type === 'S' ? 'single' : 'album')
    
    // Title and artist
    product.ele('title').txt(data.albumTitle)
    product.ele('artist').txt(data.albumArtist)
    
    // Cleared for sale
    if (config.clearance !== false) {
      product.ele('cleared_for_sale').txt('true')
    }
    
    // iTunes-specific elements
    if (config.itunesKind) {
      product.ele('itunes_kind').txt(config.itunesKind)
    }
    
    // Download and streaming permissions
    product.ele('allow_download').txt(String(config.allowDownload !== false))
    product.ele('allow_stream').txt(String(config.allowStream !== false))
    
    // Tracks reference
    const tracksElem = product.ele('tracks')
    data.tracks.forEach(track => {
      const trackRef = tracksElem.ele('track')
      trackRef.ele('track_number').txt(String(track.trackNumber))
      
      if (track.volumeNumber > 1) {
        trackRef.ele('volume_number').txt(String(track.volumeNumber))
      }
    })
    
    // Complete album requirement
    if (config.completeAlbum !== false && data.product_type === 'A') {
      product.ele('complete_album').txt('true')
    }
  }
}