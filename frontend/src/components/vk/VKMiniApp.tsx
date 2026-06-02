import React, { useCallback, useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { vkApi, VKApiError } from '../../services/vkApi';
import type { HomeworkLesson, VKStudent } from '../../services/vkApi';
import { isLaunchedFromVK } from '../../vk/launchParams';

type Screen =
  | { name: 'loading' }
  | { name: 'notInVK' }
  | { name: 'link' }
  | { name: 'home'; student: VKStudent }
  | { name: 'error'; message: string };

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  SUBMITTED: { text: 'На проверке', cls: 'bg-amber-100 text-amber-700' },
  REVIEWED: { text: 'Проверено', cls: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { text: 'Принято', cls: 'bg-green-100 text-green-700' },
  REJECTED: { text: 'На доработку', cls: 'bg-red-100 text-red-700' },
};

const VKMiniApp: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [vkName, setVkName] = useState<string | undefined>(undefined);

  // Try to authenticate the VK user against a linked student.
  const authenticate = useCallback(async () => {
    try {
      const res = await vkApi.auth();
      setScreen({ name: 'home', student: res.student });
    } catch (err) {
      if (err instanceof VKApiError && err.status === 404) {
        setScreen({ name: 'link' }); // VK user not linked yet
      } else {
        setScreen({
          name: 'error',
          message: err instanceof Error ? err.message : 'Не удалось авторизоваться',
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!isLaunchedFromVK) {
      setScreen({ name: 'notInVK' });
      return;
    }

    bridge.send('VKWebAppInit').catch(() => {/* not fatal */});

    // Best-effort: grab the VK display name to store alongside the link.
    bridge
      .send('VKWebAppGetUserInfo')
      .then((info: any) => {
        const name = [info?.first_name, info?.last_name].filter(Boolean).join(' ');
        if (name) setVkName(name);
      })
      .catch(() => {/* optional */});

    authenticate();
  }, [authenticate]);

  switch (screen.name) {
    case 'loading':
      return <Centered>Загрузка…</Centered>;

    case 'notInVK':
      return (
        <Centered>
          <p className="text-slate-700 font-medium">Откройте приложение внутри VK</p>
          <p className="text-slate-500 text-sm mt-2 max-w-xs">
            Это мини-приложение запускается из сообщества или меню ВКонтакте и
            работает только там.
          </p>
        </Centered>
      );

    case 'error':
      return (
        <Centered>
          <p className="text-red-600 font-medium">Ошибка</p>
          <p className="text-slate-500 text-sm mt-2 max-w-xs">{screen.message}</p>
          <button
            onClick={() => { setScreen({ name: 'loading' }); authenticate(); }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Повторить
          </button>
        </Centered>
      );

    case 'link':
      return <LinkScreen vkUsername={vkName} onLinked={authenticate} />;

    case 'home':
      return <HomeScreen student={screen.student} />;
  }
};

// ─── Link screen ───────────────────────────────────────────────────────
const LinkScreen: React.FC<{ vkUsername?: string; onLinked: () => void }> = ({
  vkUsername,
  onLinked,
}) => {
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const id = studentId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await vkApi.link(id, vkUsername);
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось привязать аккаунт');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-slate-800">Привязка аккаунта</h1>
        <p className="text-sm text-slate-500 mt-2">
          Введите <b>Student ID</b>, который вам выдал преподаватель, чтобы
          получать домашние задания здесь.
        </p>
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Например: 8f3c…"
          className="mt-4 w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none text-sm"
        />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !studentId.trim()}
          className="mt-4 w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
        >
          {busy ? 'Привязываем…' : 'Привязать'}
        </button>
      </div>
    </div>
  );
};

// ─── Home screen (homework list) ───────────────────────────────────────
const HomeScreen: React.FC<{ student: VKStudent }> = ({ student }) => {
  const [lessons, setLessons] = useState<HomeworkLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await vkApi.homework();
      setLessons(res.homework);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задания');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-5 py-4 border-b border-slate-100">
        <p className="text-xs text-slate-400">Домашние задания</p>
        <p className="text-base font-semibold text-slate-800">{student.fullName}</p>
        {student.teacher && (
          <p className="text-xs text-slate-400 mt-0.5">
            Преподаватель: {student.teacher.fullName}
          </p>
        )}
      </header>

      <div className="p-4 space-y-3">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!lessons && !error && <p className="text-slate-400 text-sm">Загрузка…</p>}
        {lessons && lessons.length === 0 && (
          <p className="text-slate-400 text-sm">Пока нет домашних заданий 🎉</p>
        )}
        {lessons?.map((lesson) => (
          <HomeworkCard key={lesson.id} lesson={lesson} onChanged={load} />
        ))}
      </div>
    </div>
  );
};

// ─── One homework card ─────────────────────────────────────────────────
const HomeworkCard: React.FC<{ lesson: HomeworkLesson; onChanged: () => void }> = ({
  lesson,
  onChanged,
}) => {
  const submission = lesson.homeworkSubmissions[0];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(submission?.text ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const date = new Date(lesson.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  const status = submission ? STATUS_LABEL[submission.status] : null;

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await vkApi.submit(lesson.id, { text: text.trim() });
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">{date}</p>
          <p className="font-medium text-slate-800">{lesson.topic || 'Урок'}</p>
        </div>
        {status && (
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${status.cls}`}>
            {status.text}
          </span>
        )}
      </div>

      {lesson.homework && (
        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{lesson.homework}</p>
      )}

      {submission?.grade && (
        <p className="text-sm mt-2 text-slate-700">
          <b>Оценка:</b> {submission.grade}
        </p>
      )}
      {submission?.teacherComment && (
        <p className="text-sm mt-1 text-slate-600">
          <b>Комментарий:</b> {submission.teacherComment}
        </p>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-sm font-medium text-blue-600"
        >
          {submission ? 'Изменить ответ' : 'Сдать задание'}
        </button>
      ) : (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Ваш ответ…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none text-sm"
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              onClick={send}
              disabled={busy || !text.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? 'Отправка…' : 'Отправить'}
            </button>
            <button
              onClick={() => { setOpen(false); setText(submission?.text ?? ''); }}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Small helper ──────────────────────────────────────────────────────
const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-5">
    {children}
  </div>
);

export default VKMiniApp;
