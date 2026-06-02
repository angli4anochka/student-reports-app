import React from 'react';
import { NotesSectionProps } from '../../types/management';

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onNotesChange,
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-5 h-full flex flex-col"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 text-base">📝</span>
        Заметки
      </h3>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Напишите заметки или напоминания..."
        className="flex-1 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          lineHeight: '1.5',
          minHeight: '150px',
          backgroundColor: '#fefefe',
          transition: 'border-color 0.2s'
        }}
      />
      <div className="mt-2 text-xs text-slate-400 text-right">
        Заметки сохраняются автоматически
      </div>
    </div>
  );
};