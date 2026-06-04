import React, { useState, useRef, useEffect } from "react";
import ChatHeader from "./components/ChatHeader";
import ChatInput from "./components/ChatInput";
import LanguageModal from "./components/LanguageModal";
import jsPDF from "jspdf";
import { Home } from "lucide-react";
import html2pdf from "html2pdf.js";

const ShramSetuAI = () => {
  const [lang, setLang] = useState("en");
  //   Language Picker opens on app load
  const [isLangOpen, setIsLangOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  //   Session ID
  const sessionId = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const downloadPDF = (text) => {
    if (!text) {
      alert("No content found!");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    doc.setFont("Times", "Normal");
    doc.setFontSize(12);

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const maxLineWidth = pageWidth - margin * 2;

    const lines = doc.splitTextToSize(text, maxLineWidth);

    let y = margin;

    lines.forEach((line) => {
      if (y + 7 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += 7;
    });

    doc.save("Complaint_Letter.pdf");
  };

  const generatePDF = (text) => {
    const element = document.createElement("div");

    element.innerHTML = `
    <div style="
        font-family: 'Noto Sans Devanagari', Arial;
        padding: 20px;
        line-height: 1.8;
        font-size: 14px;
    ">
        ${text.replace(/\n/g, "<br/>")}
    </div>
  `;

    html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename: "ESIC_Complaint.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  };
  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser not supported.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    // 2f3add09d94e418a54cb6c6de4f9484f77fcae23
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  const languages = [
    { code: "en", native: "English", eng: "ENGLISH" },
    { code: "hi", native: "हिन्दी", eng: "HINDI" },
  ];

  const content = {
    en: {
      welcome: "ShramSetu AI",
      sub: "AI POWERED",
      placeholder: "Type here...",
      actions: [
        "Am I eligible for ESIC?",
        "Check PF Contribution",
        "Calculate Gratuity",
      ],
    },
    hi: {
      welcome: "श्रमसेतु AI",
      sub: "AI द्वारा संचालित",
      placeholder: "यहाँ लिखें...",
      actions: ["ESIC पात्रता जांचें", "PF गणना करें", "ग्रेच्युटी जानें"],
    },
  };

  const current = content[lang] || content["en"];

  const handleSend = async (text) => {
    const userText = text || input;
    if (!userText.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: userText, sender: "user" },
    ]);
    setInput("");
    setIsTyping(true);

    try {
      const rasaUrl = import.meta.env.VITE_RASA_URL || "http://localhost:5005";
      const response = await fetch(`${rasaUrl}/webhooks/rest/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: sessionId.current, message: userText }),
      });

      const data = await response.json();
      if (data && data.length > 0) {
        data.forEach((res, index) => {
          setTimeout(() => {
            const downloadUrl =
              res.custom && res.custom.type === "pdf_download"
                ? res.custom.url
                : null;
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + index,
                text:
                  res.text ||
                  (downloadUrl ? "PDF Generated!" : "I didn't quite get that."),
                sender: "bot",
                buttons: res.buttons,
                downloadUrl: downloadUrl,
              },
            ]);
            if (index === data.length - 1) setIsTyping(false);
          }, index * 600);
        });
      } else {
        setIsTyping(false);
      }
    } catch (error) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 999,
          text: "Error connecting to backend.",
          sender: "bot",
        },
      ]);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-200 sm:bg-[#D1D5DB] flex items-center justify-center font-sans antialiased overflow-hidden">
      <div className="w-full h-full sm:w-[420px] sm:h-[90vh] sm:max-h-[850px] bg-white flex flex-col shadow-2xl relative sm:rounded-[32px] overflow-hidden">
        {isLangOpen && (
          <LanguageModal
            languages={languages}
            currentLang={lang}
            onSelect={async (c) => {
              setLang(c);
              setIsLangOpen(false);
              setMessages([]); // Switch language resets chat
              const rasaUrl =
                import.meta.env.VITE_RASA_URL || "http://localhost:5005";
              try {
                await fetch(`${rasaUrl}/webhooks/rest/webhook`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sender: sessionId.current,
                    message: c === "hi" ? "नमस्ते" : "hello",
                  }),
                });
              } catch (e) {
                console.error("Rasa warm-up failed", e);
              }
            }}
            onClose={() => setIsLangOpen(false)}
          />
        )}

        <ChatHeader
          welcome={current.welcome}
          sub={current.sub}
          lang={lang}
          onLangClick={() => setIsLangOpen(true)}
        />

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <h2 className="text-xl font-bold text-[#0B3C5D]">
                {current.welcome}
              </h2>
              <p className="text-xs text-gray-500 italic px-6">
                "Complex Policy → Simple Conversation → Real Empowerment"
              </p>
              <div className="grid grid-cols-1 gap-2 px-6 mt-4">
                {current.actions.map((act) => (
                  <div
                    key={act}
                    onClick={() => {
                      setMessages([]);
                      handleSend(act);
                    }}
                    className="p-3 border rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all text-sm font-semibold text-[#0B3C5D] shadow-sm"
                  >
                    {act}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-in slide-in-from-bottom-1 duration-300`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] whitespace-pre-line font-serif leading-relaxed
  ${
    msg.sender === "user"
      ? "bg-[#0B3C5D] text-white rounded-tr-none"
      : "bg-[#F1F5F9] text-gray-800 rounded-tl-none border border-slate-50 shadow-sm"
  }`}
              >
                {msg.text}
              </div>
              {msg.sender === "bot" &&
                (msg.text?.startsWith("To,") ||
                  msg.text?.startsWith("सेवा में")) && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => copyToClipboard(msg.text)}
                      className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => generatePDF(msg.text)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold"
                    >
                      Download PDF
                    </button>
                  </div>
                )}
              {msg.sender === "bot" && msg.buttons && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {msg.buttons.map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(btn.payload)}
                      className="bg-white border border-[#0B3C5D] text-[#0B3C5D] px-4 py-1.5 rounded-full text-[12px] font-bold hover:bg-[#0B3C5D] hover:text-white shadow-sm"
                    >
                      {btn.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#F1F5F9] px-4 py-2.5 rounded-2xl rounded-tl-none border border-slate-50 flex gap-1 items-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </main>

        <div className="px-4 py-3 border-t overflow-x-auto no-scrollbar bg-white shrink-0">
          <div className="flex gap-2 items-center">
            {/*  Home Icon Button */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  sessionId.current = `session_${Date.now()}`;
                }}
                className="bg-[#0B3C5D] text-white p-2.5 rounded-full shadow-md shrink-0 active:scale-90 transition-all"
              >
                <Home size={18} />
              </button>
            )}

            {current.actions.map((act) => (
              <button
                key={act}
                onClick={() => {
                  setMessages([]);
                  handleSend(act);
                }}
                className="whitespace-nowrap bg-white px-4 py-2 rounded-full text-[11px] font-bold border border-slate-200 shadow-sm"
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSend(input)}
          placeholder={
            isListening
              ? lang === "hi"
                ? "सुन रहा हूँ..."
                : "Listening..."
              : current.placeholder
          }
          onVoice={handleVoiceInput}
          isListening={isListening}
        />
      </div>
    </div>
  );
};

export default ShramSetuAI;
