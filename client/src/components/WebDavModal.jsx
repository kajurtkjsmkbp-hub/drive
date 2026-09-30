import React, { useState } from 'react';
import { 
  X, Monitor, Smartphone, Terminal, Copy, Check, 
  ExternalLink, HardDrive, ShieldCheck, Download, Laptop
} from 'lucide-react';

export default function WebDavModal({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('windows');
  const [copied, setCopied] = useState(false);

  const serverUrl = `${window.location.origin}/webdav`;
  const windowsCmd = `net use Z: "${serverUrl}" /user:${user?.username || 'username'} [YOUR_PASSWORD] /persistent:yes`;

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Desktop & Mobile Drive Setup</h2>
              <p className="text-[11px] text-slate-400">Mount as a local disk (Z:) in Windows Explorer, macOS & Android</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40 gap-4">
          {[
            { id: 'windows', label: 'Windows (Drive Z:)', icon: Laptop },
            { id: 'mac', label: 'macOS Finder', icon: HardDrive },
            { id: 'mobile', label: 'Mobile (Android / iOS)', icon: Smartphone },
            { id: 'rclone', label: 'Nextcloud / Rclone', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'border-b-2 border-blue-500 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-300">
          
          {/* Universal Server Endpoint Info */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400">Your Personal WebDAV Endpoint</span>
              <button
                onClick={() => copyText(serverUrl)}
                className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="font-mono text-cyan-300 bg-slate-900 px-3 py-2 rounded-xl text-xs select-all">
              {serverUrl}
            </p>
            <p className="text-[10px] text-slate-500 mt-2">
              Authentication: Use your AetherDrive username (<span className="text-blue-400 font-mono">{user?.username}</span>) and account password.
            </p>
          </div>

          {/* TAB 1: WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-3">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-1">Option 1: 1-Click Command (CMD / PowerShell)</h4>
                <p className="text-[11px] text-slate-300 mb-3">
                  Open Command Prompt (cmd) or PowerShell, then paste this command to instantly mount Drive <span className="font-mono text-cyan-300">Z:</span>
                </p>
                <div className="relative">
                  <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-blue-300 overflow-x-auto select-all">
                    {windowsCmd}
                  </pre>
                  <button
                    onClick={() => copyText(windowsCmd)}
                    className="absolute right-2 top-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-2">Option 2: Windows File Explorer GUI</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                  <li>Open <span className="text-slate-200 font-medium">File Explorer</span> and click <span className="text-slate-200 font-medium">This PC</span>.</li>
                  <li>Click <span className="text-slate-200 font-medium">Map Network Drive</span> at the top ribbon.</li>
                  <li>Select Drive Letter: <span className="text-cyan-400 font-mono">Z:</span></li>
                  <li>In the Folder box, paste: <span className="text-cyan-400 font-mono">{serverUrl}</span></li>
                  <li>Check <span className="text-slate-200 font-medium">"Connect using different credentials"</span>.</li>
                  <li>Click Finish and enter your AetherDrive username and password.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: MACOS */}
          {activeTab === 'mac' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-xs mb-2">Connect via macOS Finder</h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>Switch to <span className="text-slate-200 font-medium">Finder</span>.</li>
                <li>Press <span className="text-slate-200 font-mono">Cmd + K</span> (or click <span className="text-slate-200 font-medium">Go &gt; Connect to Server</span>).</li>
                <li>Enter the Server Address: <span className="text-cyan-400 font-mono">{serverUrl}</span></li>
                <li>Click <span className="text-slate-200 font-medium">Connect</span>.</li>
                <li>Select "Registered User" and type your username and password.</li>
                <li>The drive will appear directly on your Desktop and in Finder's sidebar!</li>
              </ol>
            </div>
          )}

          {/* TAB 3: MOBILE */}
          {activeTab === 'mobile' && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <h4 className="font-bold text-white text-xs mb-1">Android & iOS Integration</h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  You can browse and sync your files seamlessly on mobile using standard WebDAV apps:
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="font-bold text-slate-200">CX File Explorer</p>
                    <p className="text-[10px] text-emerald-400 mt-1">Recommended for Android</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="font-bold text-slate-200">Documents by Readdle</p>
                    <p className="text-[10px] text-cyan-400 mt-1">Recommended for iOS / iPad</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  In the app: Tap <span className="text-slate-200">Network / Add Storage</span> &gt; choose <span className="text-slate-200">WebDAV</span> &gt; enter your endpoint and login credentials.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SYNC AGENTS */}
          {activeTab === 'rclone' && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="font-bold text-white text-xs mb-2">Automated Background Sync (Rclone / FreeFileSync)</h4>
              <p className="text-[11px] text-slate-400">
                You can configure <span className="text-slate-200 font-medium">Rclone</span> to sync local folders automatically to your Proxmox drive:
              </p>
              <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[10px] text-cyan-300 overflow-x-auto">
{`[aetherdrive]
type = webdav
url = ${serverUrl}
vendor = other
user = ${user?.username || 'admin'}
pass = [obscured_password]`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
