'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, X, Send, ChevronDown, Loader2, AlertCircle, Image as ImageIcon, Link } from 'lucide-react';
import { buildTemplateComponents, WhatsAppTemplateMeta } from '@/lib/templateUtils';

interface TemplateSenderProps {
  onSend: (templateName: string, languageCode: string, components: any[], resolvedText: string) => Promise<void>;
  onClose: () => void;
}

export default function TemplateSender({ onSend, onClose }: TemplateSenderProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateMeta | null>(null);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Extract {{N}} placeholders from template body
  const getPlaceholders = (body: string): number[] => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    return matches.map((m) => parseInt(m.replace(/[{}]/g, '')));
  };

  const selectTemplate = (template: WhatsAppTemplateMeta) => {
    setSelectedTemplate(template);
    setShowDropdown(false);
    const placeholders = getPlaceholders(template.body);
    setParamValues(new Array(placeholders.length).fill(''));
    setImageUrl('');
    setError('');
  };

  // Build preview text with filled values
  const getPreviewText = (): string => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.body;
    paramValues.forEach((val, idx) => {
      text = text.replace(`{{${idx + 1}}}`, val || `{{${idx + 1}}}`);
    });
    return text;
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    // Validate body params
    const placeholders = getPlaceholders(selectedTemplate.body);
    const hasEmpty = paramValues.some((v, i) => i < placeholders.length && !v.trim());
    if (hasEmpty) {
      setError('Please fill in all parameter values');
      return;
    }

    // Validate image URL for image-header templates
    if (selectedTemplate.hasImageHeader && !imageUrl.trim()) {
      setError('This template requires a header image URL');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Build full WhatsApp API components array using the helper
      const components = buildTemplateComponents({
        imageUrl: selectedTemplate.hasImageHeader ? imageUrl : undefined,
        bodyParams: paramValues,
        buttons: selectedTemplate.buttons,
      });

      const resolvedText = getPreviewText();
      await onSend(selectedTemplate.name, selectedTemplate.language, components, resolvedText);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send template');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-[#1f2c34] border border-[#2a3942] rounded-xl shadow-2xl p-6 z-30 min-h-[360px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-3 text-[#8696a0]">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-[#1f2c34] border border-[#2a3942] rounded-xl shadow-2xl z-30 flex flex-col" style={{ maxHeight: 'min(85vh, 600px)', minHeight: '360px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942]/50 shrink-0">
        <div className="flex items-center gap-2 text-[#e9edef]">
          <FileText size={18} className="text-[#00a884]" />
          <span className="font-medium text-[14px]">Send Template</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-[#2a3942] flex items-center justify-center text-[#8696a0] hover:text-[#e9edef] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4 min-h-[200px]">
        {/* Template Selector */}
        <div ref={dropdownRef} className="relative">
          <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-medium mb-1.5 block">
            Select Template
          </label>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between bg-[#2a3942] rounded-lg px-3 py-2.5 text-left text-[13px] text-[#e9edef] hover:bg-[#2a3942]/80 transition-colors border border-[#2a3942]/60"
          >
            <span className={selectedTemplate ? '' : 'text-[#8696a0]'}>
              {selectedTemplate
                ? `${selectedTemplate.name} (${selectedTemplate.category})`
                : 'Choose a template...'}
            </span>
            <ChevronDown size={16} className="text-[#8696a0]" />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a3942] rounded-lg shadow-xl border border-[#3b4a54] max-h-[300px] overflow-y-auto z-40">
              {templates.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#8696a0] text-center">
                  No approved templates found
                </div>
              ) : (
                templates.map((t) => (
                  <button
                    key={`${t.name}-${t.language}`}
                    onClick={() => selectTemplate(t)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#3b4a54] transition-colors border-b border-[#3b4a54]/30 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#e9edef] font-medium">{t.name}</span>
                      {t.hasImageHeader && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">IMG</span>
                      )}
                      {t.buttons.length > 0 && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">{t.buttons.length} BTN</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8696a0] mt-0.5">
                      {t.category} • {t.language}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Header Image URL (only for IMAGE header templates) */}
        {selectedTemplate?.hasImageHeader && (
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-medium mb-1.5 block flex items-center gap-1.5">
              <ImageIcon size={12} />
              Header Image URL
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="relative">
              <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… or Google Drive share link"
                className="w-full bg-[#2a3942] rounded-lg pl-8 pr-3 py-2 text-[13px] text-[#e9edef] placeholder:text-[#8696a0]/50 border border-[#2a3942]/60 focus:border-[#00a884]/50 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-[#8696a0] mt-1">
              Google Drive links are automatically converted to direct download URLs.
            </p>
          </div>
        )}

        {/* Parameter Inputs */}
        {selectedTemplate && paramValues.length > 0 && (
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-medium block">
              Fill in Values
            </label>
            {paramValues.map((val, idx) => (
              <div key={idx}>
                <div className="text-[11px] text-[#8696a0] mb-1">
                  Parameter {`{{${idx + 1}}}`}
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const newVals = [...paramValues];
                    newVals[idx] = e.target.value;
                    setParamValues(newVals);
                  }}
                  placeholder={`Value for {{${idx + 1}}}`}
                  className="w-full bg-[#2a3942] rounded-lg px-3 py-2 text-[13px] text-[#e9edef] placeholder:text-[#8696a0]/50 border border-[#2a3942]/60 focus:border-[#00a884]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {selectedTemplate && (
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8696a0] font-medium mb-1.5 block">
              Preview
            </label>
            <div className="bg-[#005c4b] rounded-lg overflow-hidden">
              {/* Image preview */}
              {selectedTemplate.hasImageHeader && imageUrl.trim() && (
                <div className="bg-black/20 px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8696a0]">
                    <ImageIcon size={10} />
                    <span>Header image will be sent</span>
                  </div>
                </div>
              )}
              {/* Body text */}
              <div className="px-3 py-2.5 text-[13px] text-[#e1e9eb] whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                {getPreviewText()}
              </div>
              {/* Buttons preview */}
              {selectedTemplate.buttons.length > 0 && (
                <div className="border-t border-white/10 px-3 py-2 space-y-1">
                  {selectedTemplate.buttons.map((btn, i) => (
                    <div key={i} className="text-[12px] text-[#00a884] font-medium text-center py-0.5">
                      {btn.type === 'QUICK_REPLY' ? '↩ ' : btn.type === 'URL' ? '🔗 ' : '📞 '}
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-[12px] bg-red-400/10 px-3 py-2 rounded-lg">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Send Button */}
      <div className="px-4 py-3 border-t border-[#2a3942]/50 shrink-0">
        <button
          onClick={handleSend}
          disabled={!selectedTemplate || sending}
          className="w-full bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-40 disabled:cursor-not-allowed text-[#111b21] font-medium text-[14px] py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {sending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send Template
            </>
          )}
        </button>
      </div>
    </div>
  );
}
