// A tiny in-memory fake of the backend endpoints ChatPage/useChat/TaskDetailsCard
// call, used ONLY because this sandbox cannot reach a real MongoDB (no mongod
// binary; fastdl.mongodb.org/repo.mongodb.org blocked by the egress allowlist -
// same limitation noted on earlier branches this session). It is NOT a stand-in
// for the real backend's business logic (permissions, thread matching, etc) -
// those are already covered by the real getOrCreateTaskThread (reused, untouched)
// and the new getTaskById controller. This harness exists purely so the real
// frontend code (useChat.js, ChatPage.jsx, the Message-button navigation) can be
// exercised end-to-end in an actual browser with two distinct "logged in" users.
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const USERS = {
  'assigner-token': { id: 'assigner1', name: 'Asha (Assigner)', role: 'Admin' },
  'doer-token':     { id: 'doer1',     name: 'Deepak (Doer)',  role: 'Employee' },
};

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = USERS[token];
  if (!user) return res.status(401).json({ message: 'no token' });
  req.user = user;
  next();
}

const TASK_ID = 'task-abc123';
const TASK = {
  _id: TASK_ID,
  title: 'Prepare Q3 report',
  status: 'Accepted',
  priority: 'High',
  deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
  originalDeadline: new Date(Date.now() + 86400000).toISOString(),
  wasRevised: true,
  assignerId: { _id: 'assigner1', name: 'Asha (Assigner)' },
  doerId: { _id: 'doer1', name: 'Deepak (Doer)' },
};

const CONV_ID = 'conv-task-abc123';
let conversations = [
  { _id: CONV_ID, type: 'task', taskId: TASK_ID, displayName: 'Prepare Q3 report', participants: ['assigner1', 'doer1'], unreadCount: 0, lastMessage: null },
];
let messages = { [CONV_ID]: [] };

app.get('/api/chat/conversations', auth, (req, res) => {
  res.json(conversations.filter(c => c.participants.includes(req.user.id)));
});

app.get('/api/chat/employees', auth, (req, res) => {
  res.json(Object.values(USERS).map(u => ({ _id: u.id, name: u.name, role: u.role })));
});

app.post('/api/chat/task-thread', auth, (req, res) => {
  const { taskId, taskTitle } = req.body;
  let conv = conversations.find(c => c.taskId === taskId);
  if (!conv) {
    conv = { _id: 'conv-' + taskId, type: 'task', taskId, displayName: taskTitle, participants: req.body.participants || [], unreadCount: 0, lastMessage: null };
    conversations.push(conv);
    messages[conv._id] = [];
  }
  res.json(conv); // SAME conversation every time - mirrors the real getOrCreateTaskThread's findOne({tenantId, taskId})
});

app.get('/api/chat/:id/messages', auth, (req, res) => {
  res.json(messages[req.params.id] || []);
});

app.post('/api/chat/:id/messages', auth, (req, res) => {
  const msg = {
    _id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
    conversationId: req.params.id,
    senderId: req.user.id,
    senderName: req.user.name,
    text: req.body.text,
    createdAt: new Date().toISOString(),
    readBy: [req.user.id],
  };
  messages[req.params.id] = [...(messages[req.params.id] || []), msg];
  res.json(msg);
});

app.post('/api/chat/:id/read', auth, (req, res) => res.json({ ok: true }));

app.get('/api/tasks/:taskId', auth, (req, res) => {
  if (req.params.taskId !== TASK_ID) return res.status(404).json({ message: 'not found' });
  res.json(TASK);
});

const port = process.env.MOCK_PORT || 5900;
app.listen(port, () => console.log('mock server on', port));
