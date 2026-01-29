"use client";
import { ReactNode, useRef } from "react";
import Draggable, { DraggableBounds } from "react-draggable";

interface Props {
  children: ReactNode;
  draggable?: boolean;
  bounds?: DraggableBounds;
}

export default function DraggableWrapper({ children, draggable = false, bounds }:  Props) {
  const nodeRef = useRef(null);

  if (!draggable) {
    return <div>{children}</div>;
  }

  return (
    <Draggable nodeRef={nodeRef} handle=".modal-header" cancel="" bounds={bounds} >
      <div ref={nodeRef}>
        {children}
      </div>
    </Draggable>
  );
}
