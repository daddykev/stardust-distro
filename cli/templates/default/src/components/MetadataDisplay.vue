<script setup>
import { computed } from 'vue'
import metadataService from '../services/assetMetadata'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['audio', 'image'].includes(value)
  },
  metadata: {
    type: Object,
    default: null
  },
  showRequirements: {
    type: Boolean,
    default: false
  }
})

// Computed properties
const qualityBadge = computed(() => {
  if (props.type === 'audio') {
    return metadataService.getAudioQualityBadge(props.metadata)
  }
  return { text: 'Unknown', color: 'gray' }
})

const imageQualityBadge = computed(() => {
  if (props.type === 'image') {
    return metadataService.getImageQualityBadge(props.metadata)
  }
  return { text: 'Unknown', color: 'gray' }
})

const hasEmbeddedTags = computed(() => {
  if (!props.metadata?.tags) return false
  return Object.values(props.metadata.tags).some(v => v !== null)
})

// Format helpers
const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = metadataService.formatFileSize
const formatBitrate = metadataService.formatBitrate
const formatSampleRate = metadataService.formatSampleRate
</script>

<template>
  <div class="metadata-display">
    <!-- Audio Metadata Display -->
    <div v-if="type === 'audio' && metadata" class="metadata-section">
      <h4 class="metadata-title">
        <font-awesome-icon icon="music" />
        Audio File Information
      </h4>
      
      <div class="quality-badge" :class="`badge-${qualityBadge.color}`">
        {{ qualityBadge.text }}
      </div>
      
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="label">Format:</span>
          <span class="value">{{ metadata.format?.codec || 'Unknown' }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Duration:</span>
          <span class="value">{{ formatDuration(metadata.format?.duration) }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Bitrate:</span>
          <span class="value">{{ formatBitrate(metadata.format?.bitrate) }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Sample Rate:</span>
          <span class="value">{{ formatSampleRate(metadata.format?.sampleRate) }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Channels:</span>
          <span class="value">{{ metadata.format?.channelLayout || 'Unknown' }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">File Size:</span>
          <span class="value">{{ formatFileSize(metadata.format?.fileSize) }}</span>
        </div>
        
        <div class="metadata-item" v-if="metadata.format?.lossless !== undefined">
          <span class="label">Quality:</span>
          <span class="value">
            {{ metadata.format.lossless ? 'Lossless' : 'Lossy' }}
            <span v-if="metadata.quality?.isHighResolution" class="hi-res-badge">
              Hi-Res
            </span>
          </span>
        </div>
        
        <div class="metadata-item" v-if="metadata.format?.bitsPerSample">
          <span class="label">Bit Depth:</span>
          <span class="value">{{ metadata.format.bitsPerSample }}-bit</span>
        </div>
      </div>
      
      <!-- Embedded tags if present -->
      <div v-if="metadata.tags && hasEmbeddedTags" class="embedded-tags">
        <h5>Embedded Metadata</h5>
        <div class="tags-grid">
          <div v-if="metadata.tags.title" class="tag-item">
            <span class="label">Title:</span> {{ metadata.tags.title }}
          </div>
          <div v-if="metadata.tags.artist" class="tag-item">
            <span class="label">Artist:</span> {{ metadata.tags.artist }}
          </div>
          <div v-if="metadata.tags.album" class="tag-item">
            <span class="label">Album:</span> {{ metadata.tags.album }}
          </div>
          <div v-if="metadata.tags.isrc" class="tag-item">
            <span class="label">ISRC:</span> {{ metadata.tags.isrc }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Image Metadata Display -->
    <div v-else-if="type === 'image' && metadata" class="metadata-section">
      <h4 class="metadata-title">
        <font-awesome-icon icon="image" />
        Image File Information
      </h4>
      
      <div class="quality-badge" :class="`badge-${imageQualityBadge.color}`">
        {{ imageQualityBadge.text }}
      </div>
      
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="label">Dimensions:</span>
          <span class="value">
            {{ metadata.dimensions?.width }} × {{ metadata.dimensions?.height }}
            <span class="text-secondary">({{ metadata.dimensions?.megapixels }} MP)</span>
          </span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Format:</span>
          <span class="value">{{ metadata.format?.format?.toUpperCase() || 'Unknown' }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Color Space:</span>
          <span class="value">{{ metadata.format?.space?.toUpperCase() || 'Unknown' }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">File Size:</span>
          <span class="value">{{ formatFileSize(metadata.format?.fileSize) }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">DPI:</span>
          <span class="value">{{ metadata.technical?.density || 72 }}</span>
        </div>
        
        <div class="metadata-item">
          <span class="label">Aspect Ratio:</span>
          <span class="value">{{ metadata.dimensions?.aspectRatio || 'Unknown' }}</span>
        </div>
        
        <div class="metadata-item" v-if="metadata.format?.hasAlpha !== undefined">
          <span class="label">Transparency:</span>
          <span class="value">{{ metadata.format.hasAlpha ? 'Yes' : 'No' }}</span>
        </div>
        
        <div class="metadata-item" v-if="metadata.technical?.compression">
          <span class="label">Compression:</span>
          <span class="value">{{ metadata.technical.compression }}</span>
        </div>
      </div>
      
      <!-- Requirements Check -->
      <div v-if="showRequirements" class="requirements-check">
        <h5>Requirements Check</h5>
        <div class="requirement-item" :class="{ met: metadata.quality?.meetsRequirements?.coverArt }">
          <font-awesome-icon :icon="metadata.quality?.meetsRequirements?.coverArt ? 'check-circle' : 'times-circle'" />
          Cover Art (3000×3000 minimum)
        </div>
        <div class="requirement-item" :class="{ met: metadata.quality?.meetsRequirements?.thumbnail }">
          <font-awesome-icon :icon="metadata.quality?.meetsRequirements?.thumbnail ? 'check-circle' : 'times-circle'" />
          Thumbnail (200×200 minimum)
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metadata-display {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.metadata-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.quality-badge {
  display: inline-flex;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--space-md);
}

.badge-green {
  background-color: var(--color-success);
  color: white;
}

.badge-blue {
  background-color: var(--color-info);
  color: white;
}

.badge-purple {
  background-color: #8b5cf6;
  color: white;
}

.badge-yellow {
  background-color: var(--color-warning);
  color: var(--color-text);
}

.badge-orange {
  background-color: #f97316;
  color: white;
}

.badge-red {
  background-color: var(--color-error);
  color: white;
}

.badge-gray {
  background-color: var(--color-text-tertiary);
  color: white;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.metadata-item .label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.metadata-item .value {
  font-size: var(--text-base);
  color: var(--color-text);
}

.hi-res-badge {
  display: inline-block;
  padding: 2px 6px;
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  margin-left: var(--space-xs);
}

.embedded-tags {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.embedded-tags h5 {
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
  font-size: var(--text-sm);
}

.tag-item {
  display: flex;
  gap: var(--space-xs);
}

.tag-item .label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.requirements-check {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.requirements-check h5 {
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  color: var(--color-text-tertiary);
}

.requirement-item.met {
  color: var(--color-success);
}

.requirement-item svg {
  font-size: var(--text-lg);
}
</style>