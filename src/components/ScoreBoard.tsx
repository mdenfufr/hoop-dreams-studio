import { Card } from "@/components/ui/card";
import { Trophy, Target, Timer } from "lucide-react";

interface ScoreBoardProps {
  score: number;
  attempts: number;
  timeLeft: number;
}

export const ScoreBoard = ({ score, attempts, timeLeft }: ScoreBoardProps) => {
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
        <div className="flex flex-col items-center gap-2">
          <Trophy className="w-8 h-8 text-primary" />
          <div className="text-3xl font-bold text-primary">{score}</div>
          <div className="text-sm text-muted-foreground">Canastas</div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/20">
        <div className="flex flex-col items-center gap-2">
          <Target className="w-8 h-8 text-accent" />
          <div className="text-3xl font-bold text-accent">{accuracy}%</div>
          <div className="text-sm text-muted-foreground">Precisión</div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20">
        <div className="flex flex-col items-center gap-2">
          <Timer className="w-8 h-8 text-secondary" />
          <div className="text-3xl font-bold text-secondary">{timeLeft}</div>
          <div className="text-sm text-muted-foreground">Segundos</div>
        </div>
      </Card>
    </div>
  );
};
