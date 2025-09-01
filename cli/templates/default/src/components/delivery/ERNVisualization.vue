<template>
  <div class="ern-visualization">
    <!-- Controls -->
    <div class="visualization-controls mb-md">
      <div class="flex gap-sm items-center">
        <button @click="zoomIn" class="btn btn-sm btn-secondary">
          <font-awesome-icon icon="search-plus" />
        </button>
        <button @click="zoomOut" class="btn btn-sm btn-secondary">
          <font-awesome-icon icon="search-minus" />
        </button>
        <button @click="resetZoom" class="btn btn-sm btn-secondary">
          <font-awesome-icon icon="expand" />
          Reset
        </button>
        <div class="ml-auto flex gap-sm">
          <label class="flex items-center gap-xs">
            <input 
              type="checkbox" 
              v-model="showAttributes" 
              @change="updateVisualization"
            />
            <span class="text-sm">Show Attributes</span>
          </label>
          <label class="flex items-center gap-xs">
            <input 
              type="checkbox" 
              v-model="collapseEmpty" 
              @change="updateVisualization"
            />
            <span class="text-sm">Collapse Empty</span>
          </label>
        </div>
      </div>
    </div>

    <!-- SVG Container -->
    <div ref="svgContainer" class="visualization-container">
      <svg ref="svgElement"></svg>
    </div>

    <!-- Node Details Panel -->
    <div v-if="selectedNode" class="node-details mt-md p-md rounded-lg">
      <h4 class="font-semibold mb-sm">{{ selectedNode.data.name }}</h4>
      <div v-if="selectedNode.data.value" class="mb-sm">
        <span class="text-sm text-secondary">Value:</span>
        <span class="text-sm ml-sm">{{ selectedNode.data.value }}</span>
      </div>
      <div v-if="selectedNode.data.attributes && Object.keys(selectedNode.data.attributes).length > 0">
        <span class="text-sm text-secondary">Attributes:</span>
        <div class="mt-xs">
          <div 
            v-for="(value, key) in selectedNode.data.attributes" 
            :key="key"
            class="text-sm ml-md"
          >
            <span class="text-secondary">{{ key }}:</span> {{ value }}
          </div>
        </div>
      </div>
      <div class="mt-sm text-xs text-secondary">
        Path: {{ getNodePath(selectedNode) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  xmlContent: {
    type: String,
    required: true
  }
});

// Refs
const svgContainer = ref(null);
const svgElement = ref(null);
const selectedNode = ref(null);
const showAttributes = ref(false);
const collapseEmpty = ref(true);

// D3 variables
let svg = null;
let g = null;
let zoom = null;
let tree = null;
let root = null;

// Parse XML to hierarchical data
function parseXMLToHierarchy(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    console.error('XML parsing error:', parserError.textContent);
    return null;
  }
  
  function xmlNodeToData(xmlNode) {
    const data = {
      name: xmlNode.nodeName,
      attributes: {},
      children: []
    };
    
    // Get attributes
    if (xmlNode.attributes && showAttributes.value) {
      for (let attr of xmlNode.attributes) {
        data.attributes[attr.name] = attr.value;
      }
    }
    
    // Get text content if it's a leaf node
    if (xmlNode.childNodes.length === 1 && xmlNode.childNodes[0].nodeType === 3) {
      const textContent = xmlNode.textContent.trim();
      if (textContent) {
        data.value = textContent.length > 50 
          ? textContent.substring(0, 47) + '...' 
          : textContent;
      }
    }
    
    // Process children
    for (let child of xmlNode.childNodes) {
      if (child.nodeType === 1) { // Element nodes only
        const childData = xmlNodeToData(child);
        if (!collapseEmpty.value || childData.children.length > 0 || childData.value) {
          data.children.push(childData);
        }
      }
    }
    
    return data;
  }
  
  return xmlNodeToData(xmlDoc.documentElement);
}

// Initialize visualization
function initVisualization() {
  if (!svgContainer.value) return;
  
  const container = svgContainer.value;
  const width = container.clientWidth;
  const height = 600;
  
  // Clear existing
  d3.select(svgElement.value).selectAll('*').remove();
  
  // Setup SVG - no background, let modal handle it
  svg = d3.select(svgElement.value)
    .attr('width', width)
    .attr('height', height);
  
  // Create group for zoom
  g = svg.append('g');
  
  // Setup zoom behavior
  zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  
  svg.call(zoom);
  
  // Parse XML and create hierarchy
  const hierarchyData = parseXMLToHierarchy(props.xmlContent);
  if (!hierarchyData) return;
  
  // Create tree layout
  tree = d3.tree()
    .size([height - 100, width - 400]) // Increase horizontal spacing from 300 to 400
    .separation((a, b) => (a.parent === b.parent ? 1.5 : 2)) // Add separation function for better spacing

  // Create hierarchy
  root = d3.hierarchy(hierarchyData);
  
  // Generate tree
  tree(root);
  
  // Transform nodes for horizontal layout (left to right)
  root.descendants().forEach(d => {
    const temp = d.x;
    d.x = d.y + 150;
    d.y = temp + 50;
  });
  
  // Draw links - use currentColor which inherits from CSS
  const link = g.selectAll('.link')
    .data(root.links())
    .enter().append('path')
    .attr('class', 'tree-link')
    .attr('d', d3.linkHorizontal()
      .x(d => d.x)
      .y(d => d.y));
  
  // Draw nodes
  const node = g.selectAll('.node')
    .data(root.descendants())
    .enter().append('g')
    .attr('class', d => 'tree-node' + (d.children ? ' tree-node--internal' : ' tree-node--leaf'))
    .attr('transform', d => `translate(${d.x},${d.y})`);
  
  // Add circles for nodes
  node.append('circle')
    .attr('class', d => d.children ? 'node-circle-parent' : 'node-circle-leaf')
    .attr('r', 5)
    .on('click', (event, d) => {
      event.stopPropagation();
      selectedNode.value = d;
    });
  
  // Add simple text labels
  node.append('text')
    .attr('class', 'node-label')
    .attr('dy', '.35em')
    .attr('x', d => d.children ? -10 : 10)
    .style('text-anchor', d => d.children ? 'end' : 'start')
    .text(d => {
      let label = d.data.name;
      if (d.data.value && !d.children) {
        const shortValue = d.data.value.length > 30 
          ? d.data.value.substring(0, 27) + '...'
          : d.data.value;
        label += `: ${shortValue}`;
      }
      return label;
    });
  
  // Add hover effect
  node.on('mouseover', function(event, d) {
    d3.select(this).select('circle')
      .classed('hover', true);
      
    // Highlight path to root
    let current = d;
    while (current.parent) {
      g.selectAll('.tree-link')
        .filter(link => link.source === current.parent && link.target === current)
        .classed('link-highlight', true);
      current = current.parent;
    }
  })
  .on('mouseout', function(event, d) {
    d3.select(this).select('circle')
      .classed('hover', false);
      
    // Reset link styles
    g.selectAll('.tree-link')
      .classed('link-highlight', false);
  });
  
  // Initial zoom to fit
  setTimeout(() => fitToScreen(), 100);
}

// Zoom controls
function zoomIn() {
  if (svg && zoom) {
    svg.transition().duration(300).call(zoom.scaleBy, 1.3);
  }
}

function zoomOut() {
  if (svg && zoom) {
    svg.transition().duration(300).call(zoom.scaleBy, 0.7);
  }
}

function resetZoom() {
  fitToScreen();
}

function fitToScreen() {
  if (!svg || !g || !g.node()) return;
  
  const bounds = g.node().getBBox();
  const width = svgContainer.value.clientWidth;
  const height = 600;
  const fullWidth = bounds.width;
  const fullHeight = bounds.height;
  const midX = bounds.x + fullWidth / 2;
  const midY = bounds.y + fullHeight / 2;
  
  const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
  const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
  
  svg.transition()
    .duration(500)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
}

function updateVisualization() {
  initVisualization();
}

function getNodePath(node) {
  const path = [];
  let current = node;
  while (current) {
    path.unshift(current.data.name);
    current = current.parent;
  }
  return path.join(' > ');
}

// Handle resize
function handleResize() {
  if (svgElement.value) {
    initVisualization();
  }
}

// Lifecycle
onMounted(() => {
  initVisualization();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

// Watch for XML content changes
watch(() => props.xmlContent, () => {
  initVisualization();
});
</script>

<style scoped>
.ern-visualization {
  width: 100%;
}

.visualization-container {
  width: 100%;
  height: 600px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  /* Add solid background */
  background: var(--color-surface);
}

.visualization-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.node-details {
  max-width: 600px;
  word-break: break-word;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.visualization-controls input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

/* D3 Tree Styles with better contrast */
:deep(.tree-link) {
  fill: none;
  stroke: var(--color-border-dark);
  stroke-width: 2px;
  opacity: 0.6;
}

:deep(.tree-link.link-highlight) {
  stroke: var(--color-primary);
  stroke-width: 3px;
  opacity: 1;
}

:deep(.node-circle-parent) {
  fill: var(--color-primary);
  stroke: var(--color-surface);
  stroke-width: 3px;
  cursor: pointer;
}

:deep(.node-circle-leaf) {
  fill: var(--color-success);
  stroke: var(--color-surface);
  stroke-width: 3px;
  cursor: pointer;
}

:deep(.node-circle-parent.hover),
:deep(.node-circle-leaf.hover) {
  r: 8;
  stroke-width: 4px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:deep(.node-label) {
  font-size: 13px;
  font-weight: 600;
  fill: var(--color-text);
  pointer-events: none;
  /* Add text shadow for better readability */
  text-shadow: 0 0 3px var(--color-surface), 0 0 6px var(--color-surface);
}

:deep(.tree-node) {
  transition: all 0.2s ease;
}
</style>