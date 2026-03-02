/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message } from './types';
import { SYSTEM_PROMPT } from './constants';
import { Send, Image as ImageIcon, User, Bot, Loader2, Calendar, MapPin, Info, X, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [albums, setAlbums] = useState<any[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const res = await fetch('/api/auth/google/status');
        const data = await res.json();
        setIsGoogleConnected(data.connected);
        setTargetAlbumId(data.albumId);
      } catch (e) {
        console.error(e);
      }
    };
    checkGoogleStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);

    const host = window.location.host;
    if (!host) {
      console.error('No host found for WebSocket connection');
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'history') {
        setMessages(message.data.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } else if (message.type === 'message') {
        const newMsg = {
          ...message.data,
          timestamp: new Date(message.data.timestamp)
        };
        setMessages(prev => {
          // Prevent duplicates
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // If it's a user message from us, trigger Gemini
        // We check if it's the last message and it's from user
        // But wait, only the sender should trigger Gemini to avoid 8 calls
        // We can check if the message was sent by us locally
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    };

    return () => {
      socket.close();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64.split(',')[1]);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || !socketRef.current) return;

    const userMessage: Message = {
      id: 'user-' + Date.now().toString(),
      role: 'user',
      text: input,
      image: imagePreview || undefined,
      timestamp: new Date(),
    };

    // Send to server via WebSocket
    socketRef.current.send(JSON.stringify({
      type: 'new_message',
      data: {
        ...userMessage,
        timestamp: userMessage.timestamp.toISOString()
      }
    }));

    const currentInput = input;
    const currentImage = selectedImage;
    
    setInput('');
    setIsLoading(true);
    clearImage();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const contents: any[] = [];
      
      // Use current messages for context
      messages.slice(-10).forEach(msg => {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        });
      });

      // Add current message
      const parts: any[] = [{ text: currentInput }];
      if (currentImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: currentImage
          }
        });
      }

      contents.push({
        role: 'user',
        parts: parts
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }]
        }
      });

      const modelMessage: Message = {
        id: 'model-' + (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      // Send model response to server
      socketRef.current.send(JSON.stringify({
        type: 'new_message',
        data: {
          ...modelMessage,
          timestamp: modelMessage.timestamp.toISOString()
        }
      }));

    } catch (error) {
      console.error("Error calling Gemini:", error);
      // We don't broadcast errors to everyone, just show locally or send a system message
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      window.open(data.url, 'google_auth', 'width=600,height=700');
    } catch (e) {
      console.error(e);
      alert("Failed to connect to the server. Please check your connection.");
    }
  };

  const fetchAlbums = async () => {
    try {
      const res = await fetch('/api/google/albums');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlbums(data);
        setShowAlbumPicker(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectAlbum = async (albumId: string) => {
    try {
      await fetch('/api/google/album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId })
      });
      setTargetAlbumId(albumId);
      setShowAlbumPicker(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="bg-[#5A5A40] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight">Thailand 2026 🌴</h1>
            <p className="text-[10px] opacity-70 font-sans uppercase tracking-[0.2em] font-semibold">Family Trip Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={isGoogleConnected ? fetchAlbums : connectGoogle}
            className={cn(
              "p-2 rounded-full transition-colors flex items-center gap-1",
              isGoogleConnected ? "text-green-400 bg-white/10" : "text-white/60 hover:bg-white/10"
            )}
            title={isGoogleConnected ? (targetAlbumId ? "Album Selected" : "Select Album") : "Connect Google Photos"}
          >
            <Share2 className={cn("w-5 h-5", targetAlbumId && "fill-current")} />
            {isGoogleConnected && <span className="text-[8px] font-bold">{targetAlbumId ? 'SYNCED' : 'LIVE'}</span>}
          </button>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-red-400"
          )} title={isConnected ? "Connected" : "Disconnected"} />
          <button 
            onClick={() => {
              if (window.confirm("Clear all trip history for everyone?")) {
                // We could add a clear history WS event here
              }
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F9F8F6] relative">
        {showAlbumPicker && (
          <div className="absolute inset-x-4 top-4 z-50 bg-white border border-[#5A5A40]/20 rounded-2xl shadow-2xl p-4 max-h-[80%] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-bold text-[#5A5A40]">Select Target Album</h3>
              <button onClick={() => setShowAlbumPicker(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {albums.length === 0 && <p className="text-sm text-gray-500 italic">No albums found. Make sure you've created an album in Google Photos first.</p>}
              {albums.map(album => (
                <button
                  key={album.id}
                  onClick={() => selectAlbum(album.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between",
                    targetAlbumId === album.id ? "border-[#5A5A40] bg-[#5A5A40]/5" : "border-gray-100 hover:border-[#5A5A40]/30"
                  )}
                >
                  <span className="text-sm font-medium">{album.title}</span>
                  {targetAlbumId === album.id && <div className="w-2 h-2 bg-[#5A5A40] rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex w-full gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              msg.role === 'user' ? "bg-[#5A5A40] text-white" : "bg-white border border-[#5A5A40]/20 text-[#5A5A40]"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={cn(
              "max-w-[85%] space-y-2",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              {msg.image && (
                <div className="rounded-2xl overflow-hidden border-2 border-white shadow-sm mb-2 max-w-xs">
                  <img src={msg.image} alt="Uploaded" className="w-full h-auto" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className={cn(
                "p-4 rounded-2xl shadow-sm",
                msg.role === 'user' 
                  ? "bg-[#5A5A40] text-white rounded-tr-none" 
                  : "bg-white text-[#2D2D2D] border border-[#5A5A40]/10 rounded-tl-none"
              )}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                <div className={cn(
                  "text-[10px] mt-2 opacity-50",
                  msg.role === 'user' ? "text-right" : "text-left"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-[#5A5A40]/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#5A5A40]" />
            </div>
            <div className="bg-white border border-[#5A5A40]/10 p-4 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#5A5A40]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-[#5A5A40]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-[#5A5A40]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t border-[#5A5A40]/10">
        {imagePreview && (
          <div className="relative inline-block mb-3">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border-2 border-[#5A5A40]/20" referrerPolicy="no-referrer" />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-[#5A5A40] hover:bg-[#5A5A40]/5 rounded-xl transition-colors"
            title="Upload Image"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about the trip..."
              className="w-full p-3 pr-12 bg-[#F9F8F6] border border-[#5A5A40]/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 resize-none max-h-32 min-h-[52px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={cn(
                "absolute right-2 bottom-2 p-2 rounded-xl transition-all",
                (!input.trim() && !selectedImage) || isLoading
                  ? "text-gray-300 cursor-not-allowed"
                  : "bg-[#5A5A40] text-white hover:bg-[#4A4A30] shadow-md"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between mt-3 px-1">
          <button 
            onClick={() => setInput("What's our plan for today?")}
            className="text-[10px] font-medium text-[#5A5A40] bg-[#5A5A40]/5 px-2 py-1 rounded-full hover:bg-[#5A5A40]/10 transition-colors flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" /> Today's Briefing
          </button>
          <button 
            onClick={() => setInput("Suggest some kid-friendly activities in Samui")}
            className="text-[10px] font-medium text-[#5A5A40] bg-[#5A5A40]/5 px-2 py-1 rounded-full hover:bg-[#5A5A40]/10 transition-colors flex items-center gap-1"
          >
            <Bot className="w-3 h-3" /> Kid Suggestions
          </button>
        </div>
      </footer>
    </div>
  );
}
