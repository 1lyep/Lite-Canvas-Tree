import React, { useState } from 'react';
import { WorkflowNode } from '../types';

interface ConnectionLineProps {
  startNode: WorkflowNode;
  endNode: WorkflowNode;
  isTemporary?: boolean;
  onDelete?: () => void;
  isDarkMode?: boolean;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
  startNode, 
  endNode, 
  isTemporary = false,
  onDelete,
  isDarkMode
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic anchor points based on node size
  // Start: Right edge, vertical center
  const startX = startNode.x + startNode.width; 
  const startY = startNode.y + (startNode.height / 2); 
  
  // End: Left edge, vertical center
  const endX = endNode.x;
  const endY = endNode.y + (endNode.height / 2);

  // Calculate bezier control points for a smooth S-curve
  const dist = Math.abs(endX - startX);
  const controlPointOffset = Math.max(dist * 0.5, 50);

  const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;

  const strokeColor = isTemporary 
    ? (isDarkMode ? "#64748b" : "#94a3b8")
    : isHovered 
      ? "#ef4444" // Red on hover
      : (isDarkMode ? "#94a3b8" : "#64748b"); // Slate for normal

  return (
    <g 
      onMouseEnter={() => !isTemporary && setIsHovered(true)}
      onMouseLeave={() => !isTemporary && setIsHovered(false)}
      onClick={(e) => {
        if (!isTemporary && onDelete) {
          e.stopPropagation();
          onDelete();
        }
      }}
      className={!isTemporary ? "cursor-pointer" : "pointer-events-none"}
    >
      {/* Invisible wide path for easier clicking */}
      {!isTemporary && (
        <path
          d={path}
          stroke="transparent"
          strokeWidth="12"
          fill="none"
        />
      )}
      
      {/* Visible path */}
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth="2"
        fill="none"
        strokeDasharray={isTemporary ? "5,5" : "none"}
        className="transition-colors duration-200"
      />

      {/* End dot */}
      <circle 
        cx={endX} 
        cy={endY} 
        r="3" 
        fill={strokeColor} 
        className="transition-colors duration-200"
      />
      
      {/* Start dot */}
       <circle 
        cx={startX} 
        cy={startY} 
        r="3" 
        fill={strokeColor} 
        className="transition-colors duration-200"
      />

      {/* Delete Label on Hover */}
      {isHovered && !isTemporary && (
        <g style={{ transform: `translate(${(startX + endX) / 2}px, ${(startY + endY) / 2}px)` }}>
          <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#ef4444" />
          <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="white" strokeWidth="2" />
        </g>
      )}
    </g>
  );
};

export const TempConnectionLine: React.FC<{ 
  startX: number;
  startY: number;
  mouseX: number; 
  mouseY: number 
}> = ({ startX, startY, mouseX, mouseY }) => {
  
  const dist = Math.abs(mouseX - startX);
  const controlPointOffset = Math.max(dist * 0.5, 50);

  const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${mouseX - controlPointOffset} ${mouseY}, ${mouseX} ${mouseY}`;

  return (
    <path
      d={path}
      stroke="#3b82f6"
      strokeWidth="2"
      fill="none"
      strokeDasharray="5,5"
      className="pointer-events-none z-50"
    />
  );
};