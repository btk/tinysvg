'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiCopy, FiDownload, FiSun, FiMoon } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { processSvg } from '@/lib/svgProcessor';

export default function Home() {
  const [svgContent, setSvgContent] = useState('');
  const [simplifiedSvg, setSimplifiedSvg] = useState('');
  const [sizeInfo, setSizeInfo] = useState(null);
  const [options, setOptions] = useState({
    // Basic options
    removeMetadata: true,
    inlineStyles: true,
    collapseGroups: true,
    removeUnusedDefs: true,
    removeIds: true,

    // Path optimization options
    roundCoordinates: true,
    coordinatePrecision: 2,
    removeSpaceAfterFlags: true,
    convertShapesToPaths: true,
    mergePaths: true,
    removeDuplicatePaths: true,
    removeEmptyPaths: true,
    smoothCurves: true,
    
    // Path simplification options
    simplifyPaths: true,
    simplifyTolerance: 1,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const processSvgContent = useCallback((content) => {
    if (!content) return;
    const result = processSvg(content, options);
    setSimplifiedSvg(result.data);
    setSizeInfo(result.size);
  }, [options]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setSvgContent(content);
      processSvgContent(content);
    };
    reader.readAsText(file);
  }, [processSvgContent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/svg+xml': ['.svg']
    },
    multiple: false
  });

  const toggleOption = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
    if (svgContent) {
      processSvgContent(svgContent);
    }
  };

  const updatePrecision = useCallback((value) => {
    const precision = Math.max(0, Math.min(10, parseInt(value) || 0));
    setOptions(prev => ({
      ...prev,
      coordinatePrecision: precision
    }));
    if (svgContent) {
      processSvgContent(svgContent);
    }
  }, [svgContent, processSvgContent]);

  const updateSimplifyTolerance = useCallback((value) => {
    const tolerance = Math.max(0.1, Math.min(10, parseFloat(value) || 1));
    setOptions(prev => ({
      ...prev,
      simplifyTolerance: tolerance
    }));
    if (svgContent) {
      processSvgContent(svgContent);
    }
  }, [svgContent, processSvgContent]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(simplifiedSvg);
  };

  const downloadSvg = () => {
    const blob = new Blob([simplifiedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simplified.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const basicOptions = {
    removeMetadata: 'Remove metadata',
    inlineStyles: 'Inline styles',
    collapseGroups: 'Collapse groups',
    removeUnusedDefs: 'Remove unused defs',
    removeIds: 'Remove IDs',
  };

  const pathOptions = {
    roundCoordinates: 'Round coordinates',
    removeSpaceAfterFlags: 'Remove space after flags',
    convertShapesToPaths: 'Convert shapes to paths',
    mergePaths: 'Merge paths',
    removeDuplicatePaths: 'Remove duplicate paths',
    removeEmptyPaths: 'Remove empty paths',
    smoothCurves: 'Smooth curves',
  };

  return (
    <main className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">TinySVG</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Optimize and simplify your SVG files with precision
            </p>
          </div>
          <button
            onClick={() => {
              setIsDarkMode(!isDarkMode);
              document.documentElement.classList.toggle('dark');
            }}
            className="icons8-button-secondary"
          >
            {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column - Upload and Options */}
          <div className="flex-1 space-y-8">
            {/* Upload Area */}
            <div {...getRootProps()} className="icons8-card p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <input {...getInputProps()} />
              <FiUpload className="mx-auto w-12 h-12 mb-4 text-blue-500" />
              <p className="text-lg mb-2">Drag and drop an SVG file here, or click to select</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Supported format: .svg</p>
            </div>

            {/* Options */}
            <div className="icons8-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Simplification Options</h2>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="icons8-button-secondary"
                >
                  {showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Basic Options</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(basicOptions).map(([key, label]) => (
                      <label key={key} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={options[key]}
                          onChange={() => toggleOption(key)}
                          className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {showAdvancedOptions && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Path Optimization</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(pathOptions).map(([key, label]) => (
                          <label key={key} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={options[key]}
                              onChange={() => toggleOption(key)}
                              className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Precision Settings</h3>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Coordinate precision: {options.coordinatePrecision}</span>
                          <span className="text-sm text-gray-500">(0-10 decimal places)</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={options.coordinatePrecision}
                          onChange={(e) => updatePrecision(e.target.value)}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Less precise</span>
                          <span>More precise</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Path Simplification</h3>
                      <div className="flex flex-col space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer mb-4">
                          <input
                            type="checkbox"
                            checked={options.simplifyPaths}
                            onChange={() => toggleOption('simplifyPaths')}
                            className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm">Simplify paths</span>
                        </label>
                        {options.simplifyPaths && (
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Simplification tolerance: {options.simplifyTolerance}</span>
                              <span className="text-sm text-gray-500">(0.1-10)</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="10"
                              step="0.1"
                              value={options.simplifyTolerance}
                              onChange={(e) => updateSimplifyTolerance(e.target.value)}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>More detailed</span>
                              <span>More simplified</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Results - Code */}
            {svgContent && (
              <div className="icons8-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Simplified SVG</h2>
                  <div className="flex space-x-2">
                    <button onClick={copyToClipboard} className="icons8-button-secondary">
                      <FiCopy className="w-4 h-4" />
                      Copy
                    </button>
                    <button onClick={downloadSvg} className="icons8-button-primary">
                      <FiDownload className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                
                {sizeInfo && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Original size: {formatFileSize(sizeInfo.original)} | Simplified size: {formatFileSize(sizeInfo.optimized)} |{' '}
                    Reduction: {sizeInfo.reduction}%
                  </div>
                )}

                <div className="relative max-w-3xl">
                  <div className="rounded-lg overflow-x-auto bg-gray-50 dark:bg-gray-900">
                    <pre className="min-w-0">
                      <SyntaxHighlighter
                        language="markup"
                        style={vscDarkPlus}
                        className="!m-0"
                        customStyle={{
                          padding: '1rem',
                          background: 'transparent',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          width: '100%',
                          maxWidth: '100%'
                        }}
                        wrapLongLines={true}
                        showLineNumbers={false}
                        PreTag={({ children, ...props }) => (
                          <pre {...props} style={{ 
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            width: '100%',
                            maxWidth: '100%'
                          }}>
                            {children}
                          </pre>
                        )}
                      >
                        {simplifiedSvg}
                      </SyntaxHighlighter>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column - Preview */}
          {svgContent && (
            <div className="lg:w-96 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
              <div className="icons8-card p-6 h-full flex flex-col">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-center">
                  <div className="max-w-full max-h-full" dangerouslySetInnerHTML={{ __html: simplifiedSvg }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 