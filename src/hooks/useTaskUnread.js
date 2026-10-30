import { useCallback } from 'react';
import API from '../api/axiosConfig';
import { useChat } from '../components/useChat';

/**
 * Unread message count per task (Manage Delegation, Manage Checklist, My Tasks).
 * Uses the chat system that already tracks unread messages for every task thread,
 * so the count goes up live when someone sends a message and is cleared by markRead().
 */
export default function useTaskUnread() {
    const { conversations, loadConversations } = useChat();

    const findConv = (taskId) =>
        (conversations || []).find((c) => c && c.taskId && String(c.taskId) === String(taskId));

    // How many messages on this task the logged-in user has not read yet.
    const unreadFor = (taskId) => {
        const c = findConv(taskId);
        return c && c.unreadCount > 0 ? c.unreadCount : 0;
    };

    // Marks the task's messages as read (server) and refreshes the counts so the badge disappears.
    const markRead = useCallback(async (taskId) => {
        const c = (conversations || []).find((x) => x && x.taskId && String(x.taskId) === String(taskId));
        if (!c || !(c.unreadCount > 0)) return;
        try {
            await API.post(`/chat/${c._id}/read`);
            await loadConversations();
        } catch { /* badge stays; the next click tries again */ }
    }, [conversations, loadConversations]);

    return { unreadFor, markRead };
}