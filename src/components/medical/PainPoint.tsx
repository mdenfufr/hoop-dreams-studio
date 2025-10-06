import { BodyPart } from "./types";

interface PainPointProps {
  part: BodyPart;
  isSelected: boolean;
  onClick: () => void;
}

export function PainPoint({ part, isSelected, onClick }: PainPointProps) {
  return (
    <div
      className="absolute"
      style={{
        left: `${part.coordinates.x}%`,
        top: `${part.coordinates.y}%`,
      }}
    >
      <button
        onClick={onClick}
        className={`w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
          isSelected ? "bg-blue-500" : "bg-gray-400 hover:bg-blue-400"
        }`}
      />
      <div
        className={`absolute ${
          part.coordinates.x > 50 ? "left-2" : "right-2"
        } top-1/2 transform -translate-y-1/2 flex items-center gap-2 whitespace-nowrap ${
          part.coordinates.x > 50 ? "" : "flex-row-reverse"
        }`}
      >
        <div className={`h-px w-8 bg-current ${isSelected ? "bg-blue-500" : "bg-gray-400"}`} />
        <span className={`text-xs ${isSelected ? "text-blue-500 font-medium" : "text-gray-600"}`}>
          {part.name}
        </span>
      </div>
    </div>
  );
}