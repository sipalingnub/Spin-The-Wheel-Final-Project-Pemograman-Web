import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- TIPE DATA ---
type QuestionType = "multiple-choice" | "essay";

interface QuestionItem {
  id: string;
  label: string; // Teks pendek untuk di Roda
  question: string; // Soal lengkap
  type: QuestionType;
  options?: string[]; // Opsional: hanya untuk PG
  correctAnswer: string;
  color: string;
}

interface GameState {
  points: number;
  isSpinning: boolean;
  wheelAngle: number;
  lastResult: QuestionItem | null;
}

// --- DATA AWAL (DEFAULT) ---
const INITIAL_QUESTIONS: QuestionItem[] = [
  { 
    id: "1", label: "Presiden RI", question: "Ada berapa jumlah Presiden Indonesia saat ini (hingga 2024)?", 
    type: "multiple-choice", options: ["6", "7", "8", "9"], correctAnswer: "8", color: "red" 
  },
  { 
    id: "2", label: "Ibukota", question: "Apa nama Ibukota baru Indonesia?", 
    type: "essay", correctAnswer: "IKN", color: "blue" 
  },
  { 
    id: "3", label: "Matematika", question: "Berapa hasil dari 5 x 5?", 
    type: "multiple-choice", options: ["10", "25", "55", "15"], correctAnswer: "25", color: "green" 
  },
  { 
    id: "4", label: "Sejarah", question: "Tahun berapa Indonesia merdeka?", 
    type: "essay", correctAnswer: "1945", color: "yellow" 
  },
  { 
    id: "5", label: "Hewan", question: "Hewan apa yang memiliki belalai?", 
    type: "multiple-choice", options: ["Kuda", "Gajah", "Jerapah", "Semut"], correctAnswer: "Gajah", color: "purple" 
  },
];

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "teal"];

export default function Index() {
  const { toast } = useToast();
  const wheelRef = useRef<SVGSVGElement>(null);

  // --- STATE ---
  const [questions, setQuestions] = useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [gameState, setGameState] = useState<GameState>({
    points: 0,
    isSpinning: false,
    wheelAngle: 0,
    lastResult: null,
  });

  // State untuk Popup Kuis
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionItem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  
  // State untuk Tambah Soal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("multiple-choice");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newOptions, setNewOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");

  // --- LOGIKA GAME ---

  const spinWheel = () => {
    if (gameState.isSpinning) return;

    setGameState((prev) => ({ ...prev, isSpinning: true }));

    // Pilih pemenang secara acak
    const randomIndex = Math.floor(Math.random() * questions.length);
    const selectedItem = questions[randomIndex];

    // --- LOGIKA SUDUT (SINKRONISASI DIPERBAIKI) ---
    const anglePerItem = 360 / questions.length;
    const offsetToCenter = anglePerItem / 2;
    const targetSegmentAngle = randomIndex * anglePerItem + offsetToCenter;
    
    // Putar minimal 5x (1800 derajat) + variasi random
    const spins = 1800; 
    const randomOffset = (Math.random() - 0.5) * anglePerItem * 0.4;
    
    const currentRotation = gameState.wheelAngle % 360;
    const desiredRotation = (360 - targetSegmentAngle) + randomOffset;
    let rotationNeeded = desiredRotation - currentRotation;
    
    if (rotationNeeded < 0) rotationNeeded += 360;
    
    const targetAngle = gameState.wheelAngle + spins + rotationNeeded;

    // Animasi Manual dengan requestAnimationFrame agar mulus
    const duration = 4000;
    const startTime = Date.now();
    const startAngle = gameState.wheelAngle;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function (easeOutCubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentAngle = startAngle + (targetAngle - startAngle) * easeOut;

      setGameState((prev) => ({ ...prev, wheelAngle: currentAngle }));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // SELESAI SPIN
        finishSpin(selectedItem);
      }
    };

    requestAnimationFrame(animate);
  };

  const finishSpin = (item: QuestionItem) => {
    setGameState((prev) => ({
      ...prev,
      isSpinning: false,
      lastResult: item
    }));
    
    // Buka Popup Soal
    setActiveQuestion(item);
    setUserAnswer(""); // Reset jawaban
    setIsQuizOpen(true);
  };

  const handleAnswerSubmit = () => {
    if (!activeQuestion) return;

    const isCorrect = userAnswer.toLowerCase().trim() === activeQuestion.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      setGameState(prev => ({ ...prev, points: prev.points + 100 }));
      toast({
        title: "BENAR! 🎉",
        description: "Selamat! Jawaban Anda tepat. (+100 Poin)",
        className: "bg-green-500 text-white border-none"
      });
    } else {
      toast({
        title: "SALAH 😢",
        description: `Jawaban yang benar adalah: ${activeQuestion.correctAnswer}`,
        variant: "destructive"
      });
    }

    setIsQuizOpen(false);
  };

  const handleAddQuestion = () => {
    if (!newQuestionText || !newQuestionLabel || !newCorrectAnswer) {
      toast({ title: "Error", description: "Mohon lengkapi semua data soal.", variant: "destructive" });
      return;
    }

    const newItem: QuestionItem = {
      id: Date.now().toString(),
      label: newQuestionLabel,
      question: newQuestionText,
      type: newQuestionType,
      color: COLORS[questions.length % COLORS.length],
      correctAnswer: newCorrectAnswer,
      options: newQuestionType === "multiple-choice" 
        ? [newOptions.a, newOptions.b, newOptions.c, newOptions.d] 
        : undefined
    };

    setQuestions([...questions, newItem]);
    setIsAddOpen(false);
    
    // Reset Form
    setNewQuestionText("");
    setNewQuestionLabel("");
    setNewCorrectAnswer("");
    setNewOptions({ a: "", b: "", c: "", d: "" });
    
    toast({ title: "Sukses", description: "Soal berhasil ditambahkan ke roda!" });
  };

  // --- RENDER VISUAL ---
  
  const getColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
      purple: "#a855f7", orange: "#f97316", pink: "#ec4899", teal: "#14b8a6"
    };
    return map[colorName] || "#cbd5e1";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
        QUIZ WHEEL 🎡
      </h1>
      <p className="text-slate-400 mb-8">Putar rodanya, jawab soalnya!</p>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl items-start">
        
        {/* KOLOM KIRI: RODA */}
        <div className="relative flex justify-center items-center">
           {/* Panah Penunjuk */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-yellow-400 drop-shadow-lg" />
           </div>

           {/* Roda SVG */}
           <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
             <svg 
               viewBox="0 0 200 200" 
               className="w-full h-full transition-transform duration-0"
               style={{ transform: `rotate(${gameState.wheelAngle}deg)` }}
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
                 const textX = 100 + 60 * Math.cos(midAngle);
                 const textY = 100 + 60 * Math.sin(midAngle);
                 const textRotation = (midAngle * 180 / Math.PI) + 90;

                 return (
                   <g key={item.id}>
                     <path
                       d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                       fill={getColorHex(item.color)}
                       stroke="#1e293b"
                       strokeWidth="1"
                     />
                     <text
                       x={textX}
                       y={textY}
                       fill="white"
                       fontSize="8"
                       fontWeight="bold"
                       textAnchor="middle"
                       dominantBaseline="middle"
                       transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                     >
                       {item.label}
                     </text>
                   </g>
                 );
               })}
             </svg>
             {/* Titik Tengah */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-900 rounded-full border-4 border-yellow-400 shadow-lg flex items-center justify-center">
                <span className="text-xl">🎯</span>
             </div>
           </div>
        </div>

        {/* KOLOM KANAN: KONTROL */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle>Statistik Pemain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                Poin Anda: {gameState.points}
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Jawab soal dengan benar untuk mendapatkan poin!
              </p>
            </CardContent>
          </Card>

          <Button 
            className="w-full py-8 text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-indigo-500/25"
            onClick={spinWheel}
            disabled={gameState.isSpinning}
          >
            {gameState.isSpinning ? "Memutar..." : "PUTAR SEKARANG!"}
          </Button>

          <Button 
            variant="outline" 
            className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setIsAddOpen(true)}
          >
            + Tambah Soal Sendiri
          </Button>
        </div>
      </div>

      {/* --- DIALOG KUIS (POPUP SOAL) --- */}
      <Dialog open={isQuizOpen} onOpenChange={setIsQuizOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-yellow-400">
              PERTANYAAN!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-300 text-lg font-medium mt-4">
              {activeQuestion?.question}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {activeQuestion?.type === "multiple-choice" ? (
              <RadioGroup value={userAnswer} onValueChange={setUserAnswer} className="gap-3">
                {activeQuestion.options?.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2 border border-slate-700 rounded-lg p-3 hover:bg-slate-800 cursor-pointer">
                    <RadioGroupItem value={opt} id={`opt-${idx}`} className="border-white text-yellow-400" />
                    <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer text-base">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                <Label>Jawaban Essay Anda:</Label>
                <Textarea 
                  placeholder="Ketik jawaban di sini..." 
                  className="bg-slate-800 border-slate-700 text-white"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleAnswerSubmit} className="w-full bg-green-600 hover:bg-green-700">
              Jawab Pertanyaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* --- DIALOG TAMBAH SOAL --- */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Soal Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipe Soal</Label>
              <Select 
                value={newQuestionType} 
                onValueChange={(val) => setNewQuestionType(val as QuestionType)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Pilihan Ganda</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Label Roda (Singkat)</Label>
              <Input 
                placeholder="Cth: Matematika" 
                className="bg-slate-800 border-slate-700" 
                value={newQuestionLabel}
                onChange={e => setNewQuestionLabel(e.target.value)}
              />
            </div>

            <div>
              <Label>Pertanyaan Lengkap</Label>
              <Textarea 
                placeholder="Tulis soal di sini..." 
                className="bg-slate-800 border-slate-700" 
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
              />
            </div>

            {newQuestionType === "multiple-choice" && (
              <div className="space-y-2 border p-3 rounded-md border-slate-700">
                <Label className="text-yellow-400">Opsi Jawaban:</Label>
                <Input placeholder="Pilihan A" className="bg-slate-800 border-slate-700" value={newOptions.a} onChange={e => setNewOptions({...newOptions, a: e.target.value})} />
                <Input placeholder="Pilihan B" className="bg-slate-800 border-slate-700" value={newOptions.b} onChange={e => setNewOptions({...newOptions, b: e.target.value})} />
                <Input placeholder="Pilihan C" className="bg-slate-800 border-slate-700" value={newOptions.c} onChange={e => setNewOptions({...newOptions, c: e.target.value})} />
                <Input placeholder="Pilihan D" className="bg-slate-800 border-slate-700" value={newOptions.d} onChange={e => setNewOptions({...newOptions, d: e.target.value})} />
                
                <Label className="mt-2 block">Kunci Jawaban (harus sama persis dengan opsi):</Label>
                <Select value={newCorrectAnswer} onValueChange={setNewCorrectAnswer}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Pilih Kunci" />
                  </SelectTrigger>
                  <SelectContent>
                    {[newOptions.a, newOptions.b, newOptions.c, newOptions.d].filter(Boolean).map((opt, i) => (
                      <SelectItem key={i} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newQuestionType === "essay" && (
              <div>
                <Label>Kunci Jawaban</Label>
                <Input 
                  placeholder="Jawaban benar..." 
                  className="bg-slate-800 border-slate-700" 
                  value={newCorrectAnswer}
                  onChange={e => setNewCorrectAnswer(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-slate-600 text-slate-400">Batal</Button>
            <Button onClick={handleAddQuestion} className="bg-purple-600 hover:bg-purple-700">Simpan Soal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
