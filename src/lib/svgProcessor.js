import { optimize } from 'svgo/dist/svgo.browser.js';

// Custom optimizations that run before SVGO
const preProcessSvg = (svgContent, options) => {
  let svg = svgContent;

  // Normalize tag names to lowercase
  svg = svg.replace(/<\/?([A-Z][^>\s]*)/g, (_, tag) => `<${tag.toLowerCase()}`);

  // Remove XML declaration
  svg = svg.replace(/<\?xml[^>]*\?>/g, '');

  // Remove comments
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');

  // Remove metadata: <title>, <desc>, <metadata>
  if (options.removeMetadata) {
    svg = svg.replace(/<(title|desc|metadata)[^>]*>[\s\S]*?<\/\1>/gi, '');
  }

  // Remove editor-specific attributes (Inkscape, Sodipodi, etc.)
  if (options.removeIds) {
    svg = svg.replace(/\s(?:inkscape|sodipodi|xmlns)(:[^\s=]+)?="[^"]*"/g, '');
    svg = svg.replace(/\s(id|class|data-[^=]*|xml:space)="[^"]*"/g, '');
  }

  // Remove empty attributes
  svg = svg.replace(/\s[\w:-]+=""/g, '');

  // Minify inline styles → turn into attributes
  if (options.inlineStyles) {
    svg = svg.replace(/style="([^"]*)"/g, (_, styleContent) => {
      return styleContent
        .split(';')
        .filter(Boolean)
        .map(rule => {
          const [key, value] = rule.split(':');
          return value ? `${key.trim()}="${value.trim()}"` : '';
        })
        .join(' ');
    });
  }

  // Collapse <g> groups with a single child that's not another <g>
  if (options.collapseGroups) {
    svg = svg.replace(/<g[^>]*>\s*<(?!g)([^>]+)>\s*<\/g>/g, '<$1>');
  }

  // Round coordinates in path data
  if (options.roundCoordinates) {
    const precision = 2;
    svg = svg.replace(/d="([^"]+)"/g, (match, pathData) => {
      const cleaned = pathData.replace(/(-?\d*\.\d+)/g, (_, num) => {
        return parseFloat(num).toFixed(precision);
      });
      return `d="${cleaned}"`;
    });
  }

  // Self-close tags like <path></path> → <path />
  svg = svg.replace(/<(\w+)([^>]*)>\s*<\/\1>/g, '<$1$2 />');

  // Remove completely empty groups or defs
  if (options.removeUnusedDefs) {
    svg = svg.replace(/<g[^>]*>\s*<\/g>/g, '');
    svg = svg.replace(/<defs>\s*<\/defs>/g, '');
  }

  // Collapse multiple spaces, fix whitespace between tags
  svg = svg.replace(/\s{2,}/g, ' ');
  svg = svg.replace(/>\s+</g, '><');

  return svg.trim();
};

export const processSvg = (svgContent, options) => {
  // First run our custom optimizations
  const preProcessedSvg = preProcessSvg(svgContent, options);

  // Then run SVGO with its optimizations
  const svgoConfig = {
    multipass: true,
    plugins: [
      // Remove metadata (if not already removed by pre-processing)
      ...(options.removeMetadata ? [
        { name: 'removeTitle' },
        { name: 'removeDesc' },
        { name: 'removeComments' },
        { name: 'removeMetadata' },
        { name: 'removeEditorsNSData' },
      ] : []),

      // Inline styles (if not already handled by pre-processing)
      ...(options.inlineStyles ? [
        { name: 'inlineStyles' },
        { name: 'removeUnusedNS' },
      ] : []),

      // Round coordinates (if not already handled by pre-processing)
      ...(options.roundCoordinates ? [
        { name: 'convertPathData', params: { floatPrecision: 2 } },
        { name: 'convertTransform', params: { floatPrecision: 2 } },
      ] : []),

      // Collapse groups (if not already handled by pre-processing)
      ...(options.collapseGroups ? [
        { name: 'collapseGroups' },
      ] : []),

      // Remove unused defs (if not already handled by pre-processing)
      ...(options.removeUnusedDefs ? [
        { name: 'removeUnusedDefs' },
        { name: 'removeUselessDefs' },
      ] : []),

      // Optimize paths
      ...(options.optimizePaths ? [
        { name: 'convertPathData' },
        { name: 'mergePaths' },
        { name: 'convertShapeToPath' },
      ] : []),

      // Remove IDs and unnecessary attributes (if not already handled by pre-processing)
      ...(options.removeIds ? [
        { name: 'removeAttrs', params: { attrs: ['id', 'data-*', 'sodipodi:*'] } },
        { name: 'removeUselessStrokeAndFill' },
        { name: 'removeEmptyAttrs' },
      ] : []),

      // Always enabled optimizations
      { name: 'removeDoctype' },
      { name: 'removeXMLProcInst' },
      { name: 'removeEmptyText' },
      { name: 'removeEmptyContainers' },
      { name: 'cleanupEnableBackground' },
      { name: 'cleanupNumericValues' },
      { name: 'cleanupListOfValues' },
      { name: 'convertColors' },
      { name: 'removeUnknownsAndDefaults' },
      { name: 'removeNonInheritableGroupAttrs' },
      { name: 'removeViewBox' },
      { name: 'removeDimensions' },
    ],
  };

  try {
    const result = optimize(preProcessedSvg, svgoConfig);
    return {
      data: result.data,
      size: {
        original: svgContent.length,
        optimized: result.data.length,
        reduction: Math.round((1 - result.data.length / svgContent.length) * 100),
      },
    };
  } catch (error) {
    console.error('Error processing SVG:', error);
    return {
      data: svgContent,
      size: {
        original: svgContent.length,
        optimized: svgContent.length,
        reduction: 0,
      },
    };
  }
}; 