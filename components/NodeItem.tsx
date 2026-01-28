import React, { useState, useEffect, useRef } from 'react';
import { WorkflowNode, NodeStatus, NodeType } from '../types';
import { MoreHorizontal, CheckCircle2, Circle, Clock, Diamond, Flag, PlayCircle, GripHorizontal, Trash2, Layout, Pencil, Check } from 'lucide-react';

interface NodeItemProps {
  node: WorkflowNode;
  isSelected: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  onMouseDown: (e: React.PointerEvent, nodeId: string) => void;
  onClick: (nodeId: string) => void;
  onStatusChange: (nodeId: string, newStatus: NodeStatus) => void;
  onConnectStart: (e: React.PointerEvent, nodeId: string, handle: 'source' | 'target') => void;
  onConnectEnd: (nodeId: string) => void;
  onResizeStart: (e: React.PointerEvent, nodeId: string) => void;
  onUpdate: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
}

const statusConfig = {
  [NodeStatus.TODO]: {
    icon: <Circle className="w-4 h-4" />,
    label: 'To Do',
    borderColor: 'border-slate-300 dark:border-slate-600',
    bgColor: 'bg-white dark:bg-slate-800',
    headerBg: 'bg-slate-50 dark:bg-slate-850',
    iconColor: 'text-slate-400 dark:text-slate-500',
    glow: ''
  },
  [NodeStatus.IN_PROGRESS]: {
    icon: <Clock className="w-4 h-4" />,
    label: 'In Progress',
    borderColor: 'border-blue-500 dark:border-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/20',
    headerBg: 'bg-blue-100/50 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]'
  },
  [NodeStatus.DONE]: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Done',
    borderColor: 'border-emerald-500 dark:border-emerald-400',
    bgColor: 'bg-emerald-50/50 dark:bg-emerald-900/20',
    headerBg: 'bg-emerald-100/50 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
  }
};

const getTypeStyles = (type: NodeType) => {
  // Removed 'flex flex-col' from base as it's now handled by the inner wrapper
  const base = "absolute transition-all duration-200 cursor-grab active:cursor-grabbing group select-none pointer-events-auto";

  switch (type) {
    case NodeType.MILESTONE:
      return {
        container: `${base} rounded-full border-2`,
        header: "px-6 py-3 flex items-center justify-between h-full gap-2",
        body: "hidden",
        typeIcon: <Flag className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400 shrink-0" />
      };
    case NodeType.DECISION:
      return {
        container: `${base} rounded-lg border-2`,
        header: "px-4 py-2 border-b flex items-center justify-between border-inherit gap-2",
        body: "p-4 rounded-b-lg flex-1 overflow-hidden",
        typeIcon: <Diamond className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      };
    case NodeType.START_END:
      return {
        container: `${base} rounded-full border-2`,
        header: "px-6 py-3 flex items-center justify-between h-full gap-2",
        body: "hidden",
        typeIcon: <PlayCircle className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
      };
    case NodeType.TASK:
    default:
      return {
        container: `${base} rounded-xl border-2`,
        header: "px-4 py-3 border-b flex items-center justify-between border-inherit flex-shrink-0 gap-2",
        body: "p-4 flex-1 overflow-hidden",
        typeIcon: null
      };
  }
};

export const NodeItem: React.FC<NodeItemProps> = ({
  node,
  isSelected,
  isDragging,
  isResizing,
  onMouseDown,
  onClick,
  onStatusChange,
  onConnectStart,
  onConnectEnd,
  onResizeStart,
  onUpdate,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Refs for click outside detection
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const statusInfo = statusConfig[node.status];
  const typeStyle = getTypeStyles(node.type);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if click is NOT in menu AND NOT on the button
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // If user clicks away (deselects node), save and exit edit mode
  useEffect(() => {
    if (!isSelected && isEditing) {
      setIsEditing(false);
    }
  }, [isSelected, isEditing]);

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const statuses = [NodeStatus.TODO, NodeStatus.IN_PROGRESS, NodeStatus.DONE];
    const nextIndex = (statuses.indexOf(node.status) + 1) % statuses.length;
    onStatusChange(node.id, statuses[nextIndex]);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // 1. If we are editing, DO NOT drag.
    if (isEditing) {
      e.stopPropagation();
      return;
    }

    const target = e.target as HTMLElement;

    // 2. Safety check for interactive elements
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('button') || target.closest('.node-handle') || target.closest('.resize-handle')) {
      return;
    }

    // 3. Start Drag
    onMouseDown(e, node.id);
  };

  const handleTypeChange = (type: NodeType) => {
    onUpdate({ ...node, type });
    setShowMenu(false);
  };

  // Stop propagation for inputs/buttons
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(!isEditing);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Block global delete
    // Allow Shift+Enter for new lines in textarea, but Enter saves in title
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width,
        height: node.height,
        touchAction: 'none'
      }}
      className={`
        ${typeStyle.container}
        ${statusInfo.borderColor}
        ${statusInfo.bgColor}
        ${statusInfo.glow}
        ${(isDragging || isResizing) ? '!transition-none duration-0' : ''}
        ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent shadow-lg z-20' : 'hover:shadow-md z-10'}
        ${node.status === NodeStatus.DONE ? 'opacity-90' : ''}
      `}
      onPointerDown={handlePointerDown}
      onPointerUp={() => onConnectEnd(node.id)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node.id);
      }}
    >
      {/* Inner Content Wrapper for Clipping 
          This wrapper inherits the border-radius from the parent container and clips the children (header/body)
          so their backgrounds don't bleed out of rounded corners.
      */}
      <div className="flex flex-col w-full h-full overflow-hidden rounded-[inherit]">

        {/* Node Header */}
        <div className={`${typeStyle.header} ${statusInfo.headerBg}`}>
          {/* Left Side: Status & Type & Title */}
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            <button
              onClick={handleStatusToggle}
              className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ${statusInfo.iconColor}`}
              onPointerDown={stopPropagation}
            >
              {statusInfo.icon}
            </button>

            {typeStyle.typeIcon}

            <div className="flex-1 min-w-0 flex items-center relative h-6">
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={node.title}
                  onChange={(e) => onUpdate({ ...node, title: e.target.value })}
                  onKeyDown={handleInputKeyDown}
                  onPointerDown={stopPropagation}
                  onClick={stopPropagation}
                  className="w-full h-full font-bold text-slate-800 dark:text-slate-100 text-sm bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1 focus:outline-none select-text cursor-text"
                  placeholder="Title"
                />
              ) : (
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm px-1 truncate select-none">
                  {node.title}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Edit Toggle Button */}
            <button
              onClick={toggleEdit}
              onPointerDown={stopPropagation}
              className={`p-1 rounded transition-colors ${isEditing ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={isEditing ? "Finish Editing" : "Edit Text"}
            >
              {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>

            {/* Menu Button */}
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                onPointerDown={stopPropagation}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Node Body (Description) */}
        <div className={`${typeStyle.body} relative`}>
          {isEditing ? (
            <textarea
              value={node.description}
              onChange={(e) => onUpdate({ ...node, description: e.target.value })}
              onKeyDown={handleInputKeyDown}
              onPointerDown={stopPropagation}
              onClick={stopPropagation}
              className="absolute inset-0 w-full h-full bg-white dark:bg-slate-800 border border-indigo-500 rounded p-2 resize-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed focus:outline-none select-text cursor-text"
              placeholder="Add description..."
            />
          ) : (
            <div
              className="w-full h-full p-1 text-slate-600 dark:text-slate-400 text-xs leading-relaxed overflow-hidden select-none whitespace-pre-wrap"
            >
              {node.description || <span className="italic opacity-50">No description</span>}
            </div>
          )}
        </div>

      </div>

      {/* --- Dropdown Menu (Moved Outside Overflow-Hidden) --- */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-3 top-10 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none"
          onPointerDown={stopPropagation}
        >
          <div className="p-1">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">Change Type</div>
            <button onClick={() => handleTypeChange(NodeType.TASK)} className="w-full text-left px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2">
              <Layout className="w-3 h-3" /> Task
            </button>
            <button onClick={() => handleTypeChange(NodeType.MILESTONE)} className="w-full text-left px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2">
              <Flag className="w-3 h-3" /> Milestone
            </button>
            <button onClick={() => handleTypeChange(NodeType.DECISION)} className="w-full text-left px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2">
              <Diamond className="w-3 h-3" /> Decision
            </button>
            <button onClick={() => handleTypeChange(NodeType.START_END)} className="w-full text-left px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center gap-2">
              <PlayCircle className="w-3 h-3" /> Start / End
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            <button onClick={() => onDelete(node.id)} className="w-full text-left px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-2">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* --- Resize Handle --- */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e, node.id);
        }}
      >
        <GripHorizontal className="w-4 h-4 rotate-45" />
      </div>

      {/* --- Connection Handles --- */}

      {/* Input Handle (Left) */}
      <div
        className="node-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-crosshair group/handle z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          onConnectStart(e, node.id, 'target');
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 group-hover/handle:bg-indigo-500 group-hover/handle:border-indigo-500 transition-colors shadow-sm" />
      </div>

      {/* Output Handle (Right) */}
      <div
        className="node-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-crosshair group/handle z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          onConnectStart(e, node.id, 'source');
        }}
      >
        <div className="w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 group-hover/handle:bg-indigo-500 group-hover/handle:border-indigo-500 transition-colors shadow-sm" />
      </div>

    </div>
  );
};