import { ReactNode, useState, useRef, useEffect } from "react";
import DraggableWrapper from "./DraggableWrapper";

interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
  resizable?: boolean;
  maximizable?: boolean;
  draggable?: boolean;
  initialSize?: { width?: string; height?: string };
}

export default function Modal({
  children,
  onClose,
  resizable = false,
  maximizable = false,
  draggable = false,
  initialSize,
}: ModalProps) {
  const [size, setSize] = useState(initialSize ?? {});
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);


  // Handle maximize/minimize
  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      setSize(initialSize ?? {});
    } else {
      setSize({ width: "100vw", height: "100vh" });
    }
    setIsMaximized(!isMaximized);
  };

  const startSizeRef = useRef({
    width: 0,
    height: 0,
    startX: 0,
    startY: 0
  });

  const [topLeft, setTopLeft] = useState<{ top: number; left: number } | null>(null);

  // Handle resizing
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      setSize({
        width: Math.max(200, startSizeRef.current.width + (e.clientX - startSizeRef.current.startX)) + "px",
        height: Math.max(100, startSizeRef.current.height + (e.clientY - startSizeRef.current.startY)) + "px",
      });
    };

    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
      setTopLeft(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onMouseDown={() => {
        // ✅ Change: only close on backdrop mousedown if NOT resizing
        if (!isResizing) onClose?.();
      }}
    >
      <DraggableWrapper draggable={draggable} bounds={undefined}>
        <div
          ref={modalRef}
          className="bg-white rounded shadow-lg flex flex-col relative min-h-0"
          style={{
            position: "fixed",
            top: topLeft ? `${topLeft.top}px` : "50%",
            left: topLeft ? `${topLeft.left}px` : "50%",
            transform: topLeft ? "none" : "translate(-50%, -50%)",
            width: size.width ?? "auto",
            height: size.height ?? "auto",
            maxWidth: "95vw",
            maxHeight: "95vh",
            minWidth: "200px",
            minHeight: "100px",
            resize: "none",
            overflow: "auto",
            userSelect: isResizing ? "none" : "auto",
            pointerEvents: isResizing ? "all" : "auto",
          }}

          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Top-right controls */}
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            {maximizable && (
              <button
                onClick={handleMaximize}
                className="text-black hover:text-gray-800 text-lg font-bold"
              >
                {isMaximized ? (
                  <span className="text-black light text-sm relative ">🗗</span>
                ) : (
                  <svg className="w-4 h-4 stroke-black relative top-[2px]" fill="none" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x={4} y={4} width={16} height={16} stroke="currentColor"/>
                  </svg>
                )} 
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 text-lg font-bold"
            >
              &times;
            </button>
          </div>

          {/* Drag handle */}
          <div className="modal-header cursor-move p-2 border-b flex-shrink-0 bg-slate-600 select-none" />

          {/* Content */}
          <div className="flex-1 min-h-0 relative">{children}</div>

          {/* Resize handle */}
          {resizable && (
            <div
              className="resize-handle absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-1"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.stopPropagation();
                const rect = modalRef.current!.getBoundingClientRect();

                startSizeRef.current = {
                  width: rect.width,
                  height: rect.height,
                  startX: e.clientX,
                  startY: e.clientY,
                };

                setIsResizing(true);
              }}
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-1 p-[1px]">
                <div className="w-[2px] h-[2px] rounded-full bg-transparent"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-gray-400"></div>
                <div className="w-[2px] h-[2px] rounded-full bg-transparent"></div>
              </div>
            </div>
          )}
        </div>
      </DraggableWrapper>
    </div>
  );
}
