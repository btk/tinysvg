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
    if (!params || !Array.isArray(params)) {
      console.warn('Invalid params for command:', command, params);
      return command;
    }
    return command + params.join(' ');
  }).join(' ');
};

// Helper function to calculate distance between points
const distance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Douglas-Peucker path simplification
const simplifyPath = (points, tolerance) => {
  console.log('Simplifying path with tolerance:', tolerance);
  const commands = parsePathData(pathDataToString(points));
  console.log('Number of points before simplification:', commands.length);
  
  const findPerpendicularDistance = (point, lineStart, lineEnd) => {
    const lineLength = distance(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y);
    if (lineLength === 0) return distance(point.x, point.y, lineStart.x, lineStart.y);
    
    const t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) + 
               (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / 
              (lineLength * lineLength);
    
    if (t < 0) return distance(point.x, point.y, lineStart.x, lineStart.y);
    if (t > 1) return distance(point.x, point.y, lineEnd.x, lineEnd.y);
    
    const projectionX = lineStart.x + t * (lineEnd.x - lineStart.x);
    const projectionY = lineStart.y + t * (lineEnd.y - lineStart.y);
    
    return distance(point.x, point.y, projectionX, projectionY);
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
  
  const simplifiedPoints = simplify(points, tolerance);
  console.log('Number of points after simplification:', simplifiedPoints.length);
  
  const simplifiedCommands = simplifiedPoints.map((point, i) => {
    if (i === 0) return { command: 'M', params: [point.x, point.y] };
    return { command: 'L', params: [point.x, point.y] };
  });
  
  const simplifiedPathData = `d="${pathDataToString(simplifiedCommands)}"`;
  console.log('Simplified path data:', simplifiedPathData);
  return simplifiedPathData;
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
    console.log('Simplifying paths with tolerance:', tolerance);
    
    svg = svg.replace(/d="([^"]+)"/g, (match, pathData) => {
      console.log('Original path data:', pathData);
      const commands = parsePathData(pathData);
      console.log('Parsed commands:', commands);
      
      const points = [];
      let currentX = 0;
      let currentY = 0;
      
      // Convert all commands to absolute coordinates
      commands.forEach(({ command, params }) => {
        switch (command) {
          case 'M':
            currentX = params[0];
            currentY = params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'm':
            currentX += params[0];
            currentY += params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'L':
            currentX = params[0];
            currentY = params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'l':
            currentX += params[0];
            currentY += params[1];
            points.push({ x: currentX, y: currentY });
            break;
          case 'H':
            currentX = params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'h':
            currentX += params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'V':
            currentY = params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'v':
            currentY += params[0];
            points.push({ x: currentX, y: currentY });
            break;
          case 'Z':
          case 'z':
            points.push({ x: points[0].x, y: points[0].y });
            break;
        }
      });
      
      console.log('Extracted points:', points);
      
      if (points.length > 2) {
        const simplifiedPathData = simplifyPath(points, tolerance);
        console.log('Simplified path data:', simplifiedPathData);
        return simplifiedPathData;
      }
      
      console.log('Path too short to simplify, returning original');
      return match;
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
      // Basic cleanup
      'removeTitle',
      'removeDesc',
      'removeComments',
      'removeMetadata',
      'removeEditorsNSData',
      'removeEmptyAttrs',
      'removeEmptyContainers',
      'removeEmptyText',
      'removeHiddenElems',
      'removeViewBox',
      'removeDimensions',
      'removeDoctype',
      'removeXMLProcInst',
      'removeXMLNS',
      'removeUnknownsAndDefaults',
      'removeNonInheritableGroupAttrs',
      'removeUselessStrokeAndFill',
      'removeUnusedNS',
      'removeRasterImages',
      'removeScriptElement',
      'removeStyleElement',
      'removeOffCanvasPaths',

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
      'convertShapeToPath',
      'convertEllipseToCircle',

      // Group optimizations
      'collapseGroups',
      'mergePaths',
    ],
  };

  try {
    const result = optimize(preProcessedSvg, svgoConfig);
    
    // Additional post-processing
    let finalSvg = result.data;
    
    // Ensure SVG has proper namespace and viewBox
    if (!finalSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
      finalSvg = finalSvg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // Add viewBox if missing
    if (!finalSvg.includes('viewBox=') && !finalSvg.includes('width=') && !finalSvg.includes('height=')) {
      finalSvg = finalSvg.replace(/<svg/, '<svg viewBox="0 0 100 100"');
    }
    
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