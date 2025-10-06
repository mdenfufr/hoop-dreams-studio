interface Body3DViewerProps {
  view: 'front' | 'back';
  onPartClick: (partName: string) => void;
}

export function Body3DViewer({ view, onPartClick }: Body3DViewerProps) {
  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Vista {view === 'front' ? 'Frontal' : 'Posterior'}</p>
    </div>
  );
}