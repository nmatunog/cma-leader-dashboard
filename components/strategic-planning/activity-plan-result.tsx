'use client';

import { useState, useRef } from 'react';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import { Calendar, Clock, Users, Target, CheckCircle2, ArrowRight, Briefcase, TrendingUp } from 'lucide-react';

interface ActivityPlanResultProps {
  content: string;
  onClose?: () => void;
}

export function ActivityPlanResult({ content, onClose }: ActivityPlanResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!contentRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        onclone: (clonedDoc, element) => {
          try {
            // Add a style override to convert problematic color functions
            const styleOverride = clonedDoc.createElement('style');
            styleOverride.textContent = `
              * {
                color: rgb(30, 41, 59) !important;
                background-color: rgb(255, 255, 255) !important;
                border-color: rgb(226, 232, 240) !important;
              }
              .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                color: rgb(15, 23, 42) !important;
              }
              .prose p, .prose li, .prose span {
                color: rgb(51, 65, 85) !important;
              }
              .prose strong {
                color: rgb(15, 23, 42) !important;
              }
            `;
            clonedDoc.head.appendChild(styleOverride);
            
            // Also process inline styles
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl && htmlEl.style) {
                const style = htmlEl.style.cssText;
                if (style) {
                  // Remove lab(), lch(), oklab(), oklch() color functions
                  htmlEl.style.cssText = style
                    .replace(/lab\([^)]+\)/gi, 'rgb(148, 163, 184)')
                    .replace(/lch\([^)]+\)/gi, 'rgb(148, 163, 184)')
                    .replace(/oklab\([^)]+\)/gi, 'rgb(148, 163, 184)')
                    .replace(/oklch\([^)]+\)/gi, 'rgb(148, 163, 184)');
                }
              }
            });
          } catch (error) {
            console.warn('Error in onclone:', error);
          }
        },
      });

      // Convert canvas to image
      const imageUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `Activity_Plan_${new Date().toISOString().split('T')[0]}.png`;
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating infographic:', error);
      alert('Failed to download infographic. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const htmlContent = marked(content || 'No content available.') as string;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition-colors flex-shrink-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm">📋</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Personalized Activity Plan</h3>
              <p className="text-xs text-slate-600">Click to expand/collapse</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download Infographic</span>
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center text-xs transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            )}
            <svg
              className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-50 to-white">
          <div
            ref={contentRef}
            className="prose prose-slate max-w-none bg-white rounded-xl shadow-sm border border-slate-200"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: '4rem 5rem',
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            <style>{`
              .prose {
                font-size: 14px;
                line-height: 1.75;
                color: rgb(51, 65, 85);
              }
              .prose h1 {
                font-size: 28px;
                font-weight: 800;
                line-height: 1.2;
                margin-top: 0;
                margin-bottom: 1.5rem;
                color: rgb(15, 23, 42);
                border-bottom: 3px solid rgb(99, 102, 241);
                padding-bottom: 0.75rem;
              }
              .prose h2 {
                font-size: 22px;
                font-weight: 700;
                line-height: 1.3;
                margin-top: 2rem;
                margin-bottom: 1rem;
                color: rgb(30, 41, 59);
                border-bottom: 2px solid rgb(226, 232, 240);
                padding-bottom: 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
              }
              .prose h2:before {
                content: '';
                width: 4px;
                height: 22px;
                background: linear-gradient(to bottom, rgb(99, 102, 241), rgb(139, 92, 246));
                border-radius: 2px;
              }
              .prose h3 {
                font-size: 18px;
                font-weight: 600;
                line-height: 1.4;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                color: rgb(51, 65, 85);
              }
              .prose h4 {
                font-size: 16px;
                font-weight: 600;
                margin-top: 1.25rem;
                margin-bottom: 0.5rem;
                color: rgb(71, 85, 105);
              }
              .prose p {
                margin-top: 0.75rem;
                margin-bottom: 0.75rem;
                color: rgb(51, 65, 85);
                text-align: justify;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .prose ul, .prose ol {
                margin-top: 0.75rem;
                margin-bottom: 0.75rem;
                padding-left: 1.75rem;
              }
              .prose li {
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
                padding-left: 0.5rem;
                color: rgb(51, 65, 85);
                line-height: 1.7;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .prose ul li {
                list-style-type: none;
                position: relative;
              }
              .prose ul li:before {
                content: '▸';
                position: absolute;
                left: -1.25rem;
                color: rgb(99, 102, 241);
                font-weight: bold;
              }
              .prose ol li {
                list-style-type: decimal;
                padding-left: 0.25rem;
              }
              .prose strong {
                font-weight: 600;
                color: rgb(15, 23, 42);
              }
              .prose em {
                font-style: italic;
                color: rgb(71, 85, 105);
              }
              .prose a {
                color: rgb(99, 102, 241);
                text-decoration: underline;
              }
              .prose code {
                background-color: rgb(241, 245, 249);
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-size: 0.875em;
                color: rgb(220, 38, 38);
              }
              .prose pre {
                background-color: rgb(241, 245, 249);
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin-top: 1rem;
                margin-bottom: 1rem;
              }
              .prose blockquote {
                border-left: 4px solid rgb(99, 102, 241);
                padding-left: 1rem;
                margin-left: 0;
                margin-top: 1rem;
                margin-bottom: 1rem;
                font-style: italic;
                color: rgb(71, 85, 105);
              }
              .prose table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
                margin-bottom: 1rem;
              }
              .prose th {
                background-color: rgb(241, 245, 249);
                font-weight: 600;
                padding: 0.75rem;
                text-align: left;
                border: 1px solid rgb(226, 232, 240);
                color: rgb(15, 23, 42);
              }
              .prose td {
                padding: 0.75rem;
                border: 1px solid rgb(226, 232, 240);
                color: rgb(51, 65, 85);
              }
              .prose hr {
                border: none;
                border-top: 2px solid rgb(226, 232, 240);
                margin: 2rem 0;
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      )}
    </div>
  );
}
