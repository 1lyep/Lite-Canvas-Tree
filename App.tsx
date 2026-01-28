import React, { useState, useRef, useEffect } from 'react';
import { Plus, Wand2, Moon, Sun, Loader2 } from 'lucide-react';
import { WorkflowNode, Connection, NodeStatus, NodeType } from './types';
import { NodeItem } from './components/NodeItem';
import { ConnectionLine, TempConnectionLine } from './components/ConnectionLine';
import { generateWorkflow } from './services/geminiService';

export default function App() {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Connection Draft State
  const [connectionDraft, setConnectionDraft] = useState<{
    startNodeId: string;
    startHandle: 'source' | 'target'; 
    startX: number;
    startY: number;
  } | null>(null);
  
  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resizing State
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const initialNodeSize = useRef({ width: 0, height: 0 });
  
  // AI State
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');

  // Mouse Tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // --- Handlers ---

  const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
    e.stopPropagation();
    
    // Canvas click
    if (!nodeId) {
      setSelectedNodeId(null);
      return;
    }
    
    // Node click
    e.currentTarget.setPointerCapture(e.pointerId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      dragOffset.current = {
        x: e.clientX - node.x,
        y: e.clientY - node.y
      };
    }
  };

  const handleResizeStart = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      e.currentTarget.setPointerCapture(e.pointerId); 
      setResizingNodeId(nodeId);
      resizeStartPos.current = { x: e.clientX, y: e.clientY };
      initialNodeSize.current = { width: node.width, height: node.height };
    }
  };

  const handleConnectStart = (e: React.PointerEvent, nodeId: string, handle: 'source' | 'target') => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Calculate dynamic handle positions
    // Source (Right): x + width, y + height/2
    // Target (Left): x, y + height/2
    const startX = handle === 'source' ? node.x + node.width : node.x;
    const startY = node.y + (node.height / 2);

    setConnectionDraft({
      startNodeId: nodeId,
      startHandle: handle,
      startX,
      startY
    });
  };

  const handleConnectEnd = (targetNodeId: string) => {
    if (!connectionDraft) return;

    if (connectionDraft.startNodeId === targetNodeId) {
      setConnectionDraft(null);
      return;
    }

    let from = connectionDraft.startNodeId;
    let to = targetNodeId;

    if (connectionDraft.startHandle === 'target') {
      from = targetNodeId;
      to = connectionDraft.startNodeId;
    } 
    
    const exists = connections.some(c => c.from === from && c.to === to);
    if (!exists) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from,
        to
      };
      setConnections(prev => [...prev, newConnection]);
    }

    setConnectionDraft(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    // Handle Resize
    if (resizingNodeId) {
       const dx = e.clientX - resizeStartPos.current.x;
       const dy = e.clientY - resizeStartPos.current.y;
       
       setNodes(prev => prev.map(n => {
         if (n.id === resizingNodeId) {
           return {
             ...n,
             width: Math.max(150, initialNodeSize.current.width + dx), // Min width 150
             height: Math.max(80, initialNodeSize.current.height + dy) // Min height 80
           };
         }
         return n;
       }));
       return;
    }

    // Handle Drag
    if (draggingNodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
          };
        }
        return n;
      }));
    }
  };

  const handlePointerUp = () => {
    setDraggingNodeId(null);
    setResizingNodeId(null);
    if (connectionDraft) {
      setConnectionDraft(null);
    }
  };

  const addNode = () => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      x: window.innerWidth / 2 - 128,
      y: window.innerHeight / 2 - 80,
      width: 256,
      height: 160,
      title: 'New Task',
      description: 'Click to edit details...',
      status: NodeStatus.TODO,
      type: NodeType.TASK
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const handleStatusChange = (nodeId: string, newStatus: NodeStatus) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: newStatus } : n));
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleConnectionDelete = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  const handleAIGenerate = async () => {
    if (!aiPromptText.trim()) return;
    
    setIsAIGenerating(true);
    try {
      const { nodes: newNodes, connections: newConnections } = await generateWorkflow(aiPromptText);
      setNodes(newNodes);
      setConnections(newConnections);
      setShowAIPrompt(false);
      setAiPromptText('');
    } catch (e) {
      alert("Failed to generate workflow. Please check your API key and try again.");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- Effects ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setConnectionDraft(null);
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
        
        if (!isInput && selectedNodeId) {
          handleNodeDelete(selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full h-full`}>
      <div 
        className="w-full h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative font-sans text-slate-900 dark:text-slate-100 dot-pattern transition-colors duration-300"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* --- Toolbar --- */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-200 dark:border-slate-800">
          <button 
            onClick={addNode}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors tooltip-trigger relative group"
            title="Add Node"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button 
            onClick={() => setShowAIPrompt(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
          >
            <Wand2 className="w-4 h-4" />
            <span>AI Gen</span>
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* --- Canvas Content --- */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {/* Existing Connections */}
          {connections.map(conn => {
            const start = nodes.find(n => n.id === conn.from);
            const end = nodes.find(n => n.id === conn.to);
            if (!start || !end) return null;
            return (
              <ConnectionLine 
                key={conn.id} 
                startNode={start} 
                endNode={end} 
                onDelete={() => handleConnectionDelete(conn.id)}
                isDarkMode={isDarkMode}
              />
            );
          })}

          {/* Temporary Connection Line (while dragging) */}
          {connectionDraft && (
            <TempConnectionLine 
              startX={connectionDraft.startX}
              startY={connectionDraft.startY}
              mouseX={mousePos.x} 
              mouseY={mousePos.y} 
            />
          )}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
          {nodes.map(node => (
            <NodeItem
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              isDragging={draggingNodeId === node.id}
              isResizing={resizingNodeId === node.id}
              onMouseDown={(e) => handlePointerDown(e, node.id)}
              onClick={(id) => setSelectedNodeId(id)}
              onStatusChange={handleStatusChange}
              onConnectStart={handleConnectStart}
              onConnectEnd={handleConnectEnd}
              onResizeStart={handleResizeStart}
              onUpdate={handleNodeUpdate}
              onDelete={handleNodeDelete}
            />
          ))}
        </div>

        {/* --- AI Prompt Modal --- */}
        {showAIPrompt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-fuchsia-600" />
                  Generate Workflow
                </h3>
                <p className="text-slate-500 text-sm mt-1">Describe your process, and AI will build the diagram.</p>
              </div>
              
              <div className="p-6">
                <textarea
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  placeholder="e.g., A software deployment pipeline with unit tests, integration tests, staging approval, and production deploy."
                  className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-slate-700 dark:text-slate-200 resize-none"
                />
              </div>

              <div className="p-6 pt-2 flex justify-end gap-3">
                <button 
                  onClick={() => setShowAIPrompt(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAIGenerate}
                  disabled={isAIGenerating || !aiPromptText.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isAIGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Instructions / Empty State --- */}
        {nodes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-40">
            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Plus className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-400 dark:text-slate-500 mb-2">Start your workflow</h2>
            <p className="text-slate-400 dark:text-slate-500">Add a node or use AI to generate a structure.</p>
          </div>
        )}
      </div>
    </div>
  );
}