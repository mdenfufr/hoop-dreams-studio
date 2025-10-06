import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isDragging: boolean;
}

interface Hoop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameCanvasProps {
  onScore: () => void;
  isGameActive: boolean;
}

export const GameCanvas = ({ onScore, isGameActive }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ball, setBall] = useState<Ball>({
    x: 100,
    y: 400,
    vx: 0,
    vy: 0,
    radius: 20,
    isDragging: false,
  });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number>();

  const hoop: Hoop = {
    x: 350,
    y: 150,
    width: 80,
    height: 10,
  };

  const GRAVITY = 0.5;
  const FRICTION = 0.98;
  const BOUNCE = 0.7;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw court lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
      ctx.stroke();

      // Draw backboard
      ctx.fillStyle = "hsl(var(--accent))";
      ctx.fillRect(hoop.x + 20, hoop.y - 60, 40, 70);
      ctx.strokeStyle = "hsl(var(--accent-foreground))";
      ctx.lineWidth = 2;
      ctx.strokeRect(hoop.x + 20, hoop.y - 60, 40, 70);

      // Draw hoop
      ctx.strokeStyle = "hsl(var(--destructive))";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hoop.x + 40, hoop.y, 30, 0, Math.PI);
      ctx.stroke();

      // Draw net
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 8) * i;
        const x = hoop.x + 40 + Math.cos(angle) * 30;
        const y = hoop.y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle + Math.PI / 2) * 20, y + 20);
        ctx.stroke();
      }

      // Draw ball with gradient
      const gradient = ctx.createRadialGradient(
        ball.x - 8,
        ball.y - 8,
        5,
        ball.x,
        ball.y,
        ball.radius
      );
      gradient.addColorStop(0, "hsl(var(--ball-orange))");
      gradient.addColorStop(1, "hsl(var(--ball-dark))");
      
      ctx.shadowColor = "hsl(var(--ball-orange))";
      ctx.shadowBlur = 15;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw ball lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ball.x - ball.radius, ball.y);
      ctx.lineTo(ball.x + ball.radius, ball.y);
      ctx.stroke();
    };

    const update = () => {
      if (!ball.isDragging && isGameActive) {
        setBall((prev) => {
          let newX = prev.x + prev.vx;
          let newY = prev.y + prev.vy;
          let newVx = prev.vx * FRICTION;
          let newVy = prev.vy + GRAVITY;

          // Wall collisions
          if (newX - prev.radius < 0 || newX + prev.radius > canvas.width) {
            newVx = -newVx * BOUNCE;
            newX = newX - prev.radius < 0 ? prev.radius : canvas.width - prev.radius;
          }

          // Floor collision
          if (newY + prev.radius > canvas.height) {
            newVy = -newVy * BOUNCE;
            newY = canvas.height - prev.radius;
            if (Math.abs(newVy) < 1) newVy = 0;
          }

          // Check if ball goes through hoop
          const hoopCenterX = hoop.x + 40;
          const hoopY = hoop.y;
          
          if (
            Math.abs(newX - hoopCenterX) < 25 &&
            newY > hoopY - 10 &&
            newY < hoopY + 10 &&
            prev.vy > 0
          ) {
            onScore();
            toast.success("¡Canasta! 🏀", {
              duration: 2000,
            });
          }

          return {
            ...prev,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        });
      }

      draw();
      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ball, isGameActive, onScore]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isGameActive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
    if (distance < ball.radius) {
      setBall((prev) => ({ ...prev, isDragging: true, vx: 0, vy: 0 }));
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ball.isDragging || !dragStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setBall((prev) => ({ ...prev, x, y }));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ball.isDragging || !dragStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const vx = (dragStart.x - x) * 0.3;
    const vy = (dragStart.y - y) * 0.3;

    setBall((prev) => ({
      ...prev,
      isDragging: false,
      vx,
      vy,
    }));
    setDragStart(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={600}
      className="border-4 border-secondary rounded-lg shadow-2xl bg-gradient-to-b from-secondary to-secondary/80 cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
