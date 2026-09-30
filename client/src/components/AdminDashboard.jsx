import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Cpu, HardDrive, Users, Activity, Settings, Shield, 
  UserPlus, Edit2, Trash2, CheckCircle2, XCircle, 
  Server, RefreshCw, Key, ShieldCheck, Database, Clock
} from 'lucide-react';
import { formatBytes, formatDate } from '../utils/format';

export default function AdminDashboard({ token, onClose }) {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'users', 'pools', 'logs', 'settings'
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [pools, setPools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User form modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    quota_gb: 15,
    is_active: 1
  });

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, usersRes, poolsRes, logsRes, settingsRes] = await Promise.all([
        axios.get('/api/admin/metrics', authHeader),
        axios.get('/api/admin/users', authHeader),
        axios.get('/api/admin/pools', authHeader),
        axios.get('/api/admin/logs?limit=50', authHeader),
        axios.get('/api/admin/settings', authHeader)
      ]);

      setMetrics(metricsRes.data);
      setUsers(usersRes.data.users);
      setPools(poolsRes.data.pools);
      setLogs(logsRes.data.logs);
      setSettings(settingsRes.data.settings);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // 10s auto-refresh for TrueNAS live telemetry
    return () => clearInterval(interval);
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/admin/users/${editingUser.id}`, {
          role: formData.role,
          quota_gb: formData.quota_gb,
          is_active: formData.is_active,
          new_password: formData.password || undefined
        }, authHeader);
      } else {
        await axios.post('/api/admin/users', formData, authHeader);
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (confirm(`Are you sure you want to delete user "${username}" and all their files permanently?`)) {
      try {
        await axios.delete(`/api/admin/users/${userId}`, authHeader);
        loadAllData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put('/api/admin/settings', { settings }, authHeader);
      alert('System settings updated successfully!');
      loadAllData();
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950 p-6">
      
      {/* Top Title & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">TrueNAS System Console</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PROXMOX LXC
              </span>
            </div>
            <p className="text-xs text-slate-400">Node Management, Role-Based Access Control & Telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TrueNAS Top Telemetry Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* CPU Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                CPU Load
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{metrics.cpu.cores} Cores</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{metrics.cpu.load}%</span>
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  metrics.cpu.load > 85 ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, metrics.cpu.load)}%` }}
              ></div>
            </div>
          </div>

          {/* Memory Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Memory RAM
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{metrics.memory.percent}%</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{formatBytes(metrics.memory.used)}</span>
              <span className="text-xs text-slate-400">of {formatBytes(metrics.memory.total)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${metrics.memory.percent}%` }}
              ></div>
            </div>
          </div>

          {/* Storage Pool Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                ZFS Storage Pool
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">ONLINE</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-white">{formatBytes(metrics.stats.totalStorageUsed)}</span>
              <span className="text-xs text-slate-400">{metrics.stats.totalFiles} files</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-1/4"></div>
            </div>
          </div>

          {/* System Host Card */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" />
                Proxmox Node
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{metrics.os.platform}</span>
            </div>
            <p className="text-sm font-bold text-white truncate">{metrics.os.distro}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Uptime: {Math.floor(metrics.os.uptimeSeconds / 3600)}h {Math.floor((metrics.os.uptimeSeconds % 3600) / 60)}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {[
          { id: 'users', label: 'Users & Permissions', icon: Users, count: users.length },
          { id: 'pools', label: 'Disks & Storage Pools', icon: HardDrive, count: pools.length },
          { id: 'logs', label: 'Security & Audit Logs', icon: Activity, count: logs.length },
          { id: 'settings', label: 'System Configuration', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Registered Accounts & Access Roles</h3>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({ username: '', email: '', password: '', role: 'user', quota_gb: 15, is_active: 1 });
                setShowUserModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Storage Quota</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const usedPercent = u.quota_bytes > 0 ? Math.round((u.used_bytes / u.quota_bytes) * 100) : 0;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{u.username}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-36">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>{formatBytes(u.used_bytes)}</span>
                            <span>{formatBytes(u.quota_bytes)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usedPercent}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active === 1 ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 text-[11px] font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {formatDate(u.created_at).split(',')[0]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setFormData({
                                username: u.username,
                                email: u.email,
                                password: '',
                                role: u.role,
                                quota_gb: Math.round(u.quota_bytes / (1024 * 1024 * 1024)),
                                is_active: u.is_active
                              });
                              setShowUserModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Permissions & Quota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STORAGE POOLS */}
      {activeTab === 'pools' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Physical Disks & Mounted Pools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics?.disks?.map((disk, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{disk.mount}</p>
                      <p className="text-[10px] text-slate-400">{disk.fs} ({disk.type})</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    MOUNTED
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Used: {formatBytes(disk.used)}</span>
                    <span>Total: {formatBytes(disk.size)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${disk.usePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">{disk.usePercent}% capacity used</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Security & Operational Activity Logs</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4 w-40">Timestamp</th>
                  <th className="py-3 px-4 w-32">User</th>
                  <th className="py-3 px-4 w-36">Action</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4 w-36 text-right">Client IP (CF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400">{formatDate(log.created_at)}</td>
                    <td className="py-2.5 px-4 text-blue-400 font-semibold">{log.username}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">{log.details}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">{log.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Global Storage & Reverse Proxy Settings</h3>
          
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Server Brand Name</label>
              <input
                type="text"
                value={settings.app_name || ''}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default User Quota (GB)</label>
              <input
                type="number"
                value={settings.default_quota_gb || '15'}
                onChange={(e) => setSettings({ ...settings, default_quota_gb: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">Public Registration</p>
                <p className="text-[10px] text-slate-400">Allow new visitors to register their own account</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allow_public_registration === 'true'}
                onChange={(e) => setSettings({ ...settings, allow_public_registration: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-200">WebDAV Storage Protocol</p>
                <p className="text-[10px] text-slate-400">Enable network drive mapping for Windows, Mac, and mobile</p>
              </div>
              <input
                type="checkbox"
                checked={settings.webdav_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, webdav_enabled: e.target.checked ? 'true' : 'false' })}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all mt-4"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* USER EDIT / CREATE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingUser ? `Edit User: ${editingUser.username}` : 'Create New User Account'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Access Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="user">Standard User (Personal Drive)</option>
                  <option value="admin">Administrator (Full System & User Control)</option>
                  <option value="guest">Guest (Read Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Storage Quota (GB)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quota_gb}
                  onChange={(e) => setFormData({ ...formData, quota_gb: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {editingUser && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300">Account Active</span>
                  <input
                    type="checkbox"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
