import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import { getSocket } from '../services/socket';
import EmojiPicker from 'emoji-picker-react';

const Chat = ({ user, selectedUser, onlineUsers, initialMessages, onBack, allUsers }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  
  // Context Menu, Delete Modal, Reply, Forward & Toast States
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, message: null });
  const [messageToDelete, setMessageToDelete] = useState(null); 
  const [replyingTo, setReplyingTo] = useState(null); 
  const [forwardingMessage, setForwardingMessage] = useState(null); 
  const [showCopyToast, setShowCopyToast] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); 
  const typingTimeoutRef = useRef(null); 

  useEffect(() => { setMessages(initialMessages); }, [initialMessages, selectedUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const unreadMsgs = initialMessages.filter(m => m.sender !== user.id && m.status !== 'read');
    if (unreadMsgs.length > 0) unreadMsgs.forEach(m => socket.emit('messageRead', { messageId: m._id, senderId: m.sender }));
  }, [initialMessages, user]);

  useEffect(() => { setIsTyping(false); setReplyingTo(null); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); }, [selectedUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      if (data.sender === selectedUser._id || data.receiver === selectedUser._id) {
        setMessages(prev => [...prev, data]);
        if (data.sender === selectedUser._id) socket.emit('messageRead', { messageId: data._id, senderId: data.sender });
      }
    };
    const handleMessageDelivered = ({ messageId }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
    const handleMessageRead = ({ messageId }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'read' } : m));
    const handleTyping = ({ sender }) => {
      if (sender === selectedUser._id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };
    const handleStopTyping = ({ sender }) => { if (sender === selectedUser._id) { setIsTyping(false); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); } };
    const handleMessageDeleted = (data) => {
      if (data.isDeleted) {
        setMessages(prev => prev.map(m => m._id === data._id ? { ...m, message: data.message, isDeleted: true } : m));
      } else {
        setMessages(prev => prev.filter(m => m._id !== data._id));
      }
    };

    socket.on('receiverMessage', handleReceiveMessage);
    socket.on('messageDelivered', handleMessageDelivered);
    socket.on('messageRead', handleMessageRead);
    socket.on('userTyping', handleTyping);
    socket.on('userStopTyping', handleStopTyping);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('receiverMessage', handleReceiveMessage);
      socket.off('messageDelivered', handleMessageDelivered);
      socket.off('messageRead', handleMessageRead);
      socket.off('userTyping', handleTyping);
      socket.off('userStopTyping', handleStopTyping);
      socket.off('messageDeleted', handleMessageDeleted);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX > window.innerWidth - 200 ? e.clientX - 180 : e.clientX;
    const y = e.clientY > window.innerHeight - 250 ? e.clientY - 250 : e.clientY;
    setContextMenu({ visible: true, x, y, message: msg });
  };

  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const openDeleteModal = () => {
    setMessageToDelete(contextMenu.message);
    closeContextMenu();
  };

  const handleReply = () => {
    setReplyingTo(contextMenu.message);
    closeContextMenu();
    if (inputRef.current) inputRef.current.focus(); 
  };

  const handleForward = () => {
    setForwardingMessage(contextMenu.message);
    closeContextMenu();
  };

  const handleCopy = () => {
    if (contextMenu.message) {
      navigator.clipboard.writeText(contextMenu.message.message);
      closeContextMenu();
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  const forwardToUser = async (targetUser) => {
    const msgData = { sender: user.id, receiver: targetUser._id, message: forwardingMessage.message };
    try {
      const res = await API.post('/messages/send', msgData);
      const socket = getSocket();
      if (socket) socket.emit('sendMessage', res.data);
      
      if (targetUser._id === selectedUser._id) {
        setMessages(prev => [...prev, res.data]);
      }
      
      setForwardingMessage(null); 
    } catch (err) { console.error('Failed to forward message', err); }
  };

  const deleteForMe = async () => {
    try {
      await API.delete(`/messages/${messageToDelete._id}`, { data: { deleteForEveryone: false } });
      setMessages(prev => prev.filter(m => m._id !== messageToDelete._id));
      setMessageToDelete(null);
    } catch (err) { console.error('Failed to delete', err); }
  };

  const deleteForEveryone = async () => {
    try {
      await API.delete(`/messages/${messageToDelete._id}`, { data: { deleteForEveryone: true } });
      const updatedMsg = { ...messageToDelete, message: '🚫 This message was deleted', isDeleted: true };
      setMessages(prev => prev.map(m => m._id === messageToDelete._id ? updatedMsg : m));
      const socket = getSocket();
      if (socket) socket.emit('messageDeleted', { ...updatedMsg, receiver: messageToDelete.receiver === user.id ? messageToDelete.sender : messageToDelete.receiver });
      setMessageToDelete(null);
    } catch (err) { console.error('Failed to delete', err); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    let finalMessage = newMessage;
    if (replyingTo) {
      finalMessage = `↩️ Replying to ${replyingTo.sender === user.id ? 'yourself' : selectedUser.name}: "${replyingTo.message}"\n\n${newMessage}`;
    }

    const msgData = { sender: user.id, receiver: selectedUser._id, message: finalMessage };
    
    try {
      const res = await API.post('/messages/send', msgData);
      setMessages(prev => [...prev, res.data]);
      const socket = getSocket();
      if (socket) {
        socket.emit('sendMessage', res.data);
        socket.emit('stopTyping', { sender: user.id, receiver: selectedUser._id });
      }
      setNewMessage('');
      setShowEmoji(false);
      setReplyingTo(null); 
    } catch (err) { console.error('Failed to send message'); }
  };

  const handleTypingStatus = (e) => {
    const text = e.target.value;
    setNewMessage(text);
    const socket = getSocket();
    if (!socket) return;
    if (text) socket.emit('typing', { sender: user.id, receiver: selectedUser._id });
    else socket.emit('stopTyping', { sender: user.id, receiver: selectedUser._id });
  };

  const onEmojiClick = (emojiObject) => { setNewMessage(prev => prev + emojiObject.emoji); };

  const renderTicks = (status) => {
    if (status === 'read') return <span className="msg-status read">✓✓</span>;
    if (status === 'delivered') return <span className="msg-status delivered">✓✓</span>;
    return <span className="msg-status sent">✓</span>;
  };

  return (
    <div className="chat-window" onClick={closeContextMenu}>
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="avatar">
          {selectedUser.profiePic ? <img src={`http://localhost:3000${selectedUser.profiePic}`} alt={selectedUser.name} /> : selectedUser.name?.charAt(0)}
          {onlineUsers.includes(selectedUser._id) && <span className="online-dot"></span>}
        </div>
        <div className="chat-header-info">
          <h3>{selectedUser.name}</h3>
          <p style={{ color: isTyping ? '#25d366' : '#667781', fontStyle: isTyping ? 'italic' : 'normal' }}>
            {isTyping ? 'typing...' : (onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline')}
          </p>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div 
            key={msg._id || idx} 
            className={`message ${msg.sender === user.id ? 'sent' : 'received'}`}
            // FIX 1: Removed !msg.isDeleted so right-click works on deleted messages
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            {/* FIX 2: Removed !msg.isDeleted so the arrow shows on deleted messages */}
            <button className="message-dropdown-btn" onClick={(e) => handleContextMenu(e, msg)}>▾</button>
            
            <p className={msg.isDeleted ? 'deleted-message' : ''}>{msg.message}</p>
            
            {/* Show time and ticks for normal messages */}
            {!msg.isDeleted && (
              <div className="message-meta">
                <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.sender === user.id && renderTicks(msg.status)}
              </div>
            )}
            
            {/* Show time for deleted messages (like WhatsApp) */}
            {msg.isDeleted && (
              <div className="message-meta deleted-meta">
                <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Menu Dropdown */}
      {contextMenu.visible && (
        <div className="context-menu" style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
          {/* FIX 3: Only show Reply/Copy/Forward if the message is NOT deleted */}
          {!contextMenu.message.isDeleted && (
            <>
              <div className="context-menu-item" onClick={handleReply}>Reply</div>
              <div className="context-menu-item" onClick={handleCopy}>Copy</div>
              <div className="context-menu-item" onClick={handleForward}>Forward</div>
            </>
          )}
          {/* Always show Delete option */}
          <div className="context-menu-item context-item-delete" onClick={openDeleteModal}>Delete</div>
        </div>
      )}

      {/* Delete Modal */}
      {messageToDelete && (
        <div className="delete-modal-overlay" onClick={() => setMessageToDelete(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete message?</h3>
            {/* Only show "Delete for everyone" if it's not already deleted and you are the sender */}
            {!messageToDelete.isDeleted && messageToDelete.sender === user.id && (
              <button className="btn-delete-everyone" onClick={deleteForEveryone}>Delete for everyone</button>
            )}
            <button className="btn-delete-me" onClick={deleteForMe}>Delete for me</button>
            <button className="btn-cancel" onClick={() => setMessageToDelete(null)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <div className="modal-overlay" onClick={() => setForwardingMessage(null)}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Forward message to...</h3>
            <div className="forward-user-list">
              {allUsers?.map(u => (
                <div key={u._id} className="forward-user-item" onClick={() => forwardToUser(u)}>
                  <div className="avatar small">
                    {u.profiePic ? <img src={`http://localhost:3000${u.profiePic}`} alt={u.name} /> : u.name?.charAt(0)}
                  </div>
                  <span>{u.name}</span>
                </div>
              ))}
            </div>
            <button className="btn-cancel" onClick={() => setForwardingMessage(null)} style={{marginTop: '10px', width: '100%'}}>CANCEL</button>
          </div>
        </div>
      )}

      {showEmoji && (
        <div className="emoji-picker-container">
          <EmojiPicker onEmojiClick={onEmojiClick} height={300} width="100%" />
        </div>
      )}

      <form className="chat-input-wrapper" onSubmit={handleSend}>
        {replyingTo && (
          <div className="reply-preview-bar">
            <div className="reply-preview-content">
              <strong>{replyingTo.sender === user.id ? 'You' : selectedUser.name}</strong>
              <p>{replyingTo.message}</p>
            </div>
            <button type="button" className="reply-close-btn" onClick={() => setReplyingTo(null)}>✕</button>
          </div>
        )}
        
        <div className="chat-input">
          <button type="button" className="emoji-btn" onClick={() => setShowEmoji(!showEmoji)}>😀</button>
          <input 
            ref={inputRef}
            type="text" 
            placeholder={replyingTo ? `Replying to ${replyingTo.sender === user.id ? 'yourself' : selectedUser.name}...` : "Type a message"} 
            value={newMessage} 
            onChange={handleTypingStatus} 
            autoFocus
          />
          <button type="submit">Send</button>
        </div>
      </form>

      {/* COPY TOAST NOTIFICATION */}
      {showCopyToast && (
        <div className="copy-toast">Message copied</div>
      )}

    </div>
  );
};

export default Chat;