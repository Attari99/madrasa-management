import { useState } from "react";
import { Send, Bell } from "lucide-react";
import { db, generateId, logActivity, storage } from "@/utils/storage";
import type { Ustad, Class, Notification } from "@/utils/storage";
import { useAuth } from "@/contexts/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "ustad" | "class">("all");
  const [recipientId, setRecipientId] = useState("");

  const ustads = db.getAll<Ustad>("ustads").filter(u => u.status === "active");
  const classes = db.getAll<Class>("classes");
  const notifications = (storage.get<Notification[]>("notifications") ?? []).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  const handleSend = () => {
    if (!message.trim()) return alert("Please write a message");
    let recipient = "all";
    if (recipientType === "ustad" && recipientId) recipient = recipientId;
    else if (recipientType === "class" && recipientId) recipient = recipientId;
    const notif: Notification = { id: generateId(), message: message.trim(), recipient, sentAt: new Date().toISOString(), sentBy: user?.id || "" };
    const existing = storage.get<Notification[]>("notifications") ?? [];
    storage.set("notifications", [notif, ...existing]);
    logActivity("Sent notification", "notification", notif.id, user?.id || "");
    alert("Notification sent!");
    setMessage("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Send messages to teachers and classes</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold">Compose Notification</h3>
        <div>
          <label>Recipient</label>
          <div className="flex gap-3 mt-1 flex-wrap">
            <select value={recipientType} onChange={e => { setRecipientType(e.target.value as any); setRecipientId(""); }} className="px-3 py-2 border rounded">
              <option value="all">All Teachers</option>
              <option value="ustad">Specific Ustad</option>
              <option value="class">Specific Class</option>
            </select>
            {recipientType === "ustad" && (
              <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="px-3 py-2 border rounded">
                <option value="">Select ustad</option>
                {ustads.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            )}
            {recipientType === "class" && (
              <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="px-3 py-2 border rounded">
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
              </select>
            )}
          </div>
        </div>
        <div>
          <label>Message *</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            rows={4} 
            className="w-full px-3 py-2 border rounded mt-1" 
            placeholder="Write your message here..." 
          />
        </div>
        <button onClick={handleSend} className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2">
          <Send className="w-4 h-4" /> Send Notification
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b">
          <Bell className="w-4 h-4 inline mr-2 text-primary" />
          <span className="font-semibold">Notification History</span>
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No notifications sent</div>
        ) : (
          <div className="divide-y">
            {notifications.map(n => (
              <div key={n.id} className="px-5 py-4">
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.sentAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}