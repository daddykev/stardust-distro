// src/dictionaries/territories/index.js

/**
 * Territory Dictionary based on ISO 3166-1
 * Used for DDEX territorial rights and distribution
 */

// Major territories for music distribution
export const MAJOR_TERRITORIES = [
  { alpha2: 'US', alpha3: 'USA', numeric: '840', name: 'United States', region: 'Americas', subregion: 'Northern America' },
  { alpha2: 'GB', alpha3: 'GBR', numeric: '826', name: 'United Kingdom', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'CA', alpha3: 'CAN', numeric: '124', name: 'Canada', region: 'Americas', subregion: 'Northern America' },
  { alpha2: 'AU', alpha3: 'AUS', numeric: '036', name: 'Australia', region: 'Oceania', subregion: 'Australia and New Zealand' },
  { alpha2: 'DE', alpha3: 'DEU', numeric: '276', name: 'Germany', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'FR', alpha3: 'FRA', numeric: '250', name: 'France', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'JP', alpha3: 'JPN', numeric: '392', name: 'Japan', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'BR', alpha3: 'BRA', numeric: '076', name: 'Brazil', region: 'Americas', subregion: 'South America' },
  { alpha2: 'IN', alpha3: 'IND', numeric: '356', name: 'India', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'MX', alpha3: 'MEX', numeric: '484', name: 'Mexico', region: 'Americas', subregion: 'Central America' }
];

// Complete territory list for DDEX compliance
export const TERRITORIES = [
  ...MAJOR_TERRITORIES,
  { alpha2: 'AD', alpha3: 'AND', numeric: '020', name: 'Andorra', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'AE', alpha3: 'ARE', numeric: '784', name: 'United Arab Emirates', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'AF', alpha3: 'AFG', numeric: '004', name: 'Afghanistan', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'AG', alpha3: 'ATG', numeric: '028', name: 'Antigua and Barbuda', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'AL', alpha3: 'ALB', numeric: '008', name: 'Albania', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'AM', alpha3: 'ARM', numeric: '051', name: 'Armenia', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'AO', alpha3: 'AGO', numeric: '024', name: 'Angola', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'AR', alpha3: 'ARG', numeric: '032', name: 'Argentina', region: 'Americas', subregion: 'South America' },
  { alpha2: 'AT', alpha3: 'AUT', numeric: '040', name: 'Austria', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'AZ', alpha3: 'AZE', numeric: '031', name: 'Azerbaijan', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'BA', alpha3: 'BIH', numeric: '070', name: 'Bosnia and Herzegovina', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'BB', alpha3: 'BRB', numeric: '052', name: 'Barbados', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'BD', alpha3: 'BGD', numeric: '050', name: 'Bangladesh', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'BE', alpha3: 'BEL', numeric: '056', name: 'Belgium', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'BF', alpha3: 'BFA', numeric: '854', name: 'Burkina Faso', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'BG', alpha3: 'BGR', numeric: '100', name: 'Bulgaria', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'BH', alpha3: 'BHR', numeric: '048', name: 'Bahrain', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'BI', alpha3: 'BDI', numeric: '108', name: 'Burundi', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'BJ', alpha3: 'BEN', numeric: '204', name: 'Benin', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'BN', alpha3: 'BRN', numeric: '096', name: 'Brunei', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'BO', alpha3: 'BOL', numeric: '068', name: 'Bolivia', region: 'Americas', subregion: 'South America' },
  { alpha2: 'BS', alpha3: 'BHS', numeric: '044', name: 'Bahamas', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'BT', alpha3: 'BTN', numeric: '064', name: 'Bhutan', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'BW', alpha3: 'BWA', numeric: '072', name: 'Botswana', region: 'Africa', subregion: 'Southern Africa' },
  { alpha2: 'BY', alpha3: 'BLR', numeric: '112', name: 'Belarus', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'BZ', alpha3: 'BLZ', numeric: '084', name: 'Belize', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'CD', alpha3: 'COD', numeric: '180', name: 'Congo (Democratic Republic)', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'CF', alpha3: 'CAF', numeric: '140', name: 'Central African Republic', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'CG', alpha3: 'COG', numeric: '178', name: 'Congo', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'CH', alpha3: 'CHE', numeric: '756', name: 'Switzerland', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'CI', alpha3: 'CIV', numeric: '384', name: 'Côte d\'Ivoire', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'CL', alpha3: 'CHL', numeric: '152', name: 'Chile', region: 'Americas', subregion: 'South America' },
  { alpha2: 'CM', alpha3: 'CMR', numeric: '120', name: 'Cameroon', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'CN', alpha3: 'CHN', numeric: '156', name: 'China', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'CO', alpha3: 'COL', numeric: '170', name: 'Colombia', region: 'Americas', subregion: 'South America' },
  { alpha2: 'CR', alpha3: 'CRI', numeric: '188', name: 'Costa Rica', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'CU', alpha3: 'CUB', numeric: '192', name: 'Cuba', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'CV', alpha3: 'CPV', numeric: '132', name: 'Cape Verde', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'CY', alpha3: 'CYP', numeric: '196', name: 'Cyprus', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'CZ', alpha3: 'CZE', numeric: '203', name: 'Czech Republic', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'DJ', alpha3: 'DJI', numeric: '262', name: 'Djibouti', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'DK', alpha3: 'DNK', numeric: '208', name: 'Denmark', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'DM', alpha3: 'DMA', numeric: '212', name: 'Dominica', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'DO', alpha3: 'DOM', numeric: '214', name: 'Dominican Republic', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'DZ', alpha3: 'DZA', numeric: '012', name: 'Algeria', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'EC', alpha3: 'ECU', numeric: '218', name: 'Ecuador', region: 'Americas', subregion: 'South America' },
  { alpha2: 'EE', alpha3: 'EST', numeric: '233', name: 'Estonia', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'EG', alpha3: 'EGY', numeric: '818', name: 'Egypt', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'ER', alpha3: 'ERI', numeric: '232', name: 'Eritrea', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'ES', alpha3: 'ESP', numeric: '724', name: 'Spain', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'ET', alpha3: 'ETH', numeric: '231', name: 'Ethiopia', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'FI', alpha3: 'FIN', numeric: '246', name: 'Finland', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'FJ', alpha3: 'FJI', numeric: '242', name: 'Fiji', region: 'Oceania', subregion: 'Melanesia' },
  { alpha2: 'FM', alpha3: 'FSM', numeric: '583', name: 'Micronesia', region: 'Oceania', subregion: 'Micronesia' },
  { alpha2: 'GA', alpha3: 'GAB', numeric: '266', name: 'Gabon', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'GD', alpha3: 'GRD', numeric: '308', name: 'Grenada', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'GE', alpha3: 'GEO', numeric: '268', name: 'Georgia', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'GH', alpha3: 'GHA', numeric: '288', name: 'Ghana', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'GM', alpha3: 'GMB', numeric: '270', name: 'Gambia', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'GN', alpha3: 'GIN', numeric: '324', name: 'Guinea', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'GQ', alpha3: 'GNQ', numeric: '226', name: 'Equatorial Guinea', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'GR', alpha3: 'GRC', numeric: '300', name: 'Greece', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'GT', alpha3: 'GTM', numeric: '320', name: 'Guatemala', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'GW', alpha3: 'GNB', numeric: '624', name: 'Guinea-Bissau', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'GY', alpha3: 'GUY', numeric: '328', name: 'Guyana', region: 'Americas', subregion: 'South America' },
  { alpha2: 'HK', alpha3: 'HKG', numeric: '344', name: 'Hong Kong', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'HN', alpha3: 'HND', numeric: '340', name: 'Honduras', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'HR', alpha3: 'HRV', numeric: '191', name: 'Croatia', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'HT', alpha3: 'HTI', numeric: '332', name: 'Haiti', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'HU', alpha3: 'HUN', numeric: '348', name: 'Hungary', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'ID', alpha3: 'IDN', numeric: '360', name: 'Indonesia', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'IE', alpha3: 'IRL', numeric: '372', name: 'Ireland', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'IL', alpha3: 'ISR', numeric: '376', name: 'Israel', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'IQ', alpha3: 'IRQ', numeric: '368', name: 'Iraq', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'IR', alpha3: 'IRN', numeric: '364', name: 'Iran', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'IS', alpha3: 'ISL', numeric: '352', name: 'Iceland', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'IT', alpha3: 'ITA', numeric: '380', name: 'Italy', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'JM', alpha3: 'JAM', numeric: '388', name: 'Jamaica', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'JO', alpha3: 'JOR', numeric: '400', name: 'Jordan', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'KE', alpha3: 'KEN', numeric: '404', name: 'Kenya', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'KG', alpha3: 'KGZ', numeric: '417', name: 'Kyrgyzstan', region: 'Asia', subregion: 'Central Asia' },
  { alpha2: 'KH', alpha3: 'KHM', numeric: '116', name: 'Cambodia', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'KM', alpha3: 'COM', numeric: '174', name: 'Comoros', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'KN', alpha3: 'KNA', numeric: '659', name: 'Saint Kitts and Nevis', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'KP', alpha3: 'PRK', numeric: '408', name: 'North Korea', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'KR', alpha3: 'KOR', numeric: '410', name: 'South Korea', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'KW', alpha3: 'KWT', numeric: '414', name: 'Kuwait', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'KZ', alpha3: 'KAZ', numeric: '398', name: 'Kazakhstan', region: 'Asia', subregion: 'Central Asia' },
  { alpha2: 'LA', alpha3: 'LAO', numeric: '418', name: 'Laos', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'LB', alpha3: 'LBN', numeric: '422', name: 'Lebanon', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'LC', alpha3: 'LCA', numeric: '662', name: 'Saint Lucia', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'LI', alpha3: 'LIE', numeric: '438', name: 'Liechtenstein', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'LK', alpha3: 'LKA', numeric: '144', name: 'Sri Lanka', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'LR', alpha3: 'LBR', numeric: '430', name: 'Liberia', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'LS', alpha3: 'LSO', numeric: '426', name: 'Lesotho', region: 'Africa', subregion: 'Southern Africa' },
  { alpha2: 'LT', alpha3: 'LTU', numeric: '440', name: 'Lithuania', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'LU', alpha3: 'LUX', numeric: '442', name: 'Luxembourg', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'LV', alpha3: 'LVA', numeric: '428', name: 'Latvia', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'LY', alpha3: 'LBY', numeric: '434', name: 'Libya', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'MA', alpha3: 'MAR', numeric: '504', name: 'Morocco', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'MC', alpha3: 'MCO', numeric: '492', name: 'Monaco', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'MD', alpha3: 'MDA', numeric: '498', name: 'Moldova', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'ME', alpha3: 'MNE', numeric: '499', name: 'Montenegro', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'MG', alpha3: 'MDG', numeric: '450', name: 'Madagascar', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'MH', alpha3: 'MHL', numeric: '584', name: 'Marshall Islands', region: 'Oceania', subregion: 'Micronesia' },
  { alpha2: 'MK', alpha3: 'MKD', numeric: '807', name: 'North Macedonia', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'ML', alpha3: 'MLI', numeric: '466', name: 'Mali', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'MM', alpha3: 'MMR', numeric: '104', name: 'Myanmar', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'MN', alpha3: 'MNG', numeric: '496', name: 'Mongolia', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'MR', alpha3: 'MRT', numeric: '478', name: 'Mauritania', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'MT', alpha3: 'MLT', numeric: '470', name: 'Malta', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'MU', alpha3: 'MUS', numeric: '480', name: 'Mauritius', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'MV', alpha3: 'MDV', numeric: '462', name: 'Maldives', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'MW', alpha3: 'MWI', numeric: '454', name: 'Malawi', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'MY', alpha3: 'MYS', numeric: '458', name: 'Malaysia', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'MZ', alpha3: 'MOZ', numeric: '508', name: 'Mozambique', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'NA', alpha3: 'NAM', numeric: '516', name: 'Namibia', region: 'Africa', subregion: 'Southern Africa' },
  { alpha2: 'NE', alpha3: 'NER', numeric: '562', name: 'Niger', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'NG', alpha3: 'NGA', numeric: '566', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'NI', alpha3: 'NIC', numeric: '558', name: 'Nicaragua', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'NL', alpha3: 'NLD', numeric: '528', name: 'Netherlands', region: 'Europe', subregion: 'Western Europe' },
  { alpha2: 'NO', alpha3: 'NOR', numeric: '578', name: 'Norway', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'NP', alpha3: 'NPL', numeric: '524', name: 'Nepal', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'NR', alpha3: 'NRU', numeric: '520', name: 'Nauru', region: 'Oceania', subregion: 'Micronesia' },
  { alpha2: 'NZ', alpha3: 'NZL', numeric: '554', name: 'New Zealand', region: 'Oceania', subregion: 'Australia and New Zealand' },
  { alpha2: 'OM', alpha3: 'OMN', numeric: '512', name: 'Oman', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'PA', alpha3: 'PAN', numeric: '591', name: 'Panama', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'PE', alpha3: 'PER', numeric: '604', name: 'Peru', region: 'Americas', subregion: 'South America' },
  { alpha2: 'PG', alpha3: 'PNG', numeric: '598', name: 'Papua New Guinea', region: 'Oceania', subregion: 'Melanesia' },
  { alpha2: 'PH', alpha3: 'PHL', numeric: '608', name: 'Philippines', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'PK', alpha3: 'PAK', numeric: '586', name: 'Pakistan', region: 'Asia', subregion: 'Southern Asia' },
  { alpha2: 'PL', alpha3: 'POL', numeric: '616', name: 'Poland', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'PS', alpha3: 'PSE', numeric: '275', name: 'Palestine', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'PT', alpha3: 'PRT', numeric: '620', name: 'Portugal', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'PW', alpha3: 'PLW', numeric: '585', name: 'Palau', region: 'Oceania', subregion: 'Micronesia' },
  { alpha2: 'PY', alpha3: 'PRY', numeric: '600', name: 'Paraguay', region: 'Americas', subregion: 'South America' },
  { alpha2: 'QA', alpha3: 'QAT', numeric: '634', name: 'Qatar', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'RO', alpha3: 'ROU', numeric: '642', name: 'Romania', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'RS', alpha3: 'SRB', numeric: '688', name: 'Serbia', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'RU', alpha3: 'RUS', numeric: '643', name: 'Russia', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'RW', alpha3: 'RWA', numeric: '646', name: 'Rwanda', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'SA', alpha3: 'SAU', numeric: '682', name: 'Saudi Arabia', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'SB', alpha3: 'SLB', numeric: '090', name: 'Solomon Islands', region: 'Oceania', subregion: 'Melanesia' },
  { alpha2: 'SC', alpha3: 'SYC', numeric: '690', name: 'Seychelles', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'SD', alpha3: 'SDN', numeric: '729', name: 'Sudan', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'SE', alpha3: 'SWE', numeric: '752', name: 'Sweden', region: 'Europe', subregion: 'Northern Europe' },
  { alpha2: 'SG', alpha3: 'SGP', numeric: '702', name: 'Singapore', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'SI', alpha3: 'SVN', numeric: '705', name: 'Slovenia', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'SK', alpha3: 'SVK', numeric: '703', name: 'Slovakia', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'SL', alpha3: 'SLE', numeric: '694', name: 'Sierra Leone', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'SM', alpha3: 'SMR', numeric: '674', name: 'San Marino', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'SN', alpha3: 'SEN', numeric: '686', name: 'Senegal', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'SO', alpha3: 'SOM', numeric: '706', name: 'Somalia', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'SR', alpha3: 'SUR', numeric: '740', name: 'Suriname', region: 'Americas', subregion: 'South America' },
  { alpha2: 'SS', alpha3: 'SSD', numeric: '728', name: 'South Sudan', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'ST', alpha3: 'STP', numeric: '678', name: 'São Tomé and Príncipe', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'SV', alpha3: 'SLV', numeric: '222', name: 'El Salvador', region: 'Americas', subregion: 'Central America' },
  { alpha2: 'SY', alpha3: 'SYR', numeric: '760', name: 'Syria', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'SZ', alpha3: 'SWZ', numeric: '748', name: 'Eswatini', region: 'Africa', subregion: 'Southern Africa' },
  { alpha2: 'TD', alpha3: 'TCD', numeric: '148', name: 'Chad', region: 'Africa', subregion: 'Middle Africa' },
  { alpha2: 'TG', alpha3: 'TGO', numeric: '768', name: 'Togo', region: 'Africa', subregion: 'Western Africa' },
  { alpha2: 'TH', alpha3: 'THA', numeric: '764', name: 'Thailand', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'TJ', alpha3: 'TJK', numeric: '762', name: 'Tajikistan', region: 'Asia', subregion: 'Central Asia' },
  { alpha2: 'TL', alpha3: 'TLS', numeric: '626', name: 'Timor-Leste', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'TM', alpha3: 'TKM', numeric: '795', name: 'Turkmenistan', region: 'Asia', subregion: 'Central Asia' },
  { alpha2: 'TN', alpha3: 'TUN', numeric: '788', name: 'Tunisia', region: 'Africa', subregion: 'Northern Africa' },
  { alpha2: 'TO', alpha3: 'TON', numeric: '776', name: 'Tonga', region: 'Oceania', subregion: 'Polynesia' },
  { alpha2: 'TR', alpha3: 'TUR', numeric: '792', name: 'Turkey', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'TT', alpha3: 'TTO', numeric: '780', name: 'Trinidad and Tobago', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'TV', alpha3: 'TUV', numeric: '798', name: 'Tuvalu', region: 'Oceania', subregion: 'Polynesia' },
  { alpha2: 'TW', alpha3: 'TWN', numeric: '158', name: 'Taiwan', region: 'Asia', subregion: 'Eastern Asia' },
  { alpha2: 'TZ', alpha3: 'TZA', numeric: '834', name: 'Tanzania', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'UA', alpha3: 'UKR', numeric: '804', name: 'Ukraine', region: 'Europe', subregion: 'Eastern Europe' },
  { alpha2: 'UG', alpha3: 'UGA', numeric: '800', name: 'Uganda', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'UY', alpha3: 'URY', numeric: '858', name: 'Uruguay', region: 'Americas', subregion: 'South America' },
  { alpha2: 'UZ', alpha3: 'UZB', numeric: '860', name: 'Uzbekistan', region: 'Asia', subregion: 'Central Asia' },
  { alpha2: 'VA', alpha3: 'VAT', numeric: '336', name: 'Vatican City', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'VC', alpha3: 'VCT', numeric: '670', name: 'Saint Vincent and the Grenadines', region: 'Americas', subregion: 'Caribbean' },
  { alpha2: 'VE', alpha3: 'VEN', numeric: '862', name: 'Venezuela', region: 'Americas', subregion: 'South America' },
  { alpha2: 'VN', alpha3: 'VNM', numeric: '704', name: 'Vietnam', region: 'Asia', subregion: 'South-Eastern Asia' },
  { alpha2: 'VU', alpha3: 'VUT', numeric: '548', name: 'Vanuatu', region: 'Oceania', subregion: 'Melanesia' },
  { alpha2: 'WS', alpha3: 'WSM', numeric: '882', name: 'Samoa', region: 'Oceania', subregion: 'Polynesia' },
  { alpha2: 'XK', alpha3: 'XKX', numeric: '983', name: 'Kosovo', region: 'Europe', subregion: 'Southern Europe' },
  { alpha2: 'YE', alpha3: 'YEM', numeric: '887', name: 'Yemen', region: 'Asia', subregion: 'Western Asia' },
  { alpha2: 'ZA', alpha3: 'ZAF', numeric: '710', name: 'South Africa', region: 'Africa', subregion: 'Southern Africa' },
  { alpha2: 'ZM', alpha3: 'ZMB', numeric: '894', name: 'Zambia', region: 'Africa', subregion: 'Eastern Africa' },
  { alpha2: 'ZW', alpha3: 'ZWE', numeric: '716', name: 'Zimbabwe', region: 'Africa', subregion: 'Southern Africa' }
];

// Special territory codes for DDEX
export const SPECIAL_TERRITORIES = [
  { alpha2: 'XW', alpha3: 'XWW', numeric: '001', name: 'Worldwide', region: 'Global', subregion: 'Global' },
  { alpha2: 'EU', alpha3: 'EUU', numeric: '998', name: 'European Union', region: 'Europe', subregion: 'European Union' }
];

// Regional groupings for bulk territory selection
export const TERRITORY_GROUPS = {
  'Worldwide': ['XW'],
  'European Union': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
  'North America': ['US', 'CA', 'MX'],
  'South America': ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE'],
  'Asia Pacific': ['AU', 'CN', 'HK', 'IN', 'ID', 'JP', 'KR', 'MY', 'NZ', 'PH', 'SG', 'TW', 'TH', 'VN'],
  'Middle East': ['AE', 'BH', 'EG', 'IL', 'IQ', 'JO', 'KW', 'LB', 'OM', 'QA', 'SA', 'SY', 'YE'],
  'Africa': ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW']
};

// Helper functions
export function getTerritoryByAlpha2(code) {
  return [...TERRITORIES, ...SPECIAL_TERRITORIES].find(t => t.alpha2 === code);
}

export function getTerritoryByAlpha3(code) {
  return [...TERRITORIES, ...SPECIAL_TERRITORIES].find(t => t.alpha3 === code);
}

export function getTerritoryByNumeric(numeric) {
  return [...TERRITORIES, ...SPECIAL_TERRITORIES].find(t => t.numeric === numeric);
}

export function getTerritoryOptions() {
  return [...SPECIAL_TERRITORIES, ...TERRITORIES].map(t => ({
    value: t.alpha2,
    label: `${t.name} (${t.alpha2})`,
    region: t.region,
    subregion: t.subregion
  }));
}

export function getMajorTerritoryOptions() {
  return [
    ...SPECIAL_TERRITORIES,
    ...MAJOR_TERRITORIES
  ].map(t => ({
    value: t.alpha2,
    label: `${t.name} (${t.alpha2})`,
    region: t.region
  }));
}

export function getTerritoriesByRegion(region) {
  return TERRITORIES.filter(t => t.region === region);
}

export function getTerritoriesBySubregion(subregion) {
  return TERRITORIES.filter(t => t.subregion === subregion);
}

export function getTerritoryGroup(groupName) {
  return TERRITORY_GROUPS[groupName] || [];
}

// Convert alpha2 code to DDEX-compliant ISO 3166-1 alpha-2
export function getDDEXTerritoryCode(alpha2Code) {
  const territory = getTerritoryByAlpha2(alpha2Code);
  return territory ? territory.alpha2 : 'XW'; // Default to Worldwide
}

// Default export
export default {
  TERRITORIES,
  MAJOR_TERRITORIES,
  SPECIAL_TERRITORIES,
  TERRITORY_GROUPS,
  getTerritoryByAlpha2,
  getTerritoryByAlpha3,
  getTerritoryByNumeric,
  getTerritoryOptions,
  getMajorTerritoryOptions,
  getTerritoriesByRegion,
  getTerritoriesBySubregion,
  getTerritoryGroup,
  getDDEXTerritoryCode
};