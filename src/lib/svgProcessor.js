import { optimize } from 'svgo/dist/svgo.browser.js';

// Helper function to parse path data
const parsePathData = (d) => {
  const commands = [];
  let currentCommand = '';
  let currentParams = [];
  
  d.replace(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g, (_, cmd, params) => {
    currentCommand = cmd;
    currentParams = params.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    commands.push({ command: cmd, params: currentParams });
    return '';
  });
  
  return commands;
};

// Helper function to convert path data back to string
const pathDataToString = (commands) => {
  return commands.map(({ command, params }) => {
    return command + params.join(' ');
  }).join(' ');
};

// Helper function to calculate distance between points
const distance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Douglas-Peucker path simplification
const simplifyPath = (points, tolerance) => {
  if (points.length <= 2) return points;
  
  const findPerpendicularDistance = (point, lineStart, lineEnd) => {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;
    
    // Normalize
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }
    
    const pvx = point.x - lineStart.x;
    const pvy = point.y - lineStart.y;
    
    // Get dot product (project pv onto normalized direction)
    const pvdot = dx * pvx + dy * pvy;
    
    // Scale line direction vector
    const dsx = pvdot * dx;
    const dsy = pvdot * dy;
    
    // Subtract this from pv
    const ax = pvx - dsx;
    const ay = pvy - dsy;
    
    return Math.sqrt(ax * ax + ay * ay);
  };
  
  const simplify = (points, tolerance) => {
    if (points.length <= 2) return points;
    
    let maxDistance = 0;
    let maxIndex = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = findPerpendicularDistance(
        points[i],
        points[0],
        points[points.length - 1]
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    if (maxDistance > tolerance) {
      const left = simplify(points.slice(0, maxIndex + 1), tolerance);
      const right = simplify(points.slice(maxIndex), tolerance);
      return left.slice(0, -1).concat(right);
    }
    
    return [points[0], points[points.length - 1]];
  };
  
  return simplify(points, tolerance);
};

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

  // Simplify paths with Douglas-Peucker algorithm
  if (options.simplifyPaths) {
    const tolerance = options.simplifyTolerance || 1;
    svg = svg.replace(/d="([^"]+)"/g, (match, pathData) => {
      const commands = parsePathData(pathData);
      const points = [];
      let currentX = 0;
      let currentY = 0;
      
      commands.forEach(({ command, params }) => {
        switch (command) {
          case 'M':
          case 'm':
            currentX = params[0];
            currentY = params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'L':
          case 'l':
            currentX = command === 'L' ? params[0] : currentX + params[0];
            currentY = command === 'L' ? params[1] : currentY + params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'H':
          case 'h':
            currentX = command === 'H' ? params[0] : currentX + params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'V':
          case 'v':
            currentY = command === 'V' ? params[0] : currentY + params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'Z':
          case 'z':
            points.push({ x: points[0].x, y: points[0].y });
            break;
        }
      });
      
      const simplifiedPoints = simplifyPath(points, tolerance);
      const simplifiedCommands = simplifiedPoints.map((point, i) => {
        if (i === 0) return { command: 'M', params: [point.x, point.y] };
        return { command: 'L', params: [point.x, point.y] };
      });
      
      return `d="${pathDataToString(simplifiedCommands)}"`;
    });
  }

  // Round coordinates in path data with custom precision
  if (options.roundCoordinates) {
    const precision = options.coordinatePrecision || 2;
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
  if (!svgContent || typeof svgContent !== 'string') {
    console.error('Invalid SVG content');
    return {
      data: '',
      size: {
        original: 0,
        optimized: 0,
        reduction: 0,
      },
    };
  }

  // First run our custom optimizations
  const preProcessedSvg = preProcessSvg(svgContent, options);

  // Then run SVGO with its optimizations
  const svgoConfig = {
    multipass: true,
    floatPrecision: options.coordinatePrecision || 2,
    plugins: [
      // Remove metadata
      { name: 'removeTitle' },
      { name: 'removeDesc' },
      { name: 'removeComments' },
      { name: 'removeMetadata' },
      { name: 'removeEditorsNSData' },

      // Cleanup
      { name: 'cleanupAttrs' },
      { name: 'cleanupEnableBackground' },
      { name: 'cleanupIDs' },
      { name: 'cleanupNumericValues' },
      { name: 'cleanupListOfValues' },
      { name: 'convertColors' },
      { name: 'removeUnknownsAndDefaults' },
      { name: 'removeNonInheritableGroupAttrs' },
      { name: 'removeUselessStrokeAndFill' },
      { name: 'removeViewBox' },
      { name: 'removeDimensions' },
      { name: 'removeEmptyAttrs' },
      { name: 'removeEmptyContainers' },
      { name: 'removeEmptyText' },
      { name: 'removeHiddenElems' },
      { name: 'removeEmptyDefs' },
      { name: 'removeUnusedNS' },
      { name: 'removeDoctype' },
      { name: 'removeXMLProcInst' },
      { name: 'removeXMLNS' },

      // Path optimizations
      { 
        name: 'convertPathData',
        params: {
          floatPrecision: options.coordinatePrecision || 2,
          noSpaceAfterFlags: options.removeSpaceAfterFlags || false,
          straightCurves: options.smoothCurves || false,
          lineShorthands: options.smoothCurves || false,
          curveSmoothShorthands: options.smoothCurves || false,
          removeUseless: true,
          collapseRepeated: true,
          utilizeAbsolute: true,
          leadingZero: true,
          negativeExtraSpace: true,
        }
      },
      { 
        name: 'convertTransform',
        params: {
          floatPrecision: options.coordinatePrecision || 2,
          noSpaceAfterFlags: options.removeSpaceAfterFlags || false,
        }
      },

      // Shape optimizations
      { name: 'convertShapeToPath' },
      { name: 'convertEllipseToCircle' },
      { name: 'convertRectToPath' },
      { name: 'convertLineToPath' },

      // Group optimizations
      { name: 'collapseGroups' },
      { name: 'mergePaths' },
      { name: 'removeDuplicateElements' },
      { name: 'removeUnusedDefs' },
      { name: 'removeUselessDefs' },

      // Style optimizations
      { name: 'inlineStyles' },
      { name: 'minifyStyles' },
      { name: 'removeStyleElement' },
      { name: 'removeScriptElement' },
      { name: 'removeRasterImages' },
      { name: 'removeOffCanvasPaths' },
      { name: 'removeElementsByAttr' },
      { name: 'removeAttrs' },
      { name: 'removeAttributesBySelector' },
      { name: 'removeClasses' },
      { name: 'removeDataAttrs' },
      { name: 'removeDataNamespacedAttrs' },
      { name: 'removeDefaultPx' },
      { name: 'removeDimensions' },
      { name: 'removeDoctype' },
      { name: 'removeEditorsNSData' },
      { name: 'removeEmptyAttrs' },
      { name: 'removeEmptyContainers' },
      { name: 'removeEmptyDefs' },
      { name: 'removeEmptyText' },
      { name: 'removeHiddenElems' },
      { name: 'removeMetadata' },
      { name: 'removeNonInheritableGroupAttrs' },
      { name: 'removeOffCanvasPaths' },
      { name: 'removeRasterImages' },
      { name: 'removeScriptElement' },
      { name: 'removeStyleElement' },
      { name: 'removeTitle' },
      { name: 'removeUnknownsAndDefaults' },
      { name: 'removeUnusedDefs' },
      { name: 'removeUnusedNS' },
      { name: 'removeUselessDefs' },
      { name: 'removeUselessStrokeAndFill' },
      { name: 'removeViewBox' },
      { name: 'removeXMLNS' },
      { name: 'removeXMLProcInst' },
    ],
  };

  try {
    const result = optimize(preProcessedSvg, svgoConfig);
    
    // Additional post-processing
    let finalSvg = result.data;
    
    // Remove any remaining whitespace
    finalSvg = finalSvg.replace(/\s+/g, ' ').trim();
    
    // Remove any remaining empty attributes
    finalSvg = finalSvg.replace(/\s[\w:-]+=""/g, '');
    
    // Remove any remaining empty elements
    finalSvg = finalSvg.replace(/<(\w+)([^>]*)\s*\/>/g, (match, tag, attrs) => {
      if (!attrs.trim()) {
        return `<${tag}/>`;
      }
      return match;
    });

    return {
      data: finalSvg,
      size: {
        original: svgContent.length,
        optimized: finalSvg.length,
        reduction: Math.round((1 - finalSvg.length / svgContent.length) * 100),
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