import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { ScoreBoard } from "@/components/ScoreBoard";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsGameActive(false);
            toast.info(`¡Juego terminado! Puntuación final: ${score}`, {
              duration: 4000,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isGameActive, timeLeft, score]);

  const handleScore = () => {
    setScore((prev) => prev + 1);
    setAttempts((prev) => prev + 1);
  };

  const startGame = () => {
    setScore(0);
    setAttempts(0);
    setTimeLeft(60);
    setIsGameActive(true);
    setGameStarted(true);
    toast.success("¡Juego iniciado! Arrastra la pelota y suéltala para lanzar 🏀");
  };

  const resetGame = () => {
    setScore(0);
    setAttempts(0);
    setTimeLeft(60);
    setIsGameActive(false);
    setGameStarted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-primary/10 flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-top duration-700">
          Basketball Game 🏀
        </h1>
        <p className="text-xl text-muted-foreground animate-in fade-in slide-in-from-top duration-700 delay-100">
          Arrastra la pelota y suéltala para lanzar al aro
        </p>
      </div>

      <ScoreBoard score={score} attempts={attempts} timeLeft={timeLeft} />

      <div className="relative animate-in fade-in zoom-in duration-700 delay-200">
        <GameCanvas onScore={handleScore} isGameActive={isGameActive} />
        
        {!gameStarted && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Button
              size="lg"
              onClick={startGame}
              className="text-2xl py-8 px-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl gap-3"
            >
              <Play className="w-8 h-8" />
              Comenzar Juego
            </Button>
          </div>
        )}

        {gameStarted && !isGameActive && timeLeft === 0 && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-white">¡Tiempo agotado!</h2>
              <p className="text-2xl text-white">Puntuación: {score}</p>
              <Button
                size="lg"
                onClick={resetGame}
                className="text-xl py-6 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl gap-3"
              >
                <RotateCcw className="w-6 h-6" />
                Jugar de nuevo
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {isGameActive && (
          <Button
            variant="outline"
            size="lg"
            onClick={resetGame}
            className="gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reiniciar
          </Button>
        )}
      </div>

      <div className="text-center space-y-2 text-sm text-muted-foreground max-w-md">
        <p>💡 <strong>Consejo:</strong> Arrastra la pelota hacia atrás para más potencia</p>
        <p>🎯 Intenta anotar tantas canastas como puedas en 60 segundos</p>
      </div>
    </div>
  );
};

export default Index;
