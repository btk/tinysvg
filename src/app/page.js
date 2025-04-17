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
    removeMetadata: true,
    inlineStyles: true,
    roundCoordinates: true,
    collapseGroups: true,
    removeUnusedDefs: true,
    optimizePaths: true,
    removeIds: true,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  const processSvgContent = useCallback((content) => {
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
  };

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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">SVG Simplifier</h1>
        <button
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            document.documentElement.classList.toggle('dark');
          }}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isDarkMode ? <FiSun className="w-6 h-6" /> : <FiMoon className="w-6 h-6" />}
        </button>
      </div>

      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <input {...getInputProps()} />
        <FiUpload className="mx-auto w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg">Drag and drop an SVG file here, or click to select</p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Simplification Options</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(options).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleOption(key)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="select-none">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
            </label>
          ))}
        </div>
      </div>

      {svgContent && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Preview</h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4" dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Simplified SVG</h2>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiCopy className="w-4 h-4 mr-2" />
                  Copy
                </button>
                <button
                  onClick={downloadSvg}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
            {sizeInfo && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Original size: {formatFileSize(sizeInfo.originalSize)} | Simplified size: {formatFileSize(sizeInfo.newSize)} |{' '}
                Reduction: {((1 - sizeInfo.newSize / sizeInfo.originalSize) * 100).toFixed(1)}%
              </div>
            )}
            <div className="relative">
              <SyntaxHighlighter
                language="markup"
                style={vscDarkPlus}
                className="rounded-lg !bg-gray-100 dark:!bg-gray-800"
                customStyle={{
                  padding: '1rem',
                  margin: 0,
                }}
              >
                {simplifiedSvg}
              </SyntaxHighlighter>
            </div>
          </div>
        </>
      )}
    </main>
  );
} 