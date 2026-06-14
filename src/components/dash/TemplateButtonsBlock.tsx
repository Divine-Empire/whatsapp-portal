import React from 'react';
import { ExternalLink, Phone } from 'lucide-react';

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

interface TemplateButtonsBlockProps {
  buttons?: WhatsAppTemplateButton[];
  isOutbound?: boolean;
}

export default function TemplateButtonsBlock({ buttons, isOutbound = false }: TemplateButtonsBlockProps) {
  if (!buttons || buttons.length === 0) return null;

  // Split buttons to render them nicely
  // WhatsApp web renders action buttons as stacked full-width rows with top borders
  return (
    <div className="w-full mt-2 -mx-3 -mb-2 border-t border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 select-none rounded-b-lg overflow-hidden bg-black/[0.01]">
      <div className="w-full h-0" style={{ marginLeft: '12px', marginRight: '12px' }} />
      {buttons.map((btn, idx) => {
        const isUrl = btn.type === 'URL';
        const isPhone = btn.type === 'PHONE_NUMBER';

        // Styling classes
        const textClass = isOutbound
          ? 'text-[#0b8066] hover:text-[#0b8066]'
          : 'text-[var(--color-wa-teal)] hover:text-[var(--color-wa-teal)]';

        return (
          <div
            key={idx}
            className={`w-full py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide ${textClass} opacity-90 cursor-default`}
          >
            <span className="truncate max-w-[90%]">{btn.text}</span>
            {isUrl && <ExternalLink size={12} className="shrink-0 opacity-80" />}
            {isPhone && <Phone size={12} className="shrink-0 opacity-80" />}
          </div>
        );
      })}
    </div>
  );
}
