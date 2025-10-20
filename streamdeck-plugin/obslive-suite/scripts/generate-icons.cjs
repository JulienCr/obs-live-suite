/**
 * Generate PNG icons from SVG sources
 * This script creates the required 72x72 and 144x144 PNG images for Stream Deck
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, '../com.julien-cruau.obslive-suite.sdPlugin/imgs/actions');

const actions = [
	'lower-guest',
	'lower-custom',
	'lower-hide',
	'countdown-start',
	'countdown-control',
	'countdown-addtime',
	'poster-show',
	'poster-control'
];

console.log('Generating PNG icons from SVG sources...\n');

// Check if ImageMagick is available
let hasImageMagick = false;
try {
	execSync('magick --version', { stdio: 'ignore' });
	hasImageMagick = true;
	console.log('✓ ImageMagick found\n');
} catch (error) {
	console.log('⚠ ImageMagick not found - will copy SVG as placeholders\n');
}

actions.forEach(actionName => {
	const svgFile = path.join(iconsDir, `${actionName}.svg`);
	const actionDir = path.join(iconsDir, actionName);

	if (!fs.existsSync(svgFile)) {
		console.log(`⚠ SVG not found: ${actionName}.svg`);
		return;
	}

	console.log(`Processing ${actionName}...`);

	// Ensure directory exists
	if (!fs.existsSync(actionDir)) {
		fs.mkdirSync(actionDir, { recursive: true });
	}

	if (hasImageMagick) {
		// Generate PNG files using ImageMagick
		try {
			// 72x72 (icon)
			execSync(`magick "${svgFile}" -resize 72x72 "${path.join(actionDir, 'icon.png')}"`, { stdio: 'ignore' });
			// 144x144 (icon@2x)
			execSync(`magick "${svgFile}" -resize 144x144 "${path.join(actionDir, 'icon@2x.png')}"`, { stdio: 'ignore' });
			// 72x72 (key)
			execSync(`magick "${svgFile}" -resize 72x72 "${path.join(actionDir, 'key.png')}"`, { stdio: 'ignore' });
			// 144x144 (key@2x)
			execSync(`magick "${svgFile}" -resize 144x144 "${path.join(actionDir, 'key@2x.png')}"`, { stdio: 'ignore' });
			console.log(`  ✓ Generated PNG files`);
		} catch (error) {
			console.log(`  ✗ Failed: ${error.message}`);
		}
	} else {
		// Copy SVG as fallback
		['icon.png', 'icon@2x.png', 'key.png', 'key@2x.png'].forEach(filename => {
			fs.copyFileSync(svgFile, path.join(actionDir, filename));
		});
		console.log(`  ⚠ Copied SVG as placeholder (install ImageMagick for proper conversion)`);
	}
});

console.log('\n✓ Icon generation complete!\n');
console.log('Note: If ImageMagick is not installed, SVG files were used as placeholders.');
console.log('Install ImageMagick from https://imagemagick.org/script/download.php for proper PNG conversion.\n');

