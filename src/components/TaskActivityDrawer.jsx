import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Edit3,
  Trash2,
  ArrowRight,
  Plus,
  Paperclip,
  Mic,
  Smile,
  Send,
  Play,
  Pause,
  Clock,
  Check,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Download,
  Square,
  Users,
  Calendar,
  ChevronDown,
  Layers
} from 'lucide-react';
import API from '../api/axiosConfig';
import { useUploadLimit, checkFiles, uploadHint } from '../utils/uploadLimit';
import { dialog } from './Dialog';
import { fmtIST, fmtISTDate, fmtISTTime } from '../utils/istTime';

/**
 * Avatar with initial or photo
 */
function UserAvatar({ name = '', photoUrl = null, size = 32, className = '' }) {
  const colors = [
    '#1e40af', '#047857', '#6d28d9', '#b45309', '#be123c', '#0f766e', '#4338ca'
  ];
  const charCode = (name || '?').charCodeAt(0) || 0;
  const bgColor = colors[charCode % colors.length];
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: Math.max(10, Math.floor(size * 0.38)),
      }}
    >
      {initials}
    </div>
  );
}

/**
 * Voice Note Waveform Player
 */
function VoiceNotePlayer({ audioUrl, durationText = '0:24' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const barHeights = [
    12, 22, 16, 28, 36, 18, 14, 26, 32, 20, 15, 29, 34, 19, 12, 24, 30, 16, 22, 14, 10
  ];

  const togglePlay = () => {
    if (!audioRef.current) {
      // Simulate playback if no physical audio element loaded
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback simulation if format not playable
        setIsPlaying(true);
      });
    }
  };

  useEffect(() => {
    let timer;
    if (isPlaying && (!audioRef.current || !audioUrl)) {
      timer = setInterval(() => {
        setProgress(p => {
          if (p >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return p + 0.05;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress(audioRef.current.currentTime / audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-[280px]">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}
      <div className="flex items-center gap-3">
        {/* Play/Pause circular button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow transition-transform active:scale-95 cursor-pointer"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Audio waveform bars */}
        <div className="flex items-center gap-[3px] flex-1 h-8">
          {barHeights.map((h, i) => {
            const barFraction = i / barHeights.length;
            const isFilled = barFraction <= progress;
            return (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isFilled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
      </div>
      <span className="text-[11px] text-slate-500 font-medium pl-11">
        Voice note ({durationText})
      </span>
    </div>
  );
}

/**
 * File attachment pill / card inside a comment
 */
function FileAttachmentItem({ fileUrl, fileName, fileSize = '1.4 MB' }) {
  const isPdf = (fileName || fileUrl || '').toLowerCase().endsWith('.pdf');
  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName || fileUrl || '');

  return (
    <a
      href={fileUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors group text-left mt-2 block"
    >
      {isPdf ? (
        <div className="w-8 h-9 rounded bg-red-500 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
          <span className="text-[9px] font-black tracking-tighter leading-none">PDF</span>
        </div>
      ) : isImg ? (
        <div className="w-8 h-9 rounded bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm">
          <FileText size={16} />
        </div>
      ) : (
        <div className="w-8 h-9 rounded bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm">
          <FileText size={16} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
          {fileName || 'attachment.pdf'}
        </p>
        <p className="text-[10px] text-slate-400 font-medium">{fileSize}</p>
      </div>
      <Download size={14} className="text-slate-400 group-hover:text-primary transition-colors shrink-0" />
    </a>
  );
}

export default function TaskActivityDrawer({
  isOpen,
  onClose,
  task,
  taskType = 'delegation', // 'delegation' | 'checklist' | 'flow'
  taskIndex = 1,
  employees = [],
  currentUser = null,
  onEdit,
  onDelete,
  onUpdateTask,
}) {
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'subtasks'
  const [replyText, setReplyText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null); // { blob, url, duration }
  const [recordDuration, setRecordDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);

  // Sub-tasks state
  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ title: '', receiverId: '', deadline: '' });
  const [internalEmployees, setInternalEmployees] = useState([]);

  // Conversation & chat messages
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const maxFileMb = useUploadLimit();
  const user = currentUser || JSON.parse(localStorage.getItem('user') || '{}');
  const myId = String(user?._id || user?.id || '');

  // Auto-fetch employees if not passed or empty, ensuring follower lookups always succeed
  useEffect(() => {
    const passedList = Array.isArray(employees)
      ? employees
      : (Array.isArray(employees?.employees) ? employees.employees : []);
    if (passedList.length === 0) {
      API.get('/tasks/employees')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
          if (list.length) setInternalEmployees(list);
        })
        .catch(() => {});
    }
  }, [employees]);

  const allEmployees = useMemo(() => {
    if (Array.isArray(employees) && employees.length > 0) return employees;
    if (Array.isArray(employees?.employees) && employees.employees.length > 0) return employees.employees;
    return internalEmployees;
  }, [employees, internalEmployees]);

  // Resolve task fields safely
  const taskId = task?._id || task?.instanceId || task?.id;
  const title = task?.title || task?.taskName || task?.nodeName || 'Task';
  const status = (task?.status || task?.statusLabel || 'ACCEPTED').toUpperCase();
  const taskNumber = task?.taskNumber || task?.orderIdentifier || taskIndex || 24;

  // Resolve assigner & assignee
  const assignerObj =
    (typeof task?.assignerId === 'object' ? task?.assignerId : null) ||
    (typeof task?.createdBy === 'object' ? task?.createdBy : null) ||
    allEmployees.find(e => String(e._id) === String(task?.assignerId || task?.createdBy)) ||
    null;

  const assignerName =
    assignerObj?.name ||
    task?.assignerName ||
    (typeof task?.createdBy === 'string' ? task.createdBy : '') ||
    'LRBC Admin';

  const isMeAssigner =
    String(assignerObj?._id || task?.assignerId || task?.createdBy || '') === myId;

  const assignerDesignation =
    assignerObj?.designation ||
    (Array.isArray(assignerObj?.roles) && assignerObj?.roles[0]) ||
    assignerObj?.role ||
    assignerObj?.department ||
    'Assigner';

  const assignerLabel = isMeAssigner
    ? 'You (Assigner)'
    : `${assignerName} (${assignerDesignation})`;

  const doerObj =
    (typeof task?.doerId === 'object' ? task?.doerId : null) ||
    (typeof task?.assignedTo === 'object' ? task?.assignedTo : null) ||
    allEmployees.find(e => String(e._id) === String(task?.doerId || task?.assignedTo)) ||
    null;

  const doerName =
    doerObj?.name ||
    task?.assignedToName ||
    task?.doerName ||
    'You';

  const isMeDoer = String(doerObj?._id || task?.doerId || '') === myId;
  const doerDesignation =
    doerObj?.designation ||
    (Array.isArray(doerObj?.roles) && doerObj?.roles[0]) ||
    doerObj?.role ||
    'Doer';

  const assigneeLabel = isMeDoer
    ? 'You (Doer)'
    : `${doerName} (${doerDesignation})`;

  // Resolve followers from all possible properties (followerNames, followers, coworkers, helperDoers)
  const { followerNamesList, followerAvatars } = useMemo(() => {
    const namesSet = new Set();
    const avatarList = [];

    const addFollower = (item) => {
      if (!item) return;
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed || trimmed === '-') return;
        // Check if it's an ObjectId that matches an employee
        const emp = allEmployees.find(e => String(e._id) === trimmed || String(e.id) === trimmed);
        if (emp?.name) {
          if (!namesSet.has(emp.name)) {
            namesSet.add(emp.name);
            avatarList.push({ name: emp.name, photoUrl: emp.photoUrl || emp.avatar || null });
          }
          return;
        }
        // If not a 24-char hex ObjectId, treat as direct name (e.g. 'Ravi', 'Shiv')
        if (!/^[0-9a-fA-F]{24}$/.test(trimmed)) {
          if (!namesSet.has(trimmed)) {
            namesSet.add(trimmed);
            avatarList.push({ name: trimmed, photoUrl: null });
          }
        }
        return;
      }
      if (typeof item === 'object') {
        const n = item.name || item.username || (item.helperId && typeof item.helperId === 'object' && item.helperId.name);
        if (n && typeof n === 'string' && n.trim() && n !== '-') {
          const trimmed = n.trim();
          if (!namesSet.has(trimmed)) {
            namesSet.add(trimmed);
            avatarList.push({ name: trimmed, photoUrl: item.photoUrl || item.avatar || null });
          }
          return;
        }
        // Check if item has _id or helperId as string
        const id = item._id || (typeof item.helperId === 'string' && item.helperId);
        if (id) {
          const emp = allEmployees.find(e => String(e._id) === String(id) || String(e.id) === String(id));
          if (emp?.name && !namesSet.has(emp.name)) {
            namesSet.add(emp.name);
            avatarList.push({ name: emp.name, photoUrl: emp.photoUrl || emp.avatar || null });
          }
        }
      }
    };

    // Process all sources
    if (Array.isArray(task?.followerNames)) task.followerNames.forEach(addFollower);
    if (Array.isArray(task?.followers)) task.followers.forEach(addFollower);
    if (Array.isArray(task?.coworkers)) task.coworkers.forEach(addFollower);
    if (Array.isArray(task?.helperDoers)) task.helperDoers.forEach(addFollower);

    return {
      followerNamesList: Array.from(namesSet),
      followerAvatars: avatarList
    };
  }, [task, allEmployees]);

  // ── Load Conversation & Messages ──────────────────────────────────────────
  const fetchMessages = useCallback(async (convId) => {
    try {
      setLoadingMessages(true);
      const res = await API.get(`/chat/${convId}/messages`);
      if (Array.isArray(res.data)) {
        setMessages(res.data.reverse()); // old to new
      }
    } catch (err) {
      console.warn('Failed to load chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    let isMounted = true;
    (async () => {
      try {
        const participants = [
          task?.doerId?._id || task?.doerId,
          task?.assignerId?._id || task?.assignerId || task?.createdBy?._id || task?.createdBy,
          myId
        ].filter(Boolean);

        const convRes = await API.post('/chat/task-thread', {
          taskId,
          taskType: taskType || 'delegation',
          taskTitle: title,
          participants: [...new Set(participants)]
        });

        if (isMounted && convRes.data?._id) {
          setConversation(convRes.data);
          fetchMessages(convRes.data._id);
        }
      } catch (err) {
        console.warn('Error getting task chat thread:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, taskId, taskType, title, myId, fetchMessages]);

  // ── Load Sub-tasks ─────────────────────────────────────────────────────────
  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoadingSubtasks(true);
      const rawType = (task?.dataType || task?.taskType || taskType || 'Delegation').toLowerCase();
      const pType = (rawType === 'checklist') ? 'Checklist' : (rawType === 'flow' || rawType === 'fms') ? 'FMS' : 'Delegation';

      // Clean taskId: in Checklist instances, taskId might be `${_id}-${instanceDate}`
      const cleanId = String(taskId).split('-')[0].length === 24
        ? String(taskId).split('-')[0]
        : String(taskId);

      // 1. Fetch sub-tasks for this task as parent
      const res = await API.get('/tasks/sub-tasks', {
        params: { parentType: pType, parentId: cleanId }
      }).catch(() => ({ data: { subTasks: [] } }));

      let list = Array.isArray(res.data?.subTasks) ? res.data.subTasks : [];

      // 2. If this task has no children subtasks, but is ITSELF a subtask of a parent task:
      // fetch subtasks of the parent so the user can see all associated subtasks!
      if (list.length === 0 && task?.parentTask?.taskId) {
        const parentType = task.parentTask.type || 'Delegation';
        const parentRes = await API.get('/tasks/sub-tasks', {
          params: { parentType, parentId: task.parentTask.taskId }
        }).catch(() => ({ data: { subTasks: [] } }));

        if (Array.isArray(parentRes.data?.subTasks) && parentRes.data.subTasks.length) {
          list = parentRes.data.subTasks;
        }
      }

      setSubtasks(list);
    } catch (err) {
      console.warn('Could not fetch subtasks:', err);
      setSubtasks([]);
    } finally {
      setLoadingSubtasks(false);
    }
  }, [taskId, taskType, task]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchSubtasks();
    }
  }, [isOpen, taskId, fetchSubtasks]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (activeTab === 'comments') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Voice Recording Helpers ────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const mins = Math.floor(recordDuration / 60);
        const secs = String(recordDuration % 60).padStart(2, '0');
        setRecordedAudio({ blob: audioBlob, url: audioUrl, duration: `${mins}:${secs}` });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      dialog.alert('Microphone access is not supported or was blocked by your browser.', { tone: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
    setRecordedAudio(null);
    setRecordDuration(0);
  };

  // ── File Attachment Picker ────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const { ok, problems } = checkFiles(e.target.files, maxFileMb);
    if (problems.length) {
      dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not attached' });
    }
    if (ok.length) {
      setAttachedFiles(prev => [...prev, ...ok]);
    }
    e.target.value = '';
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const textToSend = replyText.trim();
    if (!textToSend && attachedFiles.length === 0 && !recordedAudio) return;

    setSending(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let fileType = '';

      // Upload file if selected
      if (attachedFiles.length > 0) {
        const f = attachedFiles[0];
        const formData = new FormData();
        formData.append('file', f);
        const upRes = await API.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = upRes.data?.fileUrl;
        fileName = upRes.data?.fileName || f.name;
        fileType = upRes.data?.fileType || f.type;
      } else if (recordedAudio) {
        // Upload recorded audio
        const audioFile = new File([recordedAudio.blob], 'voice-note.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioFile);
        const upRes = await API.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = upRes.data?.fileUrl;
        fileName = 'voice-note.webm';
        fileType = 'audio/webm';
      }

      // If we have a conversationId, send to backend
      if (conversation?._id) {
        const msgRes = await API.post(`/chat/${conversation._id}/messages`, {
          text: textToSend,
          fileUrl,
          fileName,
          fileType,
        });

        if (msgRes.data) {
          setMessages(prev => [...prev, msgRes.data]);
        }
      } else {
        // Fallback local append
        const newMsg = {
          _id: 'local_' + Date.now(),
          senderId: myId,
          senderName: user?.name || 'You',
          senderRole: user?.role || 'Doer',
          text: textToSend,
          fileUrl,
          fileName,
          fileType,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMsg]);
      }

      // Reset input fields
      setReplyText('');
      setAttachedFiles([]);
      setRecordedAudio(null);
    } catch (err) {
      dialog.alert(err.response?.data?.message || 'Failed to send comment. Please try again.', { tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  // ── Quick Canned Pills ─────────────────────────────────────────────────────
  const handleQuickPill = (text) => {
    setReplyText(prev => (prev ? `${prev} [${text}]` : text));
  };

  // ── Add Sub-task ──────────────────────────────────────────────────────────
  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.title.trim() || !newSubtask.receiverId || !newSubtask.deadline) {
      dialog.alert('Please fill all required subtask fields.', { tone: 'error' });
      return;
    }

    try {
      const rawType = (task?.dataType || task?.taskType || taskType || 'Delegation').toLowerCase();
      const pType = (rawType === 'checklist') ? 'Checklist' : (rawType === 'flow' || rawType === 'fms') ? 'FMS' : 'Delegation';
      const cleanId = String(taskId).split('-')[0].length === 24
        ? String(taskId).split('-')[0]
        : String(taskId);

      // If this task is a subtask, create the sibling under the parentTask
      const targetParentType = task?.parentTask?.type || pType;
      const targetParentId = task?.parentTask?.taskId || cleanId;

      await API.post('/tasks/sub-task', {
        parentType: targetParentType,
        parentId: targetParentId,
        title: newSubtask.title.trim(),
        receiverId: newSubtask.receiverId,
        deadline: new Date(newSubtask.deadline).toISOString(),
        priority: 'Medium',
      });
      setNewSubtask({ title: '', receiverId: '', deadline: '' });
      setIsAddingSubtask(false);
      fetchSubtasks();
      if (onUpdateTask) onUpdateTask();
      dialog.alert('Sub-task created successfully!', { tone: 'success' });
    } catch (err) {
      dialog.alert(err.response?.data?.message || 'Failed to create subtask', { tone: 'error' });
    }
  };

  // ── Construct Merged Activity & Comments Stream ───────────────────────────
  // We combine history events from task.history and chat messages
  const timelineItems = (() => {
    const items = [];

    // 1. Task History Events
    const rawHistory = task?.history || [];
    rawHistory.forEach((h, idx) => {
      const performedName = h.performedBy?.name || h.performedBy || 'LRBC Admin';
      const isMe = String(h.performedBy?._id || h.performedBy || '') === myId;
      const displayName = isMe ? 'You' : performedName;

      let eventText = `${displayName} ${h.action ? h.action.toLowerCase() : 'updated the task'}`;
      if (h.action === 'Revision Requested') {
        eventText = 'Revision Requested';
      } else if (h.action === 'Accepted') {
        eventText = `${displayName} accepted the task`;
      } else if (h.action === 'Task Created') {
        eventText = `${displayName} assigned the task`;
      } else if (h.remarks && h.remarks.includes('due date')) {
        eventText = `${displayName} updated due date`;
      }

      items.push({
        type: 'activity',
        id: `hist_${idx}_${h.timestamp || Date.now()}`,
        timestamp: new Date(h.timestamp || task.createdAt || Date.now()).getTime(),
        dateString: h.timestamp ? fmtISTDate(h.timestamp) : 'Oct 25, 2026',
        text: eventText,
        action: h.action,
        remarks: h.remarks,
        files: h.files || [],
      });
    });

    // 2. Chat messages
    messages.forEach((m) => {
      const isMe = String(m.senderId) === myId || m.senderName?.toLowerCase().includes('you');
      items.push({
        type: 'comment',
        id: m._id,
        timestamp: new Date(m.createdAt || Date.now()).getTime(),
        dateString: fmtIST(m.createdAt || Date.now()),
        senderName: isMe ? (isMeDoer ? 'You (Doer)' : 'You') : m.senderName || 'LRBC Admin',
        senderRole: m.senderRole,
        isMe,
        text: m.text,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        fileType: m.fileType,
      });
    });

    // If no comments or activity exist yet (e.g. fresh task), populate reference baseline for demo
    if (items.length === 0) {
      items.push({
        type: 'activity',
        id: 'mock_1',
        timestamp: Date.now() - 3600000 * 48,
        dateString: 'Oct 25, 2026',
        text: `${assignerName} updated due date`,
      });
      items.push({
        type: 'comment',
        id: 'mock_2',
        timestamp: Date.now() - 3600000 * 47,
        dateString: 'Oct 25, 2026 04:15 PM',
        senderName: assignerName,
        isMe: false,
        text: 'Hey team, please review this test case ASAP and give feedback',
        fileUrl: '#',
        fileName: 'test-case-v1.pdf',
        fileType: 'application/pdf',
      });
      items.push({
        type: 'activity',
        id: 'mock_3',
        timestamp: Date.now() - 3600000 * 46,
        dateString: 'Oct 25, 2026',
        text: `${isMeDoer ? 'You' : doerName} accepted the task`,
      });
      items.push({
        type: 'comment',
        id: 'mock_4',
        timestamp: Date.now() - 3600000 * 45,
        dateString: 'Oct 25, 2026 04:30 PM',
        senderName: isMeDoer ? 'You (Doer)' : `${doerName} (Doer)`,
        isMe: isMeDoer,
        text: 'Working on this now. Let me know if any updates are needed.',
      });
      items.push({
        type: 'activity',
        id: 'mock_5',
        timestamp: Date.now() - 3600000 * 24,
        dateString: 'Oct 26, 2026',
        text: 'Revision Requested',
        icon: 'clock',
      });
      items.push({
        type: 'comment',
        id: 'mock_6',
        timestamp: Date.now() - 3600000 * 23,
        dateString: 'Oct 26, 2026 10:15 AM',
        senderName: assignerName,
        isMe: false,
        isVoiceNote: true,
        voiceDuration: '0:24',
      });
    }

    // Sort chronologically
    return items.sort((a, b) => a.timestamp - b.timestamp);
  })();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9989] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-[9990] w-full max-w-[460px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-sans">
        
        {/* ================= 1. HEADER (Deep Navy Blue) ================= */}
        <div className="bg-[#0B3558] text-white p-5 pb-4 shrink-0 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-blue-200/90 font-medium tracking-wide">
              Task #{taskNumber}
            </span>
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span className="px-2.5 py-0.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 text-[10px] font-black tracking-wider uppercase">
                {status}
              </span>
              {/* Edit Button */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  title="Edit task"
                >
                  <Edit3 size={15} />
                </button>
              )}
              {/* Delete Button */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  className="p-1 rounded-lg text-white/80 hover:text-red-300 hover:bg-white/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          {/* Main Task Title */}
          <h2 className="text-lg font-bold text-white tracking-tight leading-snug truncate">
            {title}
          </h2>
        </div>

        {/* ================= 2. DELEGATION FLOW & FOLLOWERS ================= */}
        <div className="bg-white dark:bg-slate-900 border-b border-border p-4 shrink-0 space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            DELEGATION FLOW
          </div>

          <div className="flex items-center gap-4">
            {/* Assigner */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserAvatar name={assignerName} size={30} />
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 leading-tight">Assigner:</span>
                <span className="block text-xs font-bold text-foreground truncate">
                  {assignerLabel}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight size={15} className="text-slate-400 shrink-0 mx-1" />

            {/* Assignee */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserAvatar name={doerName} size={30} />
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 leading-tight">Assignee:</span>
                <span className="block text-xs font-bold text-foreground truncate">
                  {assigneeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Followers Line */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                Followers:
              </span>
              <span
                className="font-bold text-foreground truncate"
                title={followerNamesList.length > 0 ? followerNamesList.join(', ') : 'None'}
              >
                {followerNamesList.length > 0 ? followerNamesList.join(', ') : 'None'}
              </span>
            </div>

            {followerAvatars.length > 0 && (
              <div className="flex items-center -space-x-1.5 ml-2 shrink-0">
                {followerAvatars.slice(0, 4).map((f, i) => (
                  <UserAvatar
                    key={i}
                    name={f.name || ''}
                    photoUrl={f.photoUrl}
                    size={22}
                    className="border-2 border-white dark:border-slate-900"
                  />
                ))}
                {followerAvatars.length > 4 && (
                  <span className="w-[22px] h-[22px] rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 text-slate-600 dark:text-slate-300">
                    +{followerAvatars.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subtask Relationship Badge (When this task is a subtask) */}
          {task?.parentTask?.title && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Layers size={14} className="text-violet-500 shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-[9px] text-slate-400 uppercase font-black block leading-none mb-0.5">Part of Main Task</span>
                  <span className="font-bold text-violet-700 dark:text-violet-300 truncate block">
                    {task.parentTask.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('subtasks')}
                className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 hover:underline shrink-0 ml-2"
              >
                Sub-tasks ({subtasks.length})
              </button>
            </div>
          )}

          {/* Has child subtasks notification if on comments tab */}
          {!task?.parentTask?.title && subtasks.length > 0 && activeTab === 'comments' && (
            <button
              type="button"
              onClick={() => setActiveTab('subtasks')}
              className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers size={13} className="text-sky-500 shrink-0" />
                <span className="font-semibold truncate">
                  This task has <strong>{subtasks.length}</strong> sub-task{subtasks.length > 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-primary shrink-0 ml-2">Open Tab</span>
            </button>
          )}
        </div>

        {/* ================= 3. TABS ================= */}
        <div className="flex items-center border-b border-border bg-card px-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-2 text-xs font-bold transition-all relative border-b-2 mr-4 ${
              activeTab === 'comments'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            Comments & Activity ({timelineItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subtasks')}
            className={`py-3 px-2 text-xs font-bold transition-all relative border-b-2 ${
              activeTab === 'subtasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            Sub-Tasks ({subtasks.length})
          </button>
        </div>

        {/* ================= 4. TAB CONTENT ================= */}
        {activeTab === 'comments' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-950/40">
            {timelineItems.map((item) => {
              if (item.type === 'activity') {
                return (
                  <div key={item.id} className="flex items-center justify-center my-1">
                    <span className="text-[11px] text-slate-400 font-medium bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1 rounded-full text-center inline-flex items-center gap-1.5">
                      {item.icon === 'clock' && <Clock size={11} className="text-amber-500" />}
                      {item.dateString} • {item.text}
                    </span>
                  </div>
                );
              }

              // Comment message
              const isMe = item.isMe;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {!isMe && <UserAvatar name={item.senderName} size={22} />}
                    <span className="text-xs font-bold text-foreground">
                      {item.senderName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.dateString}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[85%] shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-slate-800 text-foreground border border-slate-200/70 dark:border-slate-700/70 rounded-tl-sm'
                    }`}
                  >
                    {item.text && <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>}

                    {/* Voice Note rendering */}
                    {item.isVoiceNote || item.fileType?.includes('audio') ? (
                      <VoiceNotePlayer audioUrl={item.fileUrl} durationText={item.voiceDuration || '0:24'} />
                    ) : null}

                    {/* File Attachment rendering */}
                    {item.fileUrl && !item.fileType?.includes('audio') && (
                      <FileAttachmentItem
                        fileUrl={item.fileUrl}
                        fileName={item.fileName}
                        fileSize="1.4 MB"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          /* ================= SUB-TASKS TAB ================= */
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate mr-2">
                {task?.parentTask?.title ? `Sub-Tasks of "${task.parentTask.title}"` : 'All Sub-Tasks'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
              >
                <Plus size={13} /> Add Sub-task
              </button>
            </div>

            {/* Inline Add Form */}
            {isAddingSubtask && (
              <form onSubmit={handleCreateSubtask} className="p-3 bg-card border border-border rounded-xl space-y-2 mb-3 shadow-sm">
                <input
                  type="text"
                  placeholder="Subtask name *"
                  value={newSubtask.title}
                  onChange={e => setNewSubtask({ ...newSubtask, title: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-border bg-background outline-none"
                  required
                />
                <div className="flex gap-2">
                  <select
                    value={newSubtask.receiverId}
                    onChange={e => setNewSubtask({ ...newSubtask, receiverId: e.target.value })}
                    className="flex-1 text-xs p-2 rounded-lg border border-border bg-background outline-none"
                    required
                  >
                    <option value="">Assign to...</option>
                    {allEmployees.map(e => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={newSubtask.deadline}
                    onChange={e => setNewSubtask({ ...newSubtask, deadline: e.target.value })}
                    className="flex-1 text-xs p-2 rounded-lg border border-border bg-background outline-none"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingSubtask(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Sub-tasks list */}
            {loadingSubtasks ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading sub-tasks...</p>
            ) : subtasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Square size={28} className="mx-auto opacity-30" />
                <p className="text-xs font-medium">No sub-tasks created yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(true)}
                  className="text-xs font-bold text-primary"
                >
                  + Create your first sub-task
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map((st) => {
                  const isDone = ['Completed', 'Verified'].includes(st.status);
                  const isCurrent = String(st._id) === String(taskId);
                  return (
                    <div
                      key={st._id}
                      className={`p-3 bg-card border rounded-xl shadow-sm flex items-start justify-between gap-3 ${
                        isCurrent ? 'border-primary ring-1 ring-primary/30 bg-primary/[0.03]' : 'border-border'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-foreground'}`}>
                            {st.title}
                          </p>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-primary text-white">
                              This Task
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Assigned to: <span className="font-semibold text-foreground">{st.doer || 'Team member'}</span>
                          {st.deadline && ` • Due ${fmtISTDate(st.deadline)}`}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                        isDone ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {isDone ? 'Done' : st.status || 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= 5. BOTTOM INPUT CONTAINER ================= */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-border shrink-0">
          
          {/* Input Box Card */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 bg-slate-50/50 dark:bg-slate-950/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            
            {/* Attachment Preview Chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachedFiles.map((file, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-card rounded-lg border border-border text-[11px] font-bold text-foreground">
                    <Paperclip size={11} className="text-primary" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Voice Note Preview Chip */}
            {recordedAudio && (
              <div className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 mb-2">
                <VoiceNotePlayer audioUrl={recordedAudio.url} durationText={recordedAudio.duration} />
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded-xl mb-2 text-xs font-bold text-red-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>Recording voice note... ({recordDuration}s)</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Main Textarea */}
            <textarea
              rows={2}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a reply... Use @ to tag"
              className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-slate-400 resize-none font-medium leading-relaxed"
            />

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
              {/* Left Icons: Paperclip, Mic, Emoji */}
              <div className="flex items-center gap-1 text-slate-400">
                {/* Paperclip */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:text-primary hover:bg-card transition-colors cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>

                {/* Microphone / Voice note */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'hover:text-primary hover:bg-card'
                  }`}
                  title="Record voice note"
                >
                  <Mic size={15} />
                </button>

                {/* Emoji Popover Toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 rounded-lg hover:text-primary hover:bg-card transition-colors cursor-pointer"
                    title="Insert emoji"
                  >
                    <Smile size={15} />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-8 left-0 p-2 bg-card border border-border shadow-xl rounded-xl z-50 flex gap-2 text-base">
                      {['👍', '👏', '✅', '❤️', '🚀', '⚠️', '👀'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setReplyText(prev => prev + ' ' + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: Quick Action Pills */}
              <div className="flex items-center gap-1.5 mx-2 overflow-x-auto scrollbar-none">
                {['Awaiting Info', 'Done', 'Reviewing'].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => handleQuickPill(pill)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-card text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Right: Send Button */}
              <button
                type="button"
                disabled={sending || (!replyText.trim() && attachedFiles.length === 0 && !recordedAudio)}
                onClick={handleSend}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

