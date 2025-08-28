# Genre Mapping Guide 🎼

Master the art of genre classification and mapping across different DSP taxonomies in Stardust Distro.

## Understanding Genre Mapping

### The Challenge

Every DSP uses different genre systems:
- **Apple Music**: 200+ genres in hierarchical structure
- **Spotify**: Mood and style-based categorization
- **Beatport**: Electronic music focused with 40+ subgenres
- **Amazon Music**: Simplified category system

### The Solution

Stardust Distro's Genre Intelligence automatically translates between these systems, ensuring your music is properly categorized on every platform.

## Genre Architecture

### Hierarchical Structure

```
Music
├── Rock
│   ├── Alternative Rock
│   ├── Classic Rock
│   ├── Hard Rock
│   └── Indie Rock
├── Electronic
│   ├── House
│   │   ├── Deep House
│   │   ├── Tech House
│   │   └── Progressive House
│   └── Techno
└── Hip Hop/Rap
    ├── East Coast Rap
    ├── West Coast Rap
    └── Trap
```

### Genre Codes

Each genre has a unique identifier:
- `ROCK-00`: Rock (parent)
- `ALT-ROCK-00`: Alternative Rock (child)
- `DEEP-HOUSE-00`: Deep House (grandchild)

## Using Genre Selector

### In Release Creation

1. Navigate to Step 4 (Metadata)
2. Click the Genre dropdown
3. Browse or search for your genre
4. Select primary genre (required)
5. Add subgenre for precision (optional)

### Search Functionality

- Type to search across all genres
- Results show full path
- Matches on genre names and codes
- Recent selections appear first

### Visual Indicators

- 🎵 Main genres
- 📂 Categories with subgenres
- ✓ Previously used genres
- 🔄 Mapped genres

## Managing Genre Mappings

### Accessing Genre Maps

Navigate to **Genre Maps** from:
- Main navigation menu
- Settings → Delivery Targets → Manage Genre Mappings

### Creating a Mapping

#### Step 1: Select Target DSP

Choose your mapping target:
- Apple Music
- Spotify  
- Beatport
- Amazon Music

#### Step 2: Choose Mapping Method

**Auto-Map Identical**
- Automatically matches exact genre names
- Good for common genres
- Quick setup for standard catalogs

**Manual Mapping**
1. Drag genres from left panel (source)
2. Drop onto target genre in right panel
3. Visual connection shows mapping
4. Supports one-to-many mappings

**Import Mapping**
- Load from JSON file
- Share mappings between instances
- Backup and restore mappings

#### Step 3: Configure Settings

**Mapping Options:**
- **Enable**: Activate for deliveries
- **Strict Mode**: Reject unmapped genres
- **Fallback Genre**: Default for unmapped
- **Version**: Track mapping iterations

### Advanced Mapping Features

#### One-to-Many Mapping

Map one source genre to multiple targets:
```
Indie Rock → Alternative Rock (Spotify)
Indie Rock → Indie (Apple Music)
Indie Rock → Rock (Amazon)
```

#### Conditional Mapping

Based on release metadata:
- Release date (era-specific genres)
- Artist location (regional genres)
- Label (label-specific categories)

#### Smart Suggestions

System suggests mappings based on:
- String similarity (Levenshtein distance)
- Common patterns in your catalog
- Community mapping data
- Historical delivery success

## DSP-Specific Guidelines

### Apple Music

**Requirements:**
- Must use official Apple genre list
- Primary genre required
- Subgenre optional but recommended

**Best Practices:**
- Use most specific genre available
- Avoid "Other" unless necessary
- Check Apple Music for Artists for guidance

### Spotify

**Characteristics:**
- Mood-based categorization
- Playlist-oriented genres
- Frequently updated categories

**Mapping Strategy:**
- Map to multiple moods/styles
- Consider playlist targeting
- Update mappings quarterly

### Beatport

**Focus:**
- Electronic music specialization
- DJ-oriented categorization
- Highly specific subgenres

**Tips:**
- Be precise with electronic subgenres
- Check Beatport's genre charts
- Consider BPM and key compatibility

### Amazon Music

**Approach:**
- Simplified categories
- Browse-friendly structure
- Family-oriented organization

**Recommendations:**
- Map to broader categories
- Use mainstream genre names
- Avoid niche classifications

## Mapping Workflow

### Initial Setup

1. **Analyze Your Catalog**
   - Export genre list from existing releases
   - Identify unique genres used
   - Note genre distribution

2. **Research DSP Requirements**
   - Check each DSP's genre guidelines
   - Note mandatory vs optional fields
   - Understand rejection reasons

3. **Create Base Mappings**
   - Start with auto-mapping
   - Manually map unique genres
   - Test with sample releases

### Ongoing Maintenance

**Monthly Tasks:**
- Review unmapped genres report
- Update mappings for new genres
- Check DSP guideline updates

**Quarterly Review:**
- Analyze delivery success rates
- Update deprecated genres
- Optimize mapping efficiency

**Annual Audit:**
- Full mapping review
- Export and backup all mappings
- Document mapping decisions

## Testing & Validation

### Test Workflow

1. **Create Test Release**
   - Use each unique genre in catalog
   - Set as test mode

2. **Generate ERN**
   - Review genre transformation
   - Check all target mappings

3. **Validate Output**
   - Confirm DSP requirements met
   - Verify genre codes correct

### Validation Checks

**Before Delivery:**
- ✅ Genre mapped successfully
- ✅ Target genre exists in DSP taxonomy
- ✅ Fallback configured (if not strict)
- ✅ Mapping version current

**After Delivery:**
- Review delivery receipts
- Check DSP acceptance
- Note any genre-related rejections
- Update mappings if needed

## Strict Mode vs Flexible Mode

### Strict Mode

**When to Use:**
- Production deliveries
- Contractual requirements
- High-value releases

**Behavior:**
- Fails delivery if genre unmapped
- Ensures 100% compliance
- No automatic fallbacks

### Flexible Mode

**When to Use:**
- Testing phase
- Diverse catalogs
- Experimental releases

**Behavior:**
- Uses fallback for unmapped genres
- Warns but continues delivery
- Logs mapping issues

## Import/Export

### Exporting Mappings

1. Go to Genre Maps
2. Select DSP tab
3. Click **Export** button
4. Choose format:
   - JSON (recommended)
   - CSV (for spreadsheet editing)

### Importing Mappings

1. Click **Import** button
2. Select file (JSON or CSV)
3. Review import preview
4. Choose merge or replace
5. Confirm import

### Sharing Mappings

**Between Instances:**
```json
{
  "version": "1.0",
  "dsp": "spotify",
  "mappings": {
    "ROCK-00": ["rock", "alternative"],
    "JAZZ-00": ["jazz", "smooth-jazz"]
  },
  "metadata": {
    "created": "2024-01-15",
    "author": "Label Name"
  }
}
```

## Troubleshooting

### Common Issues

**"Genre not found in target DSP"**
- Check DSP's current genre list
- Genre may be deprecated
- Try parent genre category

**"Multiple mappings conflict"**
- Review mapping priority
- Set primary mapping
- Remove duplicate mappings

**"Strict mode blocking delivery"**
- Add missing genre mapping
- Temporarily disable strict mode
- Configure appropriate fallback

### Performance Optimization

**For Large Catalogs:**
- Pre-map all genres before bulk delivery
- Cache mapping results
- Use batch processing

**Mapping Efficiency:**
- Minimize one-to-many mappings
- Group similar genres
- Regular cleanup of unused mappings

## Best Practices

### DO's
- ✅ Keep mappings up to date
- ✅ Document mapping decisions
- ✅ Test thoroughly before production
- ✅ Export backups regularly
- ✅ Monitor delivery success rates

### DON'Ts
- ❌ Use generic fallbacks for everything
- ❌ Ignore DSP guidelines
- ❌ Map to deprecated genres
- ❌ Forget to update mappings
- ❌ Skip validation testing

## Genre Mapping Examples

### Electronic Music
```
Source: Deep House
├── Spotify: deep-house, house, electronic
├── Apple: Dance → House → Deep House
├── Beatport: Deep House
└── Amazon: Dance & Electronic
```

### Rock Music
```
Source: Indie Rock
├── Spotify: indie-rock, alternative, rock
├── Apple: Alternative → Indie Rock
├── Beatport: Indie Dance (if electronic elements)
└── Amazon: Alternative Rock
```

### Hip Hop
```
Source: Trap
├── Spotify: trap, hip-hop, rap
├── Apple: Hip-Hop/Rap → Trap
├── Beatport: Trap/Future Bass
└── Amazon: Rap & Hip-Hop
```

## API Integration (Advanced)

### Programmatic Mapping

```javascript
// Example: Fetch and apply mappings
const genreMapping = await genreService.getMapping('spotify')
const mappedGenre = genreMapping.map('INDIE-ROCK-00')
console.log(mappedGenre) // ['indie-rock', 'alternative']
```

### Webhook Notifications

Configure webhooks for:
- New unmapped genres detected
- Mapping conflicts found
- DSP genre updates available

## Resources

### Genre References
- [Apple Music Genre List](https://help.apple.com/itc/musicstyleguide/)
- [Spotify Genre Seeds](https://developer.spotify.com/documentation/web-api/reference/#/operations/get-recommendation-genres)
- [Beatport Genres](https://www.beatport.com/genres)

### Tools
- Genre Mapping Validator
- Bulk Mapping Editor
- Genre Analytics Dashboard

### Support
- Community mapping library
- Genre mapping best practices
- Monthly genre updates newsletter

---

🎯 **Quick Tip**: Start with auto-mapping for 80% of your catalog, then manually map the unique genres that define your label's sound.