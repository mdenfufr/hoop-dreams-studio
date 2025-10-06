export interface BodyPart {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
  view: "front" | "back";
}

export const bodyParts: BodyPart[] = [
  // Vista Frontal
  { id: "chest", name: "Pectorales", coordinates: { x: 50, y: 25 }, view: "front" },
  { id: "abs", name: "Abdominales", coordinates: { x: 50, y: 35 }, view: "front" },
  { id: "biceps_left", name: "Bíceps Izquierdo", coordinates: { x: 30, y: 30 }, view: "front" },
  { id: "biceps_right", name: "Bíceps Derecho", coordinates: { x: 70, y: 30 }, view: "front" },
  { id: "quadriceps_left", name: "Cuádriceps Izquierdo", coordinates: { x: 45, y: 50 }, view: "front" },
  { id: "quadriceps_right", name: "Cuádriceps Derecho", coordinates: { x: 55, y: 50 }, view: "front" },
  { id: "deltoids_left", name: "Deltoides Izquierdo", coordinates: { x: 25, y: 20 }, view: "front" },
  { id: "deltoids_right", name: "Deltoides Derecho", coordinates: { x: 75, y: 20 }, view: "front" },
  
  // Vista Posterior
  { id: "upper_back", name: "Espalda Superior", coordinates: { x: 50, y: 25 }, view: "back" },
  { id: "lower_back", name: "Espalda Baja", coordinates: { x: 50, y: 35 }, view: "back" },
  { id: "triceps_left", name: "Tríceps Izquierdo", coordinates: { x: 30, y: 30 }, view: "back" },
  { id: "triceps_right", name: "Tríceps Derecho", coordinates: { x: 70, y: 30 }, view: "back" },
  { id: "calves_left", name: "Pantorrilla Izquierda", coordinates: { x: 45, y: 60 }, view: "back" },
  { id: "calves_right", name: "Pantorrilla Derecha", coordinates: { x: 55, y: 60 }, view: "back" },
];