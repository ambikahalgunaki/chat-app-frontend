import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import Chat from './Chat';
import Profile from './Profile';

const Dashboard = ({ user, onLogout, onUpdateUser, theme, toggleTheme }) => {
  const [sidebarData, setSidebarData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const res = await API.get('/messages/sidebar', { params: { userId: user.id } });
        if (res.data.success) setSidebarData(res.data.data);
      } catch (err) {
        console.error('Failed to fetch sidebar data:', err);
      }
    };
    fetchSidebarData();

    const socket = connectSocket(user.id);
    socket.on('onlineUsers', (usersList) => setOnlineUsers(usersList));

    socket.on('receiverMessage', () => fetchSidebarData());
    socket.on('messageDelivered', () => fetchSidebarData());
    socket.on('messageRead', () => fetchSidebarData());

    return () => disconnectSocket();
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        try {
          const res = await API.get(`/messages/${user.id}/${selectedUser._id}`);
          setMessages(res.data);
        } catch (err) { console.error('Failed to fetch messages:', err); }
      };
      fetchMessages();
      setMobileView(true);
    }
  }, [selectedUser, user]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setSidebarData(prev => prev.map(d => d.user._id === u._id ? {...d, unreadCount: 0} : d));
  };

  const handleBack = () => { setSelectedUser(null); setMobileView(false); };

  const filteredData = sidebarData.filter(d =>
    d.user.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`dashboard ${mobileView ? 'chat-open' : ''}`}>
      {showProfile && <Profile user={user} onUpdateUser={onUpdateUser} onClose={() => setShowProfile(false)} />}

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="avatar uploadable" onClick={() => setShowProfile(true)}>
              {user.profiePic ? 
                // ✅ REMOVED localhost:3000
                <img src={`${user.profiePic}`} alt={user.name} /> : 
                user.name?.charAt(0)
              }
              <div className="upload-overlay">📷</div>
            </div>
            <h3>{user.name}</h3>
          </div>
          
          <div className="sidebar-actions">
            <button onClick={toggleTheme} className="theme-toggle-btn" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>

        <div className="sidebar-search">
          <input type="text" placeholder="Search or start new chat" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="chat-list">
          {filteredData.length > 0 ? (
            filteredData.map(d => {
              const u = d.user;
              const isOnline = onlineUsers.includes(u._id);
              return (
                <div key={u._id} className={`chat-list-item ${selectedUser?._id === u._id ? 'active' : ''}`} onClick={() => handleSelectUser(u)}>
                  <div className="avatar">
                    {u.profiePic ? 
                      // ✅ REMOVED localhost:3000
                      <img src={`${u.profiePic}`} alt={u.name} /> : 
                      u.name?.charAt(0)
                    }
                    {isOnline && <span className="online-dot"></span>}
                  </div>
                  <div className="chat-list-item-info">
                    <div className="info-top-row">
                      <h4>{u.name}</h4>
                      {d.lastMessage && <span className="last-msg-time">{new Date(d.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <div className="info-bottom-row">
                      <p className="last-message-text">
                        {d.lastMessage ? (d.lastMessage.sender === user.id ? 'You: ' : '') + d.lastMessage.message : 'No messages yet'}
                      </p>
                      {d.unreadCount > 0 && <span className="unread-badge">{d.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-user-found">
              <span className="no-user-icon">🔍</span>
              <p>No user found</p>
            </div>
          )}
        </div>
      </div>

      <div className="chat-area">
        {selectedUser ? (
          <Chat 
            user={user} 
            selectedUser={selectedUser} 
            onlineUsers={onlineUsers} 
            initialMessages={messages} 
            onBack={handleBack} 
            allUsers={sidebarData.map(d => d.user)}
          />
        ) : (
          <div className="no-chat"><h2>Live Chat App</h2><p>Select a chat to start messaging</p></div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;