import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Volume2, VolumeX, Plus, RefreshCw, Loader2 } from "lucide-react";

// --- TIPE DATA ---
type QuestionType = "multiple-choice" | "essay";

interface QuestionItem {
  id: string;
  label: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string;
  color: string;
}

interface GameState {
  points: number;
  isSpinning: boolean;
  wheelAngle: number;
  lastResult: QuestionItem | null;
  soundEnabled: boolean;
}

// --- DATA AWAL ---
const INITIAL_QUESTIONS: QuestionItem[] = [
  { id: "1", label: "Presiden RI", question: "Siapa Presiden Indonesia ke-1?", type: "multiple-choice", options: ["Soeharto", "Soekarno", "Habibie", "Jokowi"], correctAnswer: "Soekarno", color: "red" },
  { id: "2", label: "Ibukota", question: "Apa nama Ibukota baru Indonesia?", type: "essay", correctAnswer: "IKN", color: "blue" },
  { id: "3", label: "Matematika", question: "5 x 5 = ?", type: "multiple-choice", options: ["10", "25", "55", "15"], correctAnswer: "25", color: "green" },
  { id: "4", label: "Sejarah", question: "Tahun berapa Indonesia merdeka?", type: "essay", correctAnswer: "1945", color: "yellow" },
  { id: "5", label: "Biologi", question: "Hewan pemakan daging disebut?", type: "multiple-choice", options: ["Herbivora", "Karnivora", "Omnivora"], correctAnswer: "Karnivora", color: "purple" },
];

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "teal"];

// --- AUDIO SYNTHESIZER ---
const playSound = (type: "spin" | "win" | "lose" | "click") => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  
  if (type === "spin") {
    osc.type = "square";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "win") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 1);
    osc.start(now);
    osc.stop(now + 1);
    
    // Harmony
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.linearRampToValueAtTime(1000, now + 0.4);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.linearRampToValueAtTime(0, now + 1);
    osc2.start(now);
    osc2.stop(now + 1);
  } else if (type === "lose") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
};

export default function Index() {
  const { toast } = useToast();
  
  // State Utama
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [gameState, setGameState] = useState<GameState>({
    points: 0,
    isSpinning: false,
    wheelAngle: 0,
    lastResult: null,
    soundEnabled: true,
  });

  // State Dialog & Interaksi
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isWrongAnimation, setIsWrongAnimation] = useState(false);
  
  // State PENTING: Mencegah Double Click
  const [hasAnswered, setHasAnswered] = useState(false);

  // State Tambah & Hapus Soal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form State
  const [newType, setNewType] = useState<QuestionType>("multiple-choice");
  const [newText, setNewText] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newOptions, setNewOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [newCorrect, setNewCorrect] = useState("");

  // --- LOGIKA EFEK & SPIN ---

  const triggerConfetti = () => {
    const colors = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];
    for (let i = 0; i < 50; i++) {
      const el = document.createElement("div");
      el.className = "fixed w-3 h-3 z-[100] rounded-sm pointer-events-none";
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.left = "50%";
      el.style.top = "50%";
      document.body.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 5 + Math.random() * 10;
      const tx = Math.cos(angle) * velocity * 20;
      const ty = Math.sin(angle) * velocity * 20;

      el.animate([
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${tx}vw, ${ty}vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], {
        duration: 1000 + Math.random() * 1000,
        easing: "cubic-bezier(0, .9, .57, 1)",
      }).onfinish = () => el.remove();
    }
  };

  const spinWheel = () => {
    if (gameState.isSpinning || questions.length === 0) return;
    
    if (gameState.soundEnabled) playSound("click");
    setGameState(prev => ({ ...prev, isSpinning: true }));

    const randomIndex = Math.floor(Math.random() * questions.length);
    const selectedItem = questions[randomIndex];

    const anglePerItem = 360 / questions.length;
    const offsetToCenter = anglePerItem / 2;
    const targetSegmentAngle = randomIndex * anglePerItem + offsetToCenter;
    
    const spins = 1800; // 5 putaran penuh
    const randomOffset = (Math.random() - 0.5) * anglePerItem * 0.4;
    
    const currentRotation = gameState.wheelAngle % 360;
    const desiredRotation = (360 - targetSegmentAngle) + randomOffset;
    let rotationNeeded = desiredRotation - currentRotation;
    if (rotationNeeded < 0) rotationNeeded += 360;
    
    const targetAngle = gameState.wheelAngle + spins + rotationNeeded;

    const duration = 4000;
    const startTime = Date.now();
    const startAngle = gameState.wheelAngle;
    let lastSoundTime = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (targetAngle - startAngle) * easeOut;

      if (gameState.soundEnabled && progress < 0.9) {
        if (Date.now() - lastSoundTime > (100 + (progress * 300))) { 
           playSound("spin");
           lastSoundTime = Date.now();
        }
      }

      setGameState(prev => ({ ...prev, wheelAngle: currentAngle }));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(selectedItem);
      }
    };
    requestAnimationFrame(animate);
  };

  const finishSpin = (item: QuestionItem) => {
    setGameState(prev => ({ ...prev, isSpinning: false, lastResult: item }));
    setActiveQuestion(item);
    setUserAnswer("");
    setHasAnswered(false); // Reset status jawaban saat soal baru muncul
    setIsQuizOpen(true);
  };

  const handleAnswerSubmit = () => {
    // GUARD CLAUSE: Jika sudah pernah menjawab atau soal tidak aktif, hentikan.
    if (!activeQuestion || hasAnswered) return;
    
    // KUNCI TOMBOL: Langsung set true agar tidak bisa diklik lagi
    setHasAnswered(true);

    const isCorrect = userAnswer.toLowerCase().trim() === activeQuestion.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      if (gameState.soundEnabled) playSound("win");
      
      setGameState(prev => ({ ...prev, points: prev.points + 100 }));
      triggerConfetti();
      
      toast({
        title: "JAWABAN BENAR! 🎉",
        description: "+100 Poin untuk Anda!",
        className: "bg-green-600 text-white border-none",
      });
      
      setTimeout(() => setIsQuizOpen(false), 1500); 

    } else {
      if (gameState.soundEnabled) playSound("lose");
      
      setGameState(prev => ({ ...prev, points: Math.max(0, prev.points - 50) }));

      setIsWrongAnimation(true);
      setTimeout(() => setIsWrongAnimation(false), 500);

      toast({
        title: "JAWABAN SALAH! ❌ (-50 Poin)",
        description: `Jawaban yang benar adalah: "${activeQuestion.correctAnswer}"`,
        variant: "destructive",
        duration: 5000,
      });

      setIsQuizOpen(false);
    }
  };

  const handleDeleteQuestion = () => {
    if (deleteTargetId) {
      const updated = questions.filter(q => q.id !== deleteTargetId);
      setQuestions(updated);
      setDeleteTargetId(null);
      toast({ title: "Terhapus", description: "Soal berhasil dihapus dari roda." });
    }
  };

  const handleAddQuestion = () => {
    if (!newText || !newLabel || !newCorrect) {
      toast({ title: "Error", description: "Lengkapi semua data soal.", variant: "destructive" });
      return;
    }
    const newItem: QuestionItem = {
      id: Date.now().toString(),
      label: newLabel,
      question: newText,
      type: newType,
      color: COLORS[questions.length % COLORS.length],
      correctAnswer: newCorrect,
      options: newType === "multiple-choice" ? [newOptions.a, newOptions.b, newOptions.c, newOptions.d] : undefined
    };
    setQuestions([...questions, newItem]);
    setIsAddOpen(false);
    setNewText(""); setNewLabel(""); setNewCorrect(""); setNewOptions({ a: "", b: "", c: "", d: "" });
    toast({ title: "Sukses", description: "Soal ditambahkan!" });
  };

  const getColorHex = (color: string) => {
    const map: Record<string, string> = { red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308", purple: "#a855f7", orange: "#f97316", pink: "#ec4899", teal: "#14b8a6" };
    return map[color] || "#cbd5e1";
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center overflow-x-hidden transition-colors duration-300 ${isWrongAnimation ? "bg-red-900/30" : ""}`}>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      <div className="flex justify-between items-center w-full max-w-5xl mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          QUIZ WHEEL 🎡
        </h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setGameState(p => ({...p, soundEnabled: !p.soundEnabled}))}
          className="text-slate-400 hover:text-white"
        >
          {gameState.soundEnabled ? <Volume2 /> : <VolumeX />}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl items-start">
        
        {/* KOLOM KIRI: RODA & KONTROL UTAMA */}
        <div className="flex flex-col items-center space-y-8">
          <div className="relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-20">
                <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-yellow-400 drop-shadow-xl filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
             </div>

             <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px]">
               <svg 
                 viewBox="0 0 200 200" 
                 className="w-full h-full drop-shadow-2xl"
                 style={{ 
                   transform: `rotate(${gameState.wheelAngle}deg)`,
                   transition: gameState.isSpinning ? "none" : "transform 0.1s ease-out" 
                 }}
               >
                 {questions.map((item, index) => {
                   const total = questions.length;
                   const anglePerItem = 360 / total;
                   const startAngle = (index * anglePerItem - 90) * (Math.PI / 180);
                   const endAngle = ((index + 1) * anglePerItem - 90) * (Math.PI / 180);
                   const x1 = 100 + 100 * Math.cos(startAngle);
                   const y1 = 100 + 100 * Math.sin(startAngle);
                   const x2 = 100 + 100 * Math.cos(endAngle);
                   const y2 = 100 + 100 * Math.sin(endAngle);
                   const midAngle = (startAngle + endAngle) / 2;
                   const textX = 100 + 65 * Math.cos(midAngle);
                   const textY = 100 + 65 * Math.sin(midAngle);
                   const textRotation = (midAngle * 180 / Math.PI) + 90;

                   return (
                     <g key={item.id}>
                       <path d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`} fill={getColorHex(item.color)} stroke="#0f172a" strokeWidth="1" />
                       <text x={textX} y={textY} fill="white" fontSize="7" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRotation}, ${textX}, ${textY})`} style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                         {item.label}
                       </text>
                     </g>
                   );
                 })}
               </svg>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 rounded-full border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center justify-center z-10">
                  <span className="text-2xl animate-pulse">🎯</span>
               </div>
             </div>
          </div>

          <div className="w-full max-w-md space-y-4">
            <Button 
              className="w-full py-8 text-2xl font-black italic tracking-wider bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={spinWheel}
              disabled={gameState.isSpinning || questions.length === 0}
            >
              {gameState.isSpinning ? "MEMUTAR..." : "PUTAR!"}
            </Button>
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
               <span className="text-slate-400 font-medium">Skor Poin</span>
               <span className={`text-3xl font-bold transition-colors ${isWrongAnimation ? "text-red-500" : "text-green-400"}`}>
                 {gameState.points}
               </span>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: MANAJEMEN SOAL */}
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white h-[600px] flex flex-col shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl flex items-center gap-2">
                 <RefreshCw className="w-5 h-5 text-indigo-400" />
                 Daftar Soal Aktif
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-1" /> Baru
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {questions.length === 0 ? (
                <div className="text-center text-slate-500 mt-20">
                  <p>Roda Kosong.</p>
                  <p className="text-sm">Tambahkan soal baru untuk bermain.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div 
                    key={q.id} 
                    className="group relative flex items-center p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-200"
                  >
                    <div className={`w-3 h-3 rounded-full mr-3 shrink-0 bg-${q.color}-500`} style={{ backgroundColor: getColorHex(q.color) }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate text-slate-200">{q.label}</h4>
                      <p className="text-xs text-slate-500 truncate">{q.question}</p>
                    </div>
                    
                    <Button
                      size="icon"
                      variant="destructive"
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setDeleteTargetId(q.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- DIALOG KUIS (POPUP SOAL) --- */}
      <Dialog open={isQuizOpen} onOpenChange={(open) => { 
        if(!open && !gameState.isSpinning) setIsQuizOpen(false); 
      }}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white shadow-2xl" onInteractOutside={(e) => hasAnswered && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-3xl text-center font-black text-yellow-400 uppercase tracking-widest drop-shadow-md">
              {activeQuestion?.label}
            </DialogTitle>
            <div className="my-6 p-6 bg-slate-800 rounded-xl border border-slate-700">
               <DialogDescription className="text-center text-white text-xl md:text-2xl font-medium leading-relaxed">
                {activeQuestion?.question}
               </DialogDescription>
            </div>
          </DialogHeader>

          <div className="py-2">
            {activeQuestion?.type === "multiple-choice" ? (
              <RadioGroup value={userAnswer} onValueChange={setUserAnswer} disabled={hasAnswered} className="grid grid-cols-1 gap-3">
                {activeQuestion.options?.map((opt, idx) => (
                  <div key={idx} className={`flex items-center space-x-3 border-2 rounded-xl p-4 transition-all cursor-pointer ${userAnswer === opt ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:bg-slate-800 hover:border-slate-600"} ${hasAnswered ? "opacity-60 cursor-not-allowed" : ""}`}>
                    <RadioGroupItem value={opt} id={`opt-${idx}`} disabled={hasAnswered} className="border-slate-400 text-indigo-400" />
                    <Label htmlFor={`opt-${idx}`} className={`flex-1 text-lg font-medium ${hasAnswered ? "cursor-not-allowed" : "cursor-pointer"}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                <Label className="text-slate-400">Jawaban Anda:</Label>
                <Textarea 
                  placeholder="Ketik jawaban di sini..." 
                  disabled={hasAnswered}
                  className="bg-slate-800 border-slate-700 text-white text-lg min-h-[100px] focus:ring-indigo-500 disabled:opacity-50"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button 
              onClick={handleAnswerSubmit} 
              disabled={hasAnswered || !userAnswer.trim()} 
              className={`w-full py-6 text-lg shadow-lg font-bold transition-all ${hasAnswered ? "bg-slate-600" : "bg-green-600 hover:bg-green-700"}`}
            >
              {hasAnswered ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                  Memeriksa...
                </>
              ) : "JAWAB SEKARANG"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG KONFIRMASI HAPUS --- */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Hapus Soal Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Apakah Anda yakin ingin menghapus soal ini dari roda putar? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-red-600 hover:bg-red-700 text-white">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- DIALOG TAMBAH SOAL --- */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Soal Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Label Roda (Singkat)</Label>
                 <Input placeholder="Cth: Kimia" className="bg-slate-800 border-slate-700" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
               </div>
               <div className="space-y-2">
                 <Label>Tipe</Label>
                 <Select value={newType} onValueChange={(val) => setNewType(val as QuestionType)}>
                   <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                   <SelectContent><SelectItem value="multiple-choice">Pilihan Ganda</SelectItem><SelectItem value="essay">Essay</SelectItem></SelectContent>
                 </Select>
               </div>
            </div>
            <div className="space-y-2">
              <Label>Pertanyaan</Label>
              <Textarea placeholder="Tulis soal..." className="bg-slate-800 border-slate-700" value={newText} onChange={e => setNewText(e.target.value)} />
            </div>
            {newType === "multiple-choice" ? (
              <div className="space-y-2 border p-3 rounded-md border-slate-700 bg-slate-800/30">
                <Label className="text-yellow-400 text-xs uppercase tracking-wider font-bold">Opsi & Jawaban</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['a','b','c','d'].map((k) => (
                    <Input key={k} placeholder={`Opsi ${k.toUpperCase()}`} className="bg-slate-800 border-slate-600" value={(newOptions as any)[k]} onChange={e => setNewOptions({...newOptions, [k]: e.target.value})} />
                  ))}
                </div>
                <Label className="mt-2 block text-xs">Kunci Jawaban</Label>
                <Select value={newCorrect} onValueChange={setNewCorrect}>
                  <SelectTrigger className="bg-slate-800 border-slate-600"><SelectValue placeholder="Pilih Jawaban Benar" /></SelectTrigger>
                  <SelectContent>
                    {[newOptions.a, newOptions.b, newOptions.c, newOptions.d].filter(Boolean).map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2"><Label>Kunci Jawaban</Label><Input placeholder="Jawaban..." className="bg-slate-800 border-slate-700" value={newCorrect} onChange={e => setNewCorrect(e.target.value)} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAddQuestion} className="bg-indigo-600 hover:bg-indigo-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
