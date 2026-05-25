import React, { useState, useEffect, useRef } from 'react';
import { SYSTEM_API_KEYS, getSavedRotatorIndex, saveRotatorIndex } from './apiKeys';
const logoImg = "/logo.jpg";
import { 
  Key, 
  Upload, 
  FileAudio, 
  FileVideo, 
  Play, 
  Pause, 
  Clock, 
  Copy, 
  Check, 
  RefreshCw, 
  RotateCcw, 
  Activity, 
  Radio, 
  AlertCircle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

// Type definitions
interface Headline {
  cat: 'hard' | 'quote' | 'warning' | 'political' | 'curiosity' | 'general';
  text: string;
  ts: string | null;
}

const CATEGORIES = {
  hard: { 
    label: "তথ্যভিত্তিক (Hard News)", 
    color: "#e53e3e", 
    borderClass: "border-l-[#e53e3e]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(229,62,62,0.1)] hover:border-[#e53e3e]/30" 
  },
  quote: { 
    label: "উদ্ধৃতিমূলক (Direct Quote)", 
    color: "#3b82f6", 
    borderClass: "border-l-[#3b82f6]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:border-[#3b82f6]/30" 
  },
  warning: { 
    label: "হুঁশিয়ারিমূলক (Warning)", 
    color: "#ef4444", 
    borderClass: "border-l-[#ef4444]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(239,68,68,0.1)] hover:border-[#ef4444]/30" 
  },
  political: { 
    label: "রাজনৈতিক (Political)", 
    color: "#f59e0b", 
    borderClass: "border-l-[#f59e0b]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(245,158,11,0.1)] hover:border-[#f59e0b]/30" 
  },
  curiosity: { 
    label: "কৌতূহলোদ্দীপক (Curiosity)", 
    color: "#a855f7", 
    borderClass: "border-l-[#a855f7]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(168,85,247,0.1)] hover:border-[#a855f7]/30" 
  },
  general: { 
    label: "সাধারণ ভিডিও (General)", 
    color: "#e53e3e", 
    borderClass: "border-l-[#e53e3e]", 
    bgGlow: "hover:shadow-[0_2px_10px_rgba(229,62,62,0.08)] hover:border-[#e53e3e]/20" 
  }
};

const TICKER_TEXT = "• NewsForge AI: অডিও ও ভিডিও ফাইল থেকে সেকেন্ডে তৈরি করুন আকর্ষণীয় নিউজ হেডলাইন • বক্তার প্রকৃত বক্তব্যের বাইরে কোনো কাল্পনিক তথ্য যোগ করা হবে না • রিপোর্টার সাঈদ আল মাহদীর একটি বিশেষ উদ্যোগ ";

const NEWS_MODE_PROMPT = `তুমি একজন অভিজ্ঞ বাংলাদেশি 'চিফ নিউজ এডিটর'।

তোমার কাজ:
এই অডিও/ভিডিও ফাইলটি মনোযোগ দিয়ে শোনো। বক্তা যা বলেছেন, শুধুমাত্র সেই বাস্তব কথার উপর ভিত্তি করে শিরোনাম তৈরি করো।

কঠিন নিষেধ:
- বক্তা যা বলেননি তা শিরোনামে লেখা যাবে না।
- কোনো কাল্পনিক তথ্য, ঘটনা বা উদ্ধৃতি যোগ করা করা যাবে না।
- অডিও স্পষ্ট না হলে "অডিও স্পষ্ট নয়" বলো, কিছু বানিয়ে দিও না।

শিরোনাম তৈরির নিয়ম:
১. বক্তব্যের সবচেয়ে গুরুত্বপূর্ণ তথ্যটি খুঁজে বের করো।
২. জনজীবনে প্রভাব ফেলে এমন তথ্যকে প্রাধান্য দাও।
৩. বক্তার শক্তিশালী শব্দ যেমন 'জিরো টলারেন্স', 'কঠোর ব্যবস্থা', 'ছাড় দেওয়া হবে না' — এগুলো সরাসরি উদ্ধৃতি হিসেবে ব্যবহার করো।
৪. শিরোনাম সংক্ষিপ্ত ও ঝাঁজালো রাখো।

উদ্ধৃতি শিরোনামের জন্য অডিওতে ওই কথাটি কত সেকেন্ডে বলা হয়েছে তা আনুমানিকভাবে উল্লেখ করো।

৫টি ক্যাটাগরিতে মোট ৩০টির বেশি শিরোনাম দাও (প্রতি ক্যাটাগরিতে কমপক্ষে ৬টি):

ক্যাটাগরি ১ — "hard" (তথ্যভিত্তিক Hard News):
বস্তুনিষ্ঠ, তথ্যবহুল। কে কী করলেন বা ঘোষণা দিলেন।
ক্যাটাগরি ২ — "quote" (উদ্ধৃতিমূলক Direct Quote):
হুবহু বক্তার কথা, একক উদ্ধৃতি চিহ্নে ('...') মুড়িয়ে।
ক্যাটাগরি ৩ — "warning" (হুঁশিয়ারিমূলক Warning/Action):
কঠোর সতর্কবার্তা বা শাস্তির ঘোষণা।
ক্যাটাগরি ৪ — "political" (রাজনৈতিক/আক্রমণাত্মক Political/Conflict):
রাজনৈতিক প্রতিপক্ষ বা সংঘাতের বিষয়।
ক্যাটাগরি ৫ — "curiosity" (কৌতূহলোদ্দীপক Curiosity/Question):
দর্শকের মনে প্রশ্ন জাগায়, টকশো বা থাম্বনেইলের জন্য।

শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দাও, অন্য কোনো টেক্সট, মার্কডাউন বা backtick দেবে না:

{
  "headlines": [
    {"cat": "hard",      "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "quote",     "text": "'উদ্ধৃতি এখানে'",     "ts": "0:34"},
    {"cat": "warning",   "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "political", "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "curiosity", "text": "শিরোনাম এখানে?",     "ts": null}
  ]
}

ts ফিল্ডে: উদ্ধৃতির জন্য আনুমানিক সময় দাও (যেমন "0:34"), অন্যগুলোর জন্য null রাখো।`;

const GENERAL_MODE_PROMPT = `এই ভিডিও/অডিওটি দেখো/শোনো এবং বিষয়বস্তু বিশ্লেষণ করে ১০-১৫টি আকর্ষণীয় বাংলা শিরোনাম বা ক্যাপশন তৈরি করো। শুধুমাত্র ভিডিওতে যা আছে তার উপর ভিত্তি করে শিরোনাম দাও।

শুধুমাত্র JSON ফরম্যাটে দাও, অন্য কোনো টেক্সট বা backtick দেবে না:
{
  "headlines": [
    {"cat": "general", "text": "শিরোনাম এখানে", "ts": null}
  ]
}`;

const TEXT_NEWS_MODE_PROMPT = `তুমি একজন অভিজ্ঞ বাংলাদেশি 'চিফ নিউজ এডিটর'।

তোমার কাজ:
নিচে দেওয়া খবর বা টেক্সটটি মনোযোগ দিয়ে পড়ো এবং শুধুমাত্র এই খবরের বাস্তব তথ্যের উপর ভিত্তি করে শিরোনাম তৈরি করো।

কঠিন নিষেধ:
- টেক্সটে যা নেই তা শিরোনামে লেখা যাবে না।
- কোনো কাল্পনিক তথ্য, ঘটনা বা উদ্ধৃতি যোগ করা করা যাবে না।
- নিজের থেকে কোনো তথ্য বানিয়ে দিও না।

শিরোনাম তৈরির নিয়ম:
১. খবরের সবচেয়ে গুরুত্বপূর্ণ তথ্যটি খুঁজে বের করো।
২. জনজীবনে প্রভাব ফেলে এমন তথ্যকে প্রাধান্য দাও।
৩. টেক্সটের শক্তিশালী শব্দ যেমন 'জিরো টলারেন্স', 'কঠোর ব্যবস্থা', 'ছাড় দেওয়া হবে না' — এগুলো সরাসরি উদ্ধৃতি হিসেবে ব্যবহার করো।
৪. শিরোনাম সংক্ষিপ্ত ও ঝাঁজালো রাখো।

৫টি ক্যাটাগরিতে মোট ৩০টির বেশি শিরোনাম দাও (প্রতি ক্যাটাগরিতে কমপক্ষে ৬টি):

ক্যাটাগরি ১ — "hard" (তথ্যভিত্তিক Hard News):
বস্তুনিষ্ঠ, তথ্যবহুল। কে কী করলেন বা ঘোষণা দিলেন।
ক্যাটাগরি ২ — "quote" (উদ্ধৃতিমূলক Direct Quote):
হুবহু বক্তার কথা বা বক্তব্য থেকে গুরুত্বপূর্ণ উক্তি, একক উদ্ধৃতি চিহ্নে ('...') মুড়িয়ে।
ক্যাটাগরি ৩ — "warning" (হুঁশিয়ারিমূলক Warning/Action):
কঠোর সতর্কবার্তা বা শাস্তির ঘোষণা।
ক্যাটাগরি ৪ — "political" (রাজনৈতিক/আক্রমণাত্মক Political/Conflict):
রাজনৈতিক প্রতিপক্ষ বা সংঘাতের বিষয়।
क্যাটাগরি ৫ — "curiosity" (কৌতূহলোদ্দীপক Curiosity/Question):
দর্শকের মনে প্রশ্ন জাগায়, টকশো বা থাম্বনেইলের জন্য।

শুধুমাত্র নিচের JSON ফরম্যাটে উত্তর দাও, অন্য কোনো টেক্সট, মার্কডাউন বা backtick দেবে না:

{
  "headlines": [
    {"cat": "hard",      "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "quote",     "text": "'উদ্ধৃতি এখানে'",     "ts": null},
    {"cat": "warning",   "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "political", "text": "শিরোনাম এখানে",      "ts": null},
    {"cat": "curiosity", "text": "শিরোনাম এখানে?",     "ts": null}
  ]
}

ts ফিল্ডে: টেক্সট ইনপুটের ক্ষেত্রে কোনো টাইমস্ট্যাম্প (ts) ফিল্ডের প্রয়োজন নেই, তাই ts সবসময় null রাখবে।`;

const TEXT_GENERAL_MODE_PROMPT = `এই খবর বা টেক্সটটি বিশ্লেষণ করে ১০-১৫টি আকর্ষণীয় বাংলা শিরোনাম বা সোশ্যাল মিডিয়া ক্যাপশন তৈরি করো। শুধুমাত্র লেখার বিষয়বস্তুর উপর ভিত্তি করে শিরোনাম দাও।

শুধুমাত্র JSON ফরম্যাটে দাও, অন্য কোনো টেক্সট বা backtick দেবে না:
{
  "headlines": [
    {"cat": "general", "text": "শিরোনাম এখানে", "ts": null}
  ]
}`;

export default function App() {
  // Key state
  const [keySource, setKeySource] = useState<'rotator' | 'custom'>('rotator');
  const [currentRotatorIndex, setCurrentRotatorIndex] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  // File loading state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Option states
  const [videoType, setVideoType] = useState<'news' | 'general'>('news');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [inputMode, setInputMode] = useState<'media' | 'text'>('media');
  const [inputText, setInputText] = useState<string>('');
  const [speakerName, setSpeakerName] = useState<string>('');

  // AI & results execution states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [accumulatedHeadlines, setAccumulatedHeadlines] = useState<Headline[]>([]);
  const [displayedHeadlines, setDisplayedHeadlines] = useState<Headline[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast feedback
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load API Key on mount
  useEffect(() => {
    const savedSource = localStorage.getItem('gemini_key_source') || 'rotator';
    setKeySource(savedSource as 'rotator' | 'custom');

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }

    const savedIdx = getSavedRotatorIndex();
    setCurrentRotatorIndex(savedIdx);

    // If source is custom and there's no custom key, prompt the user. 
    // Otherwise keep it collapsed since rotator is active out-of-the-box.
    if (savedSource === 'custom' && !savedKey) {
      setShowKeyInput(true);
    } else {
      setShowKeyInput(false);
    }
  }, []);

  // Update audio source when file changes
  useEffect(() => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      if (audioRef.current) {
        audioRef.current.src = url;
        setIsPlaying(false);
        setCurrentTime(0);
      }
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [uploadedFile]);

  // Helper: Toast Trigger
  const showToast = (msg: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Helper: Save API Key
  const handleSaveApiKey = () => {
    const key = tempApiKey.trim();
    if (!key) {
      showToast('Gemini API Key দিন');
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowKeyInput(false);
    showToast('API Key সেভ হয়েছে ✓');
  };

  // Helper: Erase Key
  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setTempApiKey('');
    setShowKeyInput(true);
    showToast('API Key মুছে ফেলা হয়েছে');
  };

  // Helper: File constraint auditor
  const processSelectedFile = (file: File) => {
    const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB in bytes
    if (file.size > MAX_SIZE) {
      showToast('ফাইল সর্বোচ্চ ১ GB হতে পারবে');
      return;
    }

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      showToast('শুধুমাত্র অডিও বা ভিডিও ফাইল আপলোড করুন');
      return;
    }

    setUploadedFile(file);
    // Reset previous generation when loading new file
    setAccumulatedHeadlines([]);
    setDisplayedHeadlines([]);
    showToast('ফাইল লোড সফল হয়েছে ✓');
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Audio Playback Controllers
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Audio playback error:", err);
          showToast('প্লে করতে ব্যর্থ হয়েছে');
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const seekToTime = (timeString: string) => {
    if (!audioRef.current) return;
    const parts = timeString.split(':').map(Number);
    if (parts.length < 2) return;
    
    let seconds = 0;
    if (parts.length === 3) {
      // H:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      // MM:SS
      seconds = parts[0] * 60 + parts[1];
    }

    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true));
    }
    showToast(`⏱ ${timeString} সময়ে নিয়ে যাওয়া হয়েছে`);
  };

  // Binary converter
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Keep clean base64 data stream
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  };

  // Sequential Streaming Headline Animator (150ms intervals)
  const triggerStreamingRender = (newHeads: Headline[], isRegenerating: boolean) => {
    if (!isRegenerating) {
      setDisplayedHeadlines([]);
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < newHeads.length) {
        const item = newHeads[index];
        if (item) {
          setDisplayedHeadlines(prev => [...prev, item]);
        }
        index++;
      } else {
        clearInterval(interval);
      }
    }, 150);
  };

  // API Headline Generator
  const generateHeadlines = async (isRegenerating: boolean = false) => {
    if (keySource === 'custom' && !apiKey) {
      showToast('আপনার নিজস্ব Gemini API Key দিন');
      setShowKeyInput(true);
      return;
    }
    if (inputMode === 'media' && !uploadedFile) {
      showToast('আগে একটি ফাইল আপলোড করুন');
      return;
    }
    if (inputMode === 'text' && !inputText.trim()) {
      showToast('বিশ্লেষণ করার জন্য আপনার খবর বা টেক্সটটি লিখুন');
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(10);
      setStatusMessage(inputMode === 'media' ? 'ফাইলটি পড়া হচ্ছে...' : 'টেক্সট বা লেখাটি প্রস্তুত করা হচ্ছে...');

      const contents = [];

      if (inputMode === 'media') {
        // Convert file
        setProgress(25);
        setStatusMessage('বেস-৬৪ অডিও রূপান্তর করা হচ্ছে...');
        const base64Data = await readFileAsBase64(uploadedFile!);

        setProgress(45);
        setStatusMessage('এআই ইনস্ট্রাকশন তৈরি করা হচ্ছে...');
        const mimeType = uploadedFile!.type || 'audio/mp3';
        let promptText = videoType === 'news' ? NEWS_MODE_PROMPT : GENERAL_MODE_PROMPT;

        if (speakerName.trim()) {
          promptText = `খবরের প্রধান ব্যক্তি বা বক্তার নাম/পদবি: "${speakerName.trim()}".
গুরুত্বপূর্ণ নির্দেশাবলী:
তুমি যে শিরোনামগুলো তৈরি করবে সেগুলোতে অবশ্যই এই ব্যক্তির নাম এবং পদবির প্রাসঙ্গিক উল্লেখ ব্যবহার করার সর্বোচ্চ চেষ্টা করবে। যেমন: '${speakerName.trim()}-এর ঘোষণা...', '${speakerName.trim()} জানালেন...', '${speakerName.trim()}-এর আশ্বাস...' বা ইত্যাদি বাস্তবসম্মত রূপ।\n\n${promptText}`;
        }

        contents.push({
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: promptText
            }
          ]
        });
      } else {
        // Text Analyze Mode
        setProgress(30);
        setStatusMessage('খবরের তথ্য বিশ্লেষণ প্রসেস শুরু হচ্ছে...');
        let promptText = videoType === 'news' ? TEXT_NEWS_MODE_PROMPT : TEXT_GENERAL_MODE_PROMPT;
        
        if (speakerName.trim()) {
          promptText = `খবরের প্রধান ব্যক্তি বা বক্তার নাম/পদবি: "${speakerName.trim()}".
গুরুত্বপূর্ণ নির্দেশাবলী:
তুমি শিরোনাম বা সামাজিক যোগাযোগমাধ্যমের ক্যাপশনগুলো লেখার সময় এই ব্যক্তির নাম/পদবিকে প্রাসঙ্গিক শিরোনামগুলোতে সুন্দরভাবে ব্যবহার করবে। যেমন: '${speakerName.trim()}-এর...' বা '${speakerName.trim()} নিয়ে...'\n\n${promptText}`;
        }
        
        setProgress(55);
        setStatusMessage('এআই ইনস্ট্রাকশন সেটআপ করা হচ্ছে...');
        
        contents.push({
          parts: [
            {
              text: `বিশ্লেষণ করার টেক্সট:\n"""\n${inputText}\n"""\n\nইনস্ট্রাকশন:\n${promptText}`
            }
          ]
        });
      }

      setProgress(70);
      setStatusMessage(inputMode === 'media' 
        ? 'এআই ড্রাইভার প্রস্তুত করা হচ্ছে...' 
        : 'এআই ড্রাইভার প্রস্তুত করা হচ্ছে...');

      let response: Response | null = null;
      let usedKey = '';
      let rotatorIndexToUse = currentRotatorIndex;
      let attempts = 0;
      const MAX_ROTATOR_ATTEMPTS = 15; 
      let success = false;
      let resJson: any = null;

      while (!success && attempts < (keySource === 'rotator' ? MAX_ROTATOR_ATTEMPTS : 1)) {
        try {
          if (keySource === 'rotator') {
            usedKey = SYSTEM_API_KEYS[rotatorIndexToUse];
            setStatusMessage(inputMode === 'media' 
              ? `এআই ইঞ্জিনে অডিও পাঠানো হচ্ছে [কী #${rotatorIndexToUse + 1}/${SYSTEM_API_KEYS.length}] ...` 
              : `এআই ইঞ্জিনে খবর পাঠানো হচ্ছে [কী #${rotatorIndexToUse + 1}/${SYSTEM_API_KEYS.length}] ...`);
          } else {
            usedKey = apiKey;
            setStatusMessage(inputMode === 'media' 
              ? 'এআই ইঞ্জিনে অডিও পাঠানো হচ্ছে (আপনার নিজস্ব কী)...' 
              : 'এআই ইঞ্জিনে খবর পাঠানো হচ্ছে (আপনার নিজস্ব কী)...');
          }

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${usedKey}`;

          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 8192,
                responseMimeType: "application/json"
              }
            })
          });

          if (response.ok) {
            resJson = await response.json();
            success = true;
            break;
          }

          const errorVal = response.status;
          console.warn(`API Key index ${rotatorIndexToUse} returned status ${errorVal}`);

          if (keySource === 'rotator') {
            attempts++;
            const nextIdx = (rotatorIndexToUse + 1) % SYSTEM_API_KEYS.length;
            rotatorIndexToUse = nextIdx;
            setCurrentRotatorIndex(nextIdx);
            saveRotatorIndex(nextIdx);

            if (errorVal === 429) {
              showToast(`কী #${rotatorIndexToUse} রেট লিমিট হয়েছে! কী পরিবর্তন করা হচ্ছে...`);
            } else if (errorVal === 403 || errorVal === 400) {
              showToast(`কী #${rotatorIndexToUse} ব্যস্ত বা লিমিট ছুয়েছে! কী পরিবর্তন করা হচ্ছে...`);
            } else {
              showToast(`এপিআই সার্ভার ত্রুটি (${errorVal})! পরবর্তী কী চেষ্টা করা হচ্ছে...`);
            }
            // Add a short delay to prevent thrashing
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            // Own custom key returned error
            if (errorVal === 400) {
              showToast('ফাইল ফরম্যাট বা ইনপুট ডেটা সাপোর্টেড নয়');
            } else if (errorVal === 429) {
              showToast('আপনার API রেট লিমিট অতিক্রম করেছে, একটু পর চেষ্টা করুন');
            } else if (errorVal === 403) {
              showToast('আপনার API Key-টি অবৈধ বা কোটা শেষ হয়ে গেছে');
            } else {
              showToast(`ভুল রেসপন্স (${errorVal}), অনুগ্রহ করে আপনার কী চেক করুন`);
            }
            setIsAnalyzing(false);
            setProgress(0);
            return;
          }

        } catch (fetchErr) {
          console.error("Fetch API error:", fetchErr);
          if (keySource === 'rotator') {
            attempts++;
            const nextIdx = (rotatorIndexToUse + 1) % SYSTEM_API_KEYS.length;
            rotatorIndexToUse = nextIdx;
            setCurrentRotatorIndex(nextIdx);
            saveRotatorIndex(nextIdx);
            showToast(`নেটওয়ার্ক ত্রুটি! পরবর্তী কী চেষ্টা করা হচ্ছে...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            showToast('নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে, দয়া করে ইন্টারনেট কানেকশন চেক করুন');
            setIsAnalyzing(false);
            setProgress(0);
            return;
          }
        }
      }

      if (!success) {
        showToast('দুঃখিত, কোনো সচল API কী পাওয়া যায়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন অথবা নিজস্ব কী দিন');
        setIsAnalyzing(false);
        setProgress(0);
        return;
      }

      setProgress(85);
      setStatusMessage('এআই রেসপন্স পার্স করা হচ্ছে...');
      setProgress(95);
      setStatusMessage('শিরোনাম তালিকা ম্যাপ করা হচ্ছে...');

      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty AI response body');
      }

      let parsedData: any = null;
      let sanitized = rawText.trim();

      try {
        parsedData = JSON.parse(sanitized);
      } catch (directError) {
        // Direct parsing failed, try extracting JSON from markdown or between braces
        let cleaned = sanitized;
        if (cleaned.includes('```json')) {
          cleaned = cleaned.split('```json')[1].split('```')[0].trim();
        } else if (cleaned.includes('```')) {
          cleaned = cleaned.split('```')[1].split('```')[0].trim();
        }

        try {
          parsedData = JSON.parse(cleaned);
        } catch (markdownError) {
          // Fall back to extracting first brace '{' to last brace '}'
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const bracedJson = cleaned.substring(firstBrace, lastBrace + 1);
            try {
              parsedData = JSON.parse(bracedJson);
            } catch (braceError) {
              try {
                // simple regex to remove trailing comma before } or ]
                const fixedJson = bracedJson.replace(/,(\s*[\]}])/g, '$1');
                parsedData = JSON.parse(fixedJson);
              } catch (trailingError) {
                console.error("JSON parsing absolutely failed:", trailingError);
                throw new Error("Could not parse JSON response from raw text: " + rawText);
              }
            }
          } else {
            throw new Error("Could not locate any valid JSON boundaries in: " + rawText);
          }
        }
      }

      const outputHeadlines: Headline[] = parsedData?.headlines || [];

      if (outputHeadlines.length === 0) {
        showToast('কোনো শিরোনাম তৈরি সম্ভব হয়নি, পুনরায় চেষ্টা করুন');
        setIsAnalyzing(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      setStatusMessage('সম্পূর্ণ হয়েছে!');

      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);

        let finalAccumulated: Headline[] = [];
        if (isRegenerating) {
          finalAccumulated = [...accumulatedHeadlines, ...outputHeadlines];
          showToast('নতুন শিরোনাম সংযুক্ত হয়েছে ✓');
        } else {
          finalAccumulated = outputHeadlines;
          showToast('সব শিরোনাম সফলভাবে তৈরি হয়েছে ✓');
        }

        setAccumulatedHeadlines(finalAccumulated);
        triggerStreamingRender(outputHeadlines, isRegenerating);
      }, 550);

    } catch (e) {
      console.error(e);
      showToast('AI রেসপন্স পার্স করতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  // Helper: Copy logic
  const handleCopy = (text: string, uniqueId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(uniqueId);
      showToast('শিরোনাম কপি হয়েছে ✓');
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(err => {
      console.error("Failed to copy text:", err);
      showToast('কপি করতে ব্যর্থ হয়েছে');
    });
  };

  // Reset or Refresh App (Section 5.9)
  const handleRefreshApp = () => {
    setUploadedFile(null);
    setInputText('');
    setSpeakerName('');
    setAccumulatedHeadlines([]);
    setDisplayedHeadlines([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    showToast('মোড রিসেট করা হয়েছে');
  };

  // Time formatter helper
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Memory calculation helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filter headlines by Category for categorized visual grouping
  const getCategorizedHeadlines = (catKey: string) => {
    return displayedHeadlines.filter(h => h && h.cat === catKey);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-[#f1f5f9] font-ui overflow-hidden flex flex-col w-full z-10 transition-all duration-300">
      
      {/* ── TICKER BAR (From Mockup) ── */}
      <div className="ticker h-8 bg-[rgba(229,62,62,0.06)] border-t border-[rgba(229,62,62,0.15)] border-b border-[rgba(229,62,62,0.15)] overflow-hidden flex items-center select-none w-full relative z-20">
        <div className="ticker-label bg-[#e53e3e] text-white font-logo text-[10px] font-black px-3.5 h-full flex items-center shrink-0 tracking-[1.5px] z-20">
          LIVE
        </div>
        <div className="ticker-wrap flex overflow-hidden w-full">
          <div className="ticker-track flex gap-[60px] pl-10">
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              NewsForge AI • বাংলাদেশের প্রথম AI নিউজ হেডলাইন জেনারেটর
            </span>
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              অডিও/ভিডিও আপলোড করুন • AI বিশ্লেষণ • ৩০+ শিরোনাম তৈরি
            </span>
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              TV Scroll • Breaking News • Thumbnail Text — সব এক জায়গায়
            </span>
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              NewsForge AI • বাংলাদেশের প্রথম AI নিউজ হেডলাইন জেনারেটর
            </span>
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              অডিও/ভিডিও আপলোড করুন • AI বিশ্লেষণ • ৩০+ শিরোনাম তৈরি
            </span>
            <span className="text-[11px] text-[#94a3b8] font-semibold flex items-center gap-2">
              TV Scroll • Breaking News • Thumbnail Text — সব এক জায়গায়
            </span>
          </div>
        </div>
      </div>

      {/* Styled feedback toast overlays */}
      <div className="fixed top-12 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-black/90 border-l-4 border-[#e53e3e] text-white text-xs px-4 py-3 rounded-r-lg shadow-2xl flex items-center gap-2 font-ui animate-[slideInCard_0.2s_ease_forwards]"
          >
            <Sparkles className="w-4 h-4 text-[#e53e3e] shrink-0" />
            <span className="font-semibold text-[#f1f5f9]">{toast.msg}</span>
          </div>
        ))}
      </div>

      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-4 pb-24 z-10 relative w-full">
        {/* Sleek top API management pill */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex items-center gap-2 bg-[rgba(229,62,62,0.06)] border border-[rgba(229,62,62,0.15)] py-1 px-3.5 rounded-full shadow-md text-[11px]">
            {keySource === 'rotator' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#e53e3e] animate-pulse"></span>
                <span className="text-[#e53e3e]/90 font-ui font-bold uppercase tracking-wider">সিস্টেম কী রোটেটর সক্রিয় (৮১টি সচল কী)</span>
              </>
            ) : apiKey ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse"></span>
                <span className="text-[#3b82f6] font-ui font-bold uppercase tracking-wider">আমার নিজস্ব API Key সংরক্ষিত</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                <span className="text-red-400 font-ui font-bold uppercase tracking-wider">নিজস্ব কী দেওয়া নেই ⚠</span>
              </>
            )}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[#94a3b8] hover:text-[#e53e3e] font-ui font-bold hover:underline select-none outline-none cursor-pointer ml-1.5 border-l border-white/10 pl-2 transition-all"
            >
              {showKeyInput ? 'লুকান' : 'পছন্দ করুন'}
            </button>
          </div>
        </div>

        {/* LOGO AREA STATEMENT (From Mockup UI) */}
        <header className="text-center pt-8 pb-8 select-none relative z-10 flex flex-col items-center animate-fade-in">
          <div className="logo-mark flex items-center gap-4 mb-2 justify-center">
            <div className="logo-icon logo-pulse-box w-14 h-14 border-2 border-[#e53e3e] rounded-full overflow-hidden flex items-center justify-center bg-black/40 shadow-[0_0_15px_rgba(229,62,62,0.35)]">
              {!imgFailed ? (
                <img 
                  src={logoImg} 
                  alt="NewsForge Logo" 
                  className="w-full h-full object-cover select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <Sparkles className="w-6 h-6 text-[#e53e3e]" />
              )}
            </div>
            <div>
              <div className="logo-text font-logo text-3xl font-black text-white tracking-[3px] uppercase">
                NEWS<span className="text-[#e53e3e]">FORGE</span>
              </div>
            </div>
          </div>
          <div className="logo-sub font-bangla text-[13.5px] text-[#94a3b8] tracking-[1.2px] mt-1.5 select-text font-medium">
            AI-চালিত সংবাদ শিরোনাম বিশেষজ্ঞ • Advanced AI Headline Architect
          </div>
        </header>

        {/* HIDDEN LOGICAL AUDIO ENGINE */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* SECTION 7: API KEY MANAGEMENT COMPONENT */}
        {showKeyInput && (
          <div className="bg-[rgba(5,13,16,0.95)] border border-[rgba(229,62,62,0.15)] rounded-xl p-5 sm:p-6 shadow-2xl mb-8 transition-all animate-[slideInCard_0.22s_ease_forwards]">
            <div className="flex items-center justify-between mb-4 text-[#e53e3e]">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5" />
                <h2 className="font-ui text-base sm:text-lg font-bold uppercase tracking-wider">এপিআই কী কন্ট্রোল সেটিংস</h2>
              </div>
              <button 
                onClick={() => setShowKeyInput(false)}
                className="text-white/60 hover:text-[#e53e3e] text-xs font-ui underline cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

            {/* Selector Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Option 1: Rotator */}
              <div 
                onClick={() => {
                  setKeySource('rotator');
                  localStorage.setItem('gemini_key_source', 'rotator');
                  showToast('স্বয়ংক্রিয় সিস্টেম কী রোটেটর সক্রিয় হয়েছে');
                }}
                className={`border p-4 rounded-lg cursor-pointer transition-all ${
                  keySource === 'rotator' 
                    ? 'bg-[rgba(229,62,62,0.06)] border-[#e53e3e]/80 shadow-[0_2px_10px_rgba(229,62,62,0.1)]' 
                    : 'bg-black/40 border-white/10 opacity-60 hover:opacity-90 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] bg-[#e53e3e] text-white px-2 py-0.5 rounded font-logo uppercase font-black tracking-wider shadow">RECOMMENDED</span>
                  <input 
                    type="radio" 
                    checked={keySource === 'rotator'} 
                    onChange={() => {}} 
                    className="accent-[#e53e3e] pointer-events-none"
                  />
                </div>
                <h3 className="text-white font-ui font-bold text-sm mb-1">এআই কী রোটেটর (ফ্রি)</h3>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  ৮১টি প্রি-কনফিগার করা সিস্টেম কী পুল। কোনো লিমিট আসলে অটোমেটিক পরবর্তী কী-তে পরিবর্তিত হয়ে রিট্রাই করে। আপনার কোনো কী লাগবে না।
                </p>
              </div>

              {/* Option 2: Custom Key */}
              <div 
                onClick={() => {
                  setKeySource('custom');
                  localStorage.setItem('gemini_key_source', 'custom');
                  showToast('আমার নিজস্ব API Key মোড সক্রিয় হয়েছে');
                }}
                className={`border p-4 rounded-lg cursor-pointer transition-all ${
                  keySource === 'custom' 
                    ? 'bg-[rgba(59,130,246,0.06)] border-[#3b82f6]/80 shadow-[0_2px_10px_rgba(59,130,246,0.1)]' 
                    : 'bg-black/40 border-white/10 opacity-60 hover:opacity-90 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] bg-[#3b82f6] text-white px-2 py-0.5 rounded font-logo uppercase font-black tracking-wider shadow">CUSTOM KEY</span>
                  <input 
                    type="radio" 
                    checked={keySource === 'custom'} 
                    onChange={() => {}} 
                    className="accent-[#3b82f6] pointer-events-none"
                  />
                </div>
                <h3 className="text-white font-ui font-bold text-sm mb-1">আমার নিজস্ব API Key</h3>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  আপনার গুগল এআই স্টুডিও একাউন্ট থেকে আনা ফ্রি Gemini API Key ব্যবহার করে আনলিমিটেড সার্ভিস নিন। এটি ব্রাউজারেই সেভ থাকে।
                </p>
              </div>
            </div>

            {/* Custom Key Edit Input Box only if Custom is selected */}
            {keySource === 'custom' && (
              <div className="mb-4 bg-black/50 border border-[#3b82f6]/25 rounded-lg p-4 animate-[slideInCard_0.15s_ease_forwards]">
                <p className="text-xs text-[#6297ae] mb-2.5 font-ui leading-relaxed">
                  আপনার Gemini API Key নিচে দিন। এটি ব্রাউজারের <span className="text-[#3b82f6]">localStorage</span>-এ নিরাপদে স্টোর থাকবে।
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Gemini API Key টাইপ করুন (AIzaSy...)"
                    className="flex-1 bg-black/70 border border-[#3b82f6]/40 rounded px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-all placeholder:text-white/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      className="bg-[#3b82f6] text-white font-ui font-bold px-6 py-3 rounded text-sm tracking-widest uppercase hover:bg-blue-600 active:scale-95 transition-all text-center select-none shrink-0"
                    >
                      সেভ করুন
                    </button>
                    {apiKey && (
                      <button
                        onClick={handleClearApiKey}
                        className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 font-ui font-bold px-4 py-3 rounded text-sm hover:text-red-300 transition-all text-center select-none shrink-0 cursor-pointer"
                      >
                        মুছুন
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shared Model settings footer */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="text-[11px] text-[#94a3b8] font-ui flex items-center gap-1.5 flex-wrap">
                <span>* নির্ধারিত মডেল:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-black/80 border border-white/10 rounded px-2.5 py-1.5 focus:outline-none text-[#e53e3e] font-mono text-xs cursor-pointer"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash (সুপার ফাস্ট)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (উন্নত প্রসেসিং)</option>
                </select>
              </div>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-[#e53e3e] hover:underline flex items-center gap-1 font-ui"
              >
                <span>ফ্রি কী তৈরি করুন (Google AI Studio)</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}

        {/* INPUT MODE SWITCHER TABS WITH HIGH-CONTRAST BORDERS */}
        <div className="flex bg-[#12131e]/95 border border-[rgba(229,62,62,0.15)] rounded-xl p-1.5 mb-6 relative z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => {
              setInputMode('media');
              setAccumulatedHeadlines([]);
              setDisplayedHeadlines([]);
            }}
            className={`flex-1 py-3 text-[11px] sm:text-xs font-ui font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
              inputMode === 'media'
                ? 'bg-[#e53e3e] text-white shadow-[0_2px_8px_rgba(229,62,62,0.25)]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>মিডিয়া আপলোড (Audio/Video File)</span>
          </button>
          <button
            onClick={() => {
              setInputMode('text');
              setAccumulatedHeadlines([]);
              setDisplayedHeadlines([]);
            }}
            className={`flex-1 py-3 text-[11px] sm:text-xs font-ui font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
              inputMode === 'text'
                ? 'bg-[#e53e3e] text-white shadow-[0_2px_8px_rgba(229,62,62,0.25)]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>টেক্সট ইনপুট (Article/News Text)</span>
          </button>
        </div>

        {/* INTEGRATED SOURCE ZONE */}
        {inputMode === 'media' ? (
          <>
            {/* FILE UPLOAD ZONE */}
            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInputClick}
                className={`upload-zone relative border-2 border-dashed rounded-xl p-9 text-center cursor-pointer select-none transition-all duration-300 ${
                  isDragging 
                    ? 'border-[#e53e3e] bg-[rgba(229,62,62,0.06)]' 
                    : 'border-[rgba(229,62,62,0.15)] bg-[rgba(229,62,62,0.02)] hover:border-[#e53e3e]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*,video/*"
                  className="hidden"
                />
                <div className="upload-icon w-[52px] h-[52px] border border-[rgba(229,62,62,0.15)] rounded-full mx-auto mb-3.5 flex items-center justify-center transition-all">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#94a3b8" strokeWidth="1.5"/>
                    <polyline points="17 8 12 3 7 8" stroke="#94a3b8" strokeWidth="1.5"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="#94a3b8" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="upload-title font-bangla text-base text-white mb-1.5 font-medium">অডিও বা ভিডিও ফাইল আপলোড করুন</div>
                <div className="upload-hint text-xs text-[#94a3b8] font-ui">MP3, MP4, WAV, M4A, OGG সাপোর্টেড • সর্বোচ্চ ১ GB</div>
              </div>
            ) : (
              <div className="file-info flex bg-[rgba(229,62,62,0.06)] border border-[rgba(229,62,62,0.15)] rounded-lg p-3.5 px-4 mb-4 items-center gap-3 animate-[slideInCard_0.2s_ease_forwards]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#e53e3e]">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="#e53e3e" strokeWidth="1.5"/>
                  <polyline points="13 2 13 9 20 9" stroke="#e53e3e" strokeWidth="1.5"/>
                </svg>
                <span className="file-name text-xs md:text-sm text-[#e53e3e] flex-1 font-semibold truncate select-text">
                  {uploadedFile.name}
                </span>
                <span className="file-size text-xs text-[#94a3b8] mr-3 shrink-0 uppercase select-all font-mono">
                  {formatFileSize(uploadedFile.size)}
                </span>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setAccumulatedHeadlines([]);
                    setDisplayedHeadlines([]);
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setDuration(0);
                    showToast('ফাইল সরানো হয়েছে');
                  }}
                  className="text-red-500 hover:text-red-400 font-ui font-semibold hover:underline text-xs outline-none select-none shrink-0 cursor-pointer"
                >
                  ফাইল পরিবর্তন (Change File)
                </button>
              </div>
            )}

            {/* AUDIO PLAYER (visual mockup matched with logic) */}
            {uploadedFile && (
              <div className="audio-wrap flex flex-wrap bg-black/40 border border-[rgba(229,62,62,0.15)] rounded-xl p-3.5 px-4 mb-4 items-center gap-3.5 relative">
                <button 
                  onClick={togglePlay}
                  className="play-btn w-10 h-10 rounded-full border border-[#e53e3e] bg-[rgba(229,62,62,0.1)] text-[#e53e3e] cursor-pointer flex items-center justify-center transition-all shrink-0 shadow-[0_2px_8px_rgba(229,62,62,0.2)] hover:bg-[rgba(229,62,62,0.2)]"
                  title={isPlaying ? "মিউট করুন" : "প্লে করুন"}
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e53e3e">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e53e3e">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                <div className="waveform-wrap flex-1 min-w-[150px]">
                  <div className={`waveform-bars flex items-end gap-[2px] h-8 ${isPlaying ? 'playing' : ''}`}>
                    {Array.from({ length: 32 }).map((_, i) => {
                      const idleH = Math.floor(Math.sin((i / 31) * Math.PI) * 16 + 8);
                      const delay = (i * 0.025).toFixed(3);
                      return (
                        <div
                          key={i}
                          className={`bar flex-1 rounded-[2px] min-h-[3px] transition-all`}
                          style={{
                            height: `${idleH}px`,
                            backgroundColor: isPlaying ? 'var(--neon)' : 'var(--border)',
                            animationDelay: `${delay}s`,
                            animationDuration: '0.8s',
                            animationName: isPlaying ? 'waveAnim' : 'none',
                            transformOrigin: 'bottom'
                          } as React.CSSProperties}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="time-display font-logo text-[11px] text-[#94a3b8]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <div className="w-20 sm:w-28 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e53e3e] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[rgba(5,13,16,0.6)] border border-[rgba(229,62,62,0.15)] rounded-xl p-5 mb-5 relative z-10 animate-[slideInCard_0.2s_ease_forwards] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3.5 mb-3 text-[#e53e3e]">
              <div className="p-2 bg-[rgba(229,62,62,0.06)] rounded border border-[rgba(229,62,62,0.12)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="font-ui text-sm font-bold text-white leading-tight">আপনার সংবাদের বিবরণ বা লেখার কপি এখানে পেস্ট করুন</p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5 font-ui">সম্পূর্ণ সংবাদ নিবন্ধ বা স্ক্রিপ্ট পেস্ট করুন। AI এটি নিখুঁতভাবে বিশ্লেষণ করে সংবাদ শিরোনাম তৈরি করবে।</p>
              </div>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="এখানে আপনার খবর, স্ক্রিপ্ট বা প্যারাগ্রাফটি পেস্ট করুন..."
              rows={8}
              className="w-full bg-black/60 border border-[rgba(229,62,62,0.15)] rounded-lg p-4 font-bangla text-sm text-white focus:outline-none focus:border-[#e53e3e] transition-all placeholder:text-white/20 resize-y leading-relaxed font-medium"
            />
            {inputText.trim() && (
              <div className="flex justify-between items-center mt-2.5 px-1 font-logo text-[10px] text-emerald-400">
                <span>{inputText.trim().length} অক্ষরের টেক্সট ইনপুট দেওয়া হয়েছে</span>
                <button
                  onClick={() => {
                    setInputText('');
                    setAccumulatedHeadlines([]);
                    setDisplayedHeadlines([]);
                    showToast('ইনপুট খালি করা হয়েছে');
                  }}
                  className="text-red-400 hover:text-red-300 font-ui cursor-pointer select-none outline-none font-bold hover:underline"
                >
                  ইনপুট মুছুন (Clear Insert Details)
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION 5.3: SELECTOR MODE ENGINE */}
        {((inputMode === 'media' && uploadedFile) || (inputMode === 'text' && inputText.trim().length > 0)) && (
          <div className="bg-[rgba(5,13,16,0.6)] border border-[rgba(229,62,62,0.15)] rounded-xl p-5 mb-6 relative z-10 animate-[slideInCard_0.2s_ease_forwards]">
            
            {/* Optional Speaker Name Input Field */}
            <div className="mb-5 border-b border-white/5 pb-5">
              <label className="block text-xs font-semibold text-[#e53e3e] uppercase tracking-wider mb-2 font-ui">
                বক্তার নাম, পদবি বা প্রধান ব্যক্তি (ঐচ্ছিক) / Speaker/Author Name (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="যেমন: খন্দকার মুক্তাদির, পরিকল্পনামন্ত্রী, ওবায়দুল কাদের ইত্যাদি..."
                  className="w-full bg-black/60 border border-[rgba(229,62,62,0.15)] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#e53e3e] transition-all placeholder:text-white/20 leading-relaxed font-bangla font-medium"
                />
                {speakerName && (
                  <button
                    onClick={() => setSpeakerName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400 hover:text-red-300 font-ui cursor-pointer select-none outline-none font-bold"
                  >
                    মুছুন
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#94a3b8] mt-1.5 font-ui">
                * এখানে নাম বা পদবি দিলে এআই (AI) বক্তব্যের উৎস মেলাবে এবং শিরোনামে চমৎকার আশ্বস্তকরণ বিশেষণ (যেমন: 'মন্ত্রীর আশ্বাস' অথবা 'খন্দকার মুক্তাদিরের আশ্বস্তকরণ') তৈরি করবে।
              </p>
            </div>

            <h4 className="font-ui text-xs font-semibold text-[#e53e3e] uppercase tracking-wider mb-4 text-center select-none">
              {inputMode === 'media' ? "এআই অ্যানালিটিক্স ভিডিও মোড সিলেক্ট করুন" : "এআই অ্যানালিটিক্স টেক্সট মোড সিলেক্ট করুন"}
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label 
                className={`flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer transition-all select-none ${
                  videoType === 'news' 
                    ? 'border-[#e53e3e] bg-[rgba(229,62,62,0.06)] shadow-[0_2px_10px_rgba(229,62,62,0.1)]' 
                    : 'border-[rgba(229,62,62,0.1)] bg-black/30 hover:border-[rgba(229,62,62,0.15)]'
                }`}
              >
                <input
                  type="radio"
                  name="video_mode"
                  checked={videoType === 'news'}
                  onChange={() => setVideoType('news')}
                  className="hidden"
                />
                <div className={`p-2 rounded shrink-0 ${videoType === 'news' ? 'bg-[#e53e3e] text-white' : 'bg-white/5 text-[#94a3b8]'}`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-ui text-sm font-bold text-white leading-tight">
                    {inputMode === 'media' ? "নিউজ ভিডিও / রাজনৈতিক বক্তব্য" : "সংবাদ ও রাজনৈতিক টেক্সট / আর্টিকেল"}
                  </p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5 font-ui">
                    {inputMode === 'media' ? "৫টি ক্যাটাগরিতে ৩০টির বেশি পেশাদার সংবাদ শিরোনাম দেবে" : "৫টি ক্যাটাগরিতে ৩০টির বেশি পেশাদার সংবাদ শিরোনাম বিশ্লেষণ করে দেবে"}
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer transition-all select-none ${
                  videoType === 'general' 
                    ? 'border-[#e53e3e] bg-[rgba(229,62,62,0.06)] shadow-[0_2px_10px_rgba(229,62,62,0.1)]' 
                    : 'border-[rgba(229,62,62,0.1)] bg-black/30 hover:border-[rgba(229,62,62,0.15)]'
                }`}
              >
                <input
                  type="radio"
                  name="video_mode"
                  checked={videoType === 'general'}
                  onChange={() => setVideoType('general')}
                  className="hidden"
                />
                <div className={`p-2 rounded shrink-0 ${videoType === 'general' ? 'bg-[#e53e3e] text-white' : 'bg-white/5 text-[#94a3b8]'}`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-ui text-sm font-bold text-white leading-tight">
                    {inputMode === 'media' ? "সাধারণ ভিডিও / অন্যান্য কন্টেন্ট" : "সাধারণ লেখা / অন্যান্য প্রবন্ধ নিবন্ধ"}
                  </p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5 font-ui">
                    {inputMode === 'media' ? "সোশ্যাল মিডিয়া ক্যাপশন ও ১০-১৫টি মৌলিক বাংলা শিরোনাম দেবে" : "সোশ্যাল মিডিয়া ক্যাপশন ও ১০-১৫টি মৌলিক বাংলা শিরোনাম বিশ্লেষণ করে দেবে"}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* BUTTON ACTION MATRIX */}
        {((inputMode === 'media' && uploadedFile) || (inputMode === 'text' && inputText.trim().length > 0)) && (
          <div className="flex flex-wrap gap-2.5 mt-6 mb-6 select-none justify-center relative z-10 w-full animate-[slideInCard_0.2s_ease_forwards]">
            <button
              onClick={() => generateHeadlines(false)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-5 py-3 rounded bg-[#e53e3e] text-white font-semibold font-ui text-xs tracking-wider transition-all shadow-[0_2px_12px_rgba(229,62,62,0.2)] hover:shadow-[0_4px_16px_rgba(229,62,62,0.35)] cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none uppercase active:scale-98 font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>শিরোনাম তৈরি করুন</span>
            </button>

            {accumulatedHeadlines.length > 0 && (
              <button
                onClick={() => generateHeadlines(true)}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-transparent text-[#e53e3e] border border-[rgba(229,62,62,0.15)] font-semibold font-ui text-xs tracking-wider transition-all hover:border-[#e53e3e] hover:bg-[rgba(229,62,62,0.07)] cursor-pointer disabled:opacity-40 disabled:pointer-events-none select-none uppercase active:scale-98"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>রিজেনারেট (Regenerate)</span>
              </button>
            )}

            <button
              onClick={handleRefreshApp}
              className="inline-flex items-center gap-2 px-4 py-3 rounded bg-transparent text-[#94a3b8] border border-white/5 hover:border-[rgba(229,62,62,0.15)] hover:text-white font-semibold font-ui text-xs tracking-wider transition-all cursor-pointer select-none uppercase active:scale-98"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>রিসেট (Reset)</span>
            </button>
          </div>
        )}

        {/* STATUS SCREEN COMPONENT OVERLAYS */}
        {isAnalyzing && (
          <div className="mt-6 relative z-10">
            {/* Status Bar */}
            <div className="flex bg-[rgba(5,13,16,0.8)] border border-[rgba(229,62,62,0.15)] rounded-lg p-3 px-4 mb-2.5 items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#e53e3e] animate-pulse"></div>
              <span className="font-bangla text-xs sm:text-sm text-[#e53e3e] flex-1">
                {statusMessage}
              </span>
              <span className="font-logo text-xs text-[#94a3b8] shrink-0 font-bold uppercase">
                {accumulatedHeadlines.length} শিরোনাম তৈরি হয়েছে
              </span>
            </div>

            {/* Stream Progress Fill */}
            <div className="h-1 bg-[rgba(229,62,62,0.1)] rounded overflow-hidden shadow-[0_2px_8px_rgba(229,62,62,0.15)]">
              <div 
                className="bg-[#e53e3e] h-full transition-all duration-300 shadow-[0_0_8px_rgba(229,62,62,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-end mt-1 font-logo text-[10px] text-[#94a3b8] uppercase font-semibold">
              {progress}% PROCESSED
            </div>
          </div>
        )}

        {/* RESULTS WRAPPER INTERFACE (Section 6) */}
        {displayedHeadlines.length > 0 && (
          <div className="mt-8 mb-4 border-b border-[rgba(229,62,62,0.08)] pb-3 flex items-center justify-between gap-4 select-none relative z-10 w-full">
            <h3 className="font-bangla text-base sm:text-lg font-bold text-white tracking-wide">
              তৈরি হওয়া শিরোনামসমূহ
            </h3>
            <span className="font-logo text-xs bg-[rgba(229,62,62,0.08)] border border-[rgba(229,62,62,0.15)] px-3 py-1 rounded-full text-[#e53e3e] font-black uppercase shadow-[0_2px_8px_rgba(229,62,62,0.1)]">
              {displayedHeadlines.length}টি শিরোনাম
            </span>
          </div>
        )}

        {/* HEADLINE CARDS COMPOSITION */}
        {displayedHeadlines.length > 0 && (
          <div className="space-y-6 relative z-10">
            {videoType === 'news' ? (
              // Group and Render News Mode categories
              Object.keys(CATEGORIES).map((catKey) => {
                if (catKey === 'general') return null; // Skip general category in news mode
                const config = CATEGORIES[catKey as keyof typeof CATEGORIES];
                const list = getCategorizedHeadlines(catKey);
                
                if (list.length === 0) return null;

                return (
                  <div key={catKey} className="cat-section">
                    {/* Category Header */}
                    <div className="cat-header flex items-center gap-2 px-1 mb-2.5">
                      <div className="cat-dot w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.color }}></div>
                      <div className="cat-label text-[13px] font-semibold" style={{ color: config.color }}>{config.label}</div>
                      <div className="cat-count ml-auto font-logo text-[9px] bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[#94a3b8] font-semibold select-none">
                        {list.length}
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-2">
                       {list.map((headline, idx) => {
                        const uniqueId = `${catKey}-${idx}`;
                        return (
                          <div
                            key={uniqueId}
                            className="headline-card-scaled bg-[rgba(5,13,16,0.8)] border border-[rgba(0,255,60,0.18)] rounded-r-lg border-l-4 p-4 sm:p-5 shadow-md flex flex-col justify-between transition-all hover:border-[rgba(0,255,60,0.4)] hover:bg-[rgba(0,255,60,0.04)] hover:translate-x-1 cursor-default"
                            style={{ 
                              borderLeftColor: config.color,
                              '--cat-color': config.color
                            } as React.CSSProperties}
                          >
                            <p className="font-bangla text-[15px] sm:text-base text-white/95 leading-relaxed antialiased font-medium mb-3 select-text">
                              {headline.text}
                            </p>

                            <div className="headline-meta flex items-center gap-2.5 select-none w-full">
                              <span 
                                className="headline-type text-[10px] font-logo font-bold uppercase tracking-wider"
                                style={{ color: config.color }}
                              >
                                {catKey.toUpperCase()}
                              </span>

                              {headline.ts && (
                                <button
                                  onClick={() => seekToTime(headline.ts as string)}
                                  className="timestamp-badge inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded px-2 py-0.5 font-logo text-[9px] text-[#94a3b8] hover:border-[#e53e3e] hover:text-white transition-all cursor-pointer outline-none font-bold"
                                  title={`${headline.ts} তে যান`}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                  <span>{headline.ts}</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleCopy(headline.text, uniqueId)}
                                className={`copy-btn ml-auto inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e53e3e] cursor-pointer outline-none transition-colors font-ui`}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                                <span>{copiedId === uniqueId ? 'কপি হয়েছে ✓' : 'কপি'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              // Group and Render General Mode category
              <div className="cat-section">
                <div className="cat-header flex items-center gap-2 px-1 mb-2.5">
                  <div className="cat-dot w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORIES.general.color }}></div>
                  <div className="cat-label text-[13px] font-semibold" style={{ color: CATEGORIES.general.color }}>{CATEGORIES.general.label}</div>
                  <div className="cat-count ml-auto font-logo text-[9px] bg-white/5 border border-white/5 rounded px-2 py-0.5 text-[#94a3b8] font-semibold select-none">
                    {displayedHeadlines.length}
                  </div>
                </div>

                <div className="space-y-2">
                  {displayedHeadlines.map((headline, idx) => {
                    const uniqueId = `general-${idx}`;
                    return (
                      <div
                        key={uniqueId}
                        className="headline-card-scaled bg-[rgba(5,13,16,0.8)] border border-[rgba(0,255,60,0.18)] rounded-r-lg border-l-4 p-4 sm:p-5 shadow-md flex flex-col justify-between transition-all hover:border-[rgba(0,255,60,0.4)] hover:bg-[rgba(0,255,60,0.04)] hover:translate-x-1 cursor-default"
                        style={{ 
                          borderLeftColor: CATEGORIES.general.color,
                          '--cat-color': CATEGORIES.general.color
                        } as React.CSSProperties}
                      >
                        <p className="font-bangla text-[15px] sm:text-base text-white/95 leading-relaxed antialiased font-medium mb-2.5 select-text">
                          {headline.text}
                        </p>

                        <div className="headline-meta flex items-center gap-2.5 select-none w-full font-ui">
                          <span 
                            className="headline-type text-[10px] font-logo font-bold uppercase tracking-wider"
                            style={{ color: CATEGORIES.general.color }}
                          >
                            GENERAL
                          </span>

                          <button
                            onClick={() => handleCopy(headline.text, uniqueId)}
                            className={`copy-btn ml-auto inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e53e3e] cursor-pointer outline-none transition-colors font-ui`}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                            <span>{copiedId === uniqueId ? 'কপি হয়েছে ✓' : 'কপি'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER SIGNATURE (From Mockup UI) */}
      <footer className="mt-14 pt-6 pb-8 border-t border-[rgba(229,62,62,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#94a3b8] text-xs max-w-[860px] mx-auto w-full px-4 z-20 relative font-ui select-none">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shadow-[0_2px_8px_rgba(229,62,62,0.3)] ${isAnalyzing ? 'bg-amber-500 animate-pulse' : 'bg-[#e53e3e]'}`}></div>
          <span>
            {isAnalyzing ? "Analyzing speech file or audio stream..." : "System Online • All AI models optimal"}
          </span>
        </div>
        
        <div className="footer-credit flex items-center justify-center gap-2">
          <span>Created by</span>
          <a 
            href="https://www.facebook.com/saeedalmahdi24" 
            target="_blank" 
            rel="noreferrer" 
            className="text-[#e53e3e] hover:opacity-80 transition-all font-semibold flex items-center gap-1 select-text"
          >
            <svg className="fb-icon" width="15" height="15" viewBox="0 0 24 24" fill="#e53e3e">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            Saeed Al Mahdi
          </a>
        </div>

        <div className="flex gap-4 text-[#94a3b8]">
          <span className="hover:text-white cursor-pointer transition-colors">Support</span>
          <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
        </div>
      </footer>
    </div>
  );
}
