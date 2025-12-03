import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface WheelItem {
  text: string;
  value: number | string;
  color: string;
  probability: number;
}

interface GameState {
  points: number;
  spinsLeft: number;
  totalSpins: number;
  highestWin: number;
  isSpinning: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  currentBonus: { type: string; remaining: number } | null;
  spinHistory: Array<{ id: number; text: string; value: number | string; time: string }>;
  lastResult: WheelItem | null;
  wheelAngle: number;
}

const WHEEL_ITEMS: WheelItem[] = [
  { text: "100 POIN", value: 100, color: "red", probability: 20 },
  { text: "200 POIN", value: 200, color: "teal", probability: 18 },
  { text: "50 POIN", value: 50, color: "yellow", probability: 22 },
  { text: "300 POIN", value: 300, color: "green", probability: 15 },
  { text: "2X BONUS", value: "2x", color: "blue", probability: 10 },
  { text: "JACKPOT", value: "jackpot", color: "pink", probability: 5 },
  { text: "SPIN GRATIS", value: "free", color: "purple", probability: 5 },
  { text: "25 POIN", value: 25, color: "orange", probability: 5 },
];

const SPIN_COST = 50;
const INITIAL_SPINS = 5;

const getColorClasses = (color: string) => {
  const colors = {
    red: { gradient: "from-red-400 to-red-700", light: "bg-red-500" },
    teal: { gradient: "from-teal-400 to-teal-700", light: "bg-teal-500" },
    yellow: { gradient: "from-yellow-400 to-yellow-700", light: "bg-yellow-500" },
    green: { gradient: "from-green-400 to-green-700", light: "bg-green-500" },
    blue: { gradient: "from-blue-400 to-blue-700", light: "bg-blue-500" },
    pink: { gradient: "from-pink-500 to-pink-800", light: "bg-pink-600" },
    purple: { gradient: "from-purple-500 to-purple-800", light: "bg-purple-600" },
    orange: { gradient: "from-orange-400 to-orange-700", light: "bg-orange-500" },
  };
  return colors[color as keyof typeof colors] || colors.red;
};

export default function Index() {
  const { toast } = useToast();
  const wheelRef = useRef<SVGSVGElement>(null);
  const [showJackpot, setShowJackpot] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    points: 1000,
    spinsLeft: INITIAL_SPINS,
    totalSpins: 0,
    highestWin: 0,
    isSpinning: false,
    soundEnabled: true,
    vibrationEnabled: true,
    currentBonus: null,
    spinHistory: [],
    lastResult: null,
    wheelAngle: 0,
  });

  useEffect(() => {
    const savedData = localStorage.getItem("spinWheelGame");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setGameState((prev) => ({
          ...prev,
          points: data.points || 1000,
          spinsLeft: data.spinsLeft || INITIAL_SPINS,
          totalSpins: data.totalSpins || 0,
          highestWin: data.highestWin || 0,
          soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : true,
          vibrationEnabled: data.vibrationEnabled !== undefined ? data.vibrationEnabled : true,
          spinHistory: data.spinHistory || [],
        }));
      } catch (e) {
        console.log("Error loading game state:", e);
      }
    }
  }, []);

  useEffect(() => {
    const saveData = {
      points: gameState.points,
      spinsLeft: gameState.spinsLeft,
      totalSpins: gameState.totalSpins,
      highestWin: gameState.highestWin,
      soundEnabled: gameState.soundEnabled,
      vibrationEnabled: gameState.vibrationEnabled,
      spinHistory: gameState.spinHistory.slice(0, 5),
    };
    localStorage.setItem("spinWheelGame", JSON.stringify(saveData));
  }, [gameState]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.spinsLeft < 3) {
          toast({
            title: "Spin Diisi Ulang!",
            description: "+2 spin gratis untuk Anda!",
          });
          return { ...prev, spinsLeft: prev.spinsLeft + 2 };
        }
        return prev;
      });
    }, 300000);

    return () => clearInterval(interval);
  }, [toast]);

  const selectRandomItem = (): WheelItem => {
    const totalProbability = WHEEL_ITEMS.reduce((sum, item) => sum + item.probability, 0);
    let random = Math.random() * totalProbability;

    for (const item of WHEEL_ITEMS) {
      if (random < item.probability) {
        return item;
      }
      random -= item.probability;
    }

    return WHEEL_ITEMS[0];
  };

  const createConfetti = () => {
    const colors = ["#ef4444", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];
    const container = document.body;

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.className = "fixed w-3 h-3 pointer-events-none z-50";
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.top = "0px";

      container.appendChild(confetti);

      const animation = confetti.animate(
        [
          { top: "0px", transform: "rotate(0deg)", opacity: "1" },
          { top: "100vh", transform: `rotate(${Math.random() * 720}deg)`, opacity: "0" },
        ],
        {
          duration: Math.random() * 3000 + 2000,
          easing: "cubic-bezier(0.215, 0.610, 0.355, 1)",
        }
      );

      animation.onfinish = () => {
        confetti.remove();
      };
    }
  };

  const finishSpin = (selectedItem: WheelItem) => {
    let winAmount = 0;
    let message = "";

    if (selectedItem.value === "jackpot") {
      winAmount = 1000;
      message = "🎰 JACKPOT! Anda memenangkan 1000 poin!";
      setShowJackpot(true);
      setTimeout(() => setShowJackpot(false), 3000);
    } else if (selectedItem.value === "2x") {
      setGameState((prev) => ({
        ...prev,
        currentBonus: { type: "2x", remaining: 3 },
      }));
      message = "⚡ BONUS 2X AKTIF! 3 spin berikutnya mendapatkan 2x poin!";
    } else if (selectedItem.value === "free") {
      setGameState((prev) => ({
        ...prev,
        spinsLeft: prev.spinsLeft + 2,
      }));
      message = "🎁 Anda mendapatkan 2 SPIN GRATIS!";
    } else {
      winAmount = selectedItem.value as number;

      if (gameState.currentBonus && gameState.currentBonus.type === "2x") {
        winAmount *= 2;
        setGameState((prev) => ({
          ...prev,
          currentBonus: prev.currentBonus
            ? {
                ...prev.currentBonus,
                remaining: prev.currentBonus.remaining - 1,
              }
            : null,
        }));
      }

      message = `💰 Anda memenangkan ${winAmount} poin!`;
    }

    setGameState((prev) => {
      const newPoints = prev.points + winAmount;
      const newHighest = winAmount > prev.highestWin ? winAmount : prev.highestWin;
      const newHistory = [
        {
          id: Date.now(),
          text: selectedItem.text,
          value: winAmount > 0 ? winAmount : selectedItem.value,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev.spinHistory.slice(0, 9),
      ];

      const newBonus =
        prev.currentBonus && prev.currentBonus.remaining <= 0 ? null : prev.currentBonus;

      return {
        ...prev,
        points: newPoints,
        highestWin: newHighest,
        spinHistory: newHistory,
        lastResult: selectedItem,
        isSpinning: false,
        currentBonus: newBonus,
      };
    });

    toast({
      title: "Hasil Spin!",
      description: message,
      duration: 3000,
    });

    if (winAmount >= 300) {
      createConfetti();
    }

    if (gameState.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const animateWheel = (targetAngle: number, selectedItem: WheelItem) => {
    const duration = 4000;
    const startTime = Date.now();
    const startAngle = gameState.wheelAngle % 360;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + targetAngle * easeOut;

      setGameState((prev) => ({ ...prev, wheelAngle: currentAngle }));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        finishSpin(selectedItem);
      }
    };

    requestAnimationFrame(animate);
  };

  const spinWheel = () => {
    if (gameState.isSpinning) return;
    if (gameState.spinsLeft <= 0) {
      toast({
        title: "Kehabisan Spin!",
        description: "Tunggu pengisian ulang atau menangkan spin gratis.",
        variant: "destructive",
      });
      return;
    }
    if (gameState.points < SPIN_COST) {
      toast({
        title: "Poin Tidak Cukup!",
        description: `Anda memerlukan ${SPIN_COST} poin untuk spin.`,
        variant: "destructive",
      });
      return;
    }

    setGameState((prev) => ({
      ...prev,
      points: prev.points - SPIN_COST,
      spinsLeft: prev.spinsLeft - 1,
      totalSpins: prev.totalSpins + 1,
      isSpinning: true,
    }));

    if (gameState.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const selectedItem = selectRandomItem();
    const itemIndex = WHEEL_ITEMS.findIndex((item) => item.value === selectedItem.value);
    const anglePerItem = 360 / WHEEL_ITEMS.length;
    
    // Hitung sudut agar pointer menunjuk tepat ke tengah segmen yang dipilih
    const offsetToCenter = anglePerItem / 2;
    const targetSegmentAngle = itemIndex * anglePerItem + offsetToCenter;

    const spins = 3600; 
    const randomOffset = (Math.random() - 0.5) * anglePerItem * 0.3;
    
    const currentRotation = gameState.wheelAngle % 360;

// 2. Tentukan posisi target absolut (di mana kita ingin roda berhenti 0-360)
const desiredRotation = (360 - targetSegmentAngle) + randomOffset;

// 3. Hitung selisih jarak yang harus ditempuh
let rotationNeeded = desiredRotation - currentRotation;

// 4. Jika hasilnya negatif (mundur), tambahkan 360 agar tetap berputar maju (clockwise)
if (rotationNeeded < 0) {
  rotationNeeded += 360;
}

// 5. Total putaran adalah jumlah spin penuh + selisih jarak yang dibutuhkan
const targetAngle = spins + rotationNeeded;

    animateWheel(targetAngle, selectedItem);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            🎡 SPIN THE WHEEL
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Putar roda dan menangkan hadiah menarik! Bisakah kamu mendapatkan JACKPOT?
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="flex justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 z-20">
                <div className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[40px] border-t-pink-500 drop-shadow-lg" />
              </div>

              <div className="relative w-full h-full">
                <svg
                  ref={wheelRef}
                  className="absolute inset-0 rounded-full shadow-2xl transition-all duration-100"
                  viewBox="0 0 200 200"
                  style={{ transform: `rotate(${gameState.wheelAngle}deg)` }}
                >
                  {WHEEL_ITEMS.map((item, index) => {
                    const anglePerItem = 360 / WHEEL_ITEMS.length;
                    const startAngle = (index * anglePerItem - 90) * (Math.PI / 180);
                    const endAngle = ((index + 1) * anglePerItem - 90) * (Math.PI / 180);
                    const midAngle = (startAngle + endAngle) / 2;
                    
                    const x1 = 100 + 100 * Math.cos(startAngle);
                    const y1 = 100 + 100 * Math.sin(startAngle);
                    const x2 = 100 + 100 * Math.cos(endAngle);
                    const y2 = 100 + 100 * Math.sin(endAngle);
                    
                    const textX = 100 + 65 * Math.cos(midAngle);
                    const textY = 100 + 65 * Math.sin(midAngle);
                    const textAngle = (midAngle * 180 / Math.PI) + 90;
                    
                    const colorClasses = getColorClasses(item.color);
                    const colors = {
                      red: "#ef4444",
                      teal: "#14b8a6",
                      yellow: "#eab308",
                      green: "#22c55e",
                      blue: "#3b82f6",
                      pink: "#ec4899",
                      purple: "#a855f7",
                      orange: "#f97316",
                    };
                    const fillColor = colors[item.color as keyof typeof colors] || "#ef4444";
                    
                    return (
                      <g key={index}>
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                          fill={fillColor}
                          stroke="#1e293b"
                          strokeWidth="2"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="white"
                          fontSize="8"
                          fontWeight="700"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                          className="drop-shadow-lg"
                        >
                          {item.text}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-slate-900 rounded-full border-4 border-pink-500 flex items-center justify-center z-10 shadow-lg">
                  <span className="text-3xl animate-pulse">💎</span>
                </div>
              </div>

              {showJackpot && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <div className="text-6xl md:text-8xl font-black text-yellow-400 animate-bounce drop-shadow-2xl">
                    JACKPOT!
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Button
              onClick={spinWheel}
              disabled={gameState.isSpinning || gameState.spinsLeft <= 0 || gameState.points < SPIN_COST}
              size="lg"
              className="w-full text-xl py-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {gameState.isSpinning ? (
                <>
                  <span className="animate-spin mr-2">⭐</span>
                  MEMUTAR...
                </>
              ) : (
                <>🎰 PUTAR RODA</>
              )}
            </Button>

            <Card className="bg-slate-800/80 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400">📊 STATISTIK</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Poin Anda:</span>
                  <span className="font-bold text-indigo-400">{gameState.points}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spin Tersisa:</span>
                  <span className="font-bold text-indigo-400">{gameState.spinsLeft}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Spin:</span>
                  <span className="font-bold text-indigo-400">{gameState.totalSpins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hadiah Tertinggi:</span>
                  <span className="font-bold text-indigo-400">{gameState.highestWin}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus Aktif:</span>
                  <span className="font-bold text-indigo-400">
                    {gameState.currentBonus
                      ? `2X (${gameState.currentBonus.remaining} spin)`
                      : "Tidak ada"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-indigo-500/30">
              <CardHeader>
                <CardTitle className="text-indigo-400">🎯 HASIL TERAKHIR</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  {gameState.lastResult ? gameState.lastResult.text : "-"}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGameState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
                }
                className={gameState.soundEnabled ? "border-purple-500" : ""}
              >
                {gameState.soundEnabled ? "🔊" : "🔇"} SUARA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGameState((prev) => ({
                    ...prev,
                    vibrationEnabled: !prev.vibrationEnabled,
                  }))
                }
                className={gameState.vibrationEnabled ? "border-purple-500" : ""}
              >
                {gameState.vibrationEnabled ? "📳" : "🚫"} GETAR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hints = [
                    "Gunakan bonus 2X dengan bijak untuk mendapatkan poin maksimal!",
                    "Jackpot memiliki probabilitas 5% - terus coba dan beruntunglah!",
                    "Spin gratis memberi Anda 2 putaran tambahan tanpa biaya.",
                  ];
                  toast({
                    title: "💡 TIP",
                    description: hints[Math.floor(Math.random() * hints.length)],
                  });
                }}
              >
                💡 TIPS
              </Button>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/80 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400">📜 RIWAYAT SPIN</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gameState.spinHistory.length === 0 ? (
                <p className="text-center text-muted-foreground">Belum ada riwayat spin</p>
              ) : (
                gameState.spinHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <span className="text-purple-400 font-semibold">
                      {item.time} - {item.text}
                    </span>
                    <span className="text-indigo-400 font-bold">
                      {typeof item.value === "number" ? `+${item.value} poin` : item.value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
