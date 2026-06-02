import React from 'react';
import { ReportsCardProps } from '../../types/management';

export const ReportsCard: React.FC<ReportsCardProps> = ({
  missedToday,
  homeworkNotChecked,
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-5"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 text-base">👥</span>
        Отчёты
      </h3>
      <ul className="flex flex-col gap-2.5">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            Пропустили сегодня
          </span>
          <span className="text-sm font-semibold text-slate-700">{missedToday}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />
            Больны
          </span>
          <span className="text-sm font-semibold text-slate-700">0</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
            ДЗ не проверено
          </span>
          <span className="text-sm font-semibold text-slate-700">{homeworkNotChecked}</span>
        </li>
      </ul>
    </div>
  );
};