import React, { useState, useRef, useEffect } from 'react';
import { Plus, Wand2, Moon, Sun, Loader2, Download, Upload, Monitor } from 'lucide-react';
import { WorkflowNode, Connection, NodeStatus, NodeType, CanvasMetadata, Canvas } from './types';
import { NodeItem } from './components/NodeItem';
import { ConnectionLine, TempConnectionLine } from './components/ConnectionLine';
import { generateWorkflow } from './services/geminiService';
import { storageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';

export default function App() {
  // --- State ---
  type ThemeMode = 'light' | 'dark' | 'system';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('flowstream_theme');
    return (saved as ThemeMode) || 'system';
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Canvas Management
  const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentCanvasName, setCurrentCanvasName] = useState('Untitled Canvas');
  const [canvases, setCanvases] = useState<CanvasMetadata[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Canvas Content
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // Selection
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);
  const selectionBaseline = useRef<string[]>([]);

  // Connection Draft State
  const [connectionDraft, setConnectionDraft] = useState<{
    startNodeId: string;
    startHandle: 'source' | 'target';
    startX: number;
    startY: number;
  } | null>(null);

  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartMousePos = useRef({ x: 0, y: 0 });
  const dragStartNodes = useRef<{ id: string, startX: number, startY: number }[]>([]);

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

  // --- Initialization ---

  // Load initial canvases list
  useEffect(() => {
    const list = storageService.getCanvases();
    setCanvases(list);

    // Auto-load most recent or create new
    if (list.length > 0) {
      loadCanvas(list[0].id);
    } else {
      createNewCanvas();
    }
  }, []);

  // Use refs to track if 'nodes' or 'connections' changes should trigger a save
  // We want to avoid saving when simply switching canvases
  const skipSave = useRef(false);

  // Auto-save effect
  useEffect(() => {
    if (!currentCanvasId || skipSave.current) {
      return;
    }

    const timer = setTimeout(() => {
      saveCurrentCanvas();
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [nodes, connections, currentCanvasName]); // Removed currentCanvasId from dep to avoid save-on-switch

  // --- Canvas Logic ---

  const loadCanvas = (id: string) => {
    const canvas = storageService.loadCanvas(id);
    if (canvas) {
      skipSave.current = true; // Prevent triggering save immediately after load
      setCurrentCanvasId(canvas.id);
      setCurrentCanvasName(canvas.name);
      setNodes(canvas.nodes);
      setConnections(canvas.connections);

      // Update sidebar highlight
      setCanvases(prev => {
        // Just ensures the list is fresh if needed, or we might need to re-fetch if we suspect desync
        // For now just relying on local state is fine, but lets refresh sorting if we modify date
        return storageService.getCanvases();
      });

      // Allow saving again after a short delay
      setTimeout(() => {
        skipSave.current = false;
      }, 100);

      // Clear selection
      setSelectedNodeIds([]);
      setSelectedConnectionId(null);
    }
  };

  const createNewCanvas = () => {
    const newCanvas = storageService.createCanvas(`New Canvas ${canvases.length + 1}`);
    // Save it immediately so it exists
    storageService.saveCanvas(newCanvas);

    // Update list
    setCanvases(storageService.getCanvases());

    // Load it
    loadCanvas(newCanvas.id);
    setIsSidebarOpen(false);
  };

  const saveCurrentCanvas = () => {
    if (!currentCanvasId) return;

    const canvas: Canvas = {
      id: currentCanvasId,
      name: currentCanvasName,
      nodes,
      connections,
      lastModified: Date.now()
    };

    storageService.saveCanvas(canvas);
    setCanvases(storageService.getCanvases()); // Update list to reflect new mod time
  };

  const deleteCanvas = (id: string) => {
    storageService.deleteCanvas(id);
    const updatedList = storageService.getCanvases();
    setCanvases(updatedList);

    // If we deleted the current one, switch to another
    if (id === currentCanvasId) {
      if (updatedList.length > 0) {
        loadCanvas(updatedList[0].id);
      } else {
        createNewCanvas();
      }
    }
  };

  // --- Handlers ---

  const handlePointerDown = (e: React.PointerEvent, nodeId?: string) => {
    e.stopPropagation();

    // Canvas click
    if (!nodeId) {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedNodeIds([]);
        selectionBaseline.current = [];
      } else {
        selectionBaseline.current = [...selectedNodeIds];
      }
      setSelectedConnectionId(null);
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Node click
    e.currentTarget.setPointerCapture(e.pointerId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      let newSelectedIds = [...selectedNodeIds];
      if (!newSelectedIds.includes(nodeId)) {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          newSelectedIds = [nodeId];
        } else {
          newSelectedIds.push(nodeId);
        }
        setSelectedNodeIds(newSelectedIds);
      } else if (e.shiftKey || e.ctrlKey || e.metaKey) {
        newSelectedIds = newSelectedIds.filter(id => id !== nodeId);
        setSelectedNodeIds(newSelectedIds);
        return;
      }

      setDraggingNodeId(nodeId);
      setSelectedConnectionId(null);

      const selectedNodesToDrag = nodes.filter(n => newSelectedIds.includes(n.id));
      dragStartNodes.current = selectedNodesToDrag.map(n => ({ id: n.id, startX: n.x, startY: n.y }));
      dragStartMousePos.current = { x: e.clientX, y: e.clientY };
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
      const dx = e.clientX - dragStartMousePos.current.x;
      const dy = e.clientY - dragStartMousePos.current.y;

      setNodes(prev => prev.map(n => {
        const startState = dragStartNodes.current.find(s => s.id === n.id);
        if (startState) {
          return {
            ...n,
            x: startState.startX + dx,
            y: startState.startY + dy
          };
        }
        return n;
      }));
      return;
    }

    // Handle Selection Box
    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);

      const minX = Math.min(selectionBox.startX, e.clientX);
      const maxX = Math.max(selectionBox.startX, e.clientX);
      const minY = Math.min(selectionBox.startY, e.clientY);
      const maxY = Math.max(selectionBox.startY, e.clientY);

      const intersectingIds = nodes.filter(n => {
        return n.x < maxX && (n.x + n.width) > minX &&
          n.y < maxY && (n.y + n.height) > minY;
      }).map(n => n.id);

      setSelectedNodeIds(Array.from(new Set([...selectionBaseline.current, ...intersectingIds])));
      return;
    }
  };

  const handlePointerUp = () => {
    setDraggingNodeId(null);
    setResizingNodeId(null);
    if (connectionDraft) {
      setConnectionDraft(null);
    }
    setSelectionBox(null);
  };

  const addNode = () => {
    // If no canvas open, create one first? (Should ideally be handled by init)

    // Position near center but randomized slightly to avoid stacking
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      x: window.innerWidth / 2 - 128 + (Math.random() * 40 - 20),
      y: window.innerHeight / 2 - 80 + (Math.random() * 40 - 20),
      width: 256,
      height: 160,
      title: 'New Task',
      description: 'Click to edit details...',
      status: NodeStatus.TODO,
      type: NodeType.TASK
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeIds([newNode.id]);
    setSelectedConnectionId(null);
  };

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const handleStatusChange = (nodeId: string, newStatus: NodeStatus) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: newStatus } : n));
  };

  const handleNodesDelete = (nodeIds: string[]) => {
    setNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
    setConnections(prev => prev.filter(c => !nodeIds.includes(c.from) && !nodeIds.includes(c.to)));
    setSelectedNodeIds(prev => prev.filter(id => !nodeIds.includes(id)));
  };

  const handleNodeDelete = (nodeId: string) => {
    handleNodesDelete([nodeId]);
  };

  const handleConnectionDelete = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
    if (selectedConnectionId === connId) setSelectedConnectionId(null);
  };

  const handleAIGenerate = async () => {
    if (!aiPromptText.trim()) return;

    setIsAIGenerating(true);
    try {
      const { nodes: newNodes, connections: newConnections } = await generateWorkflow(aiPromptText);
      setNodes(newNodes);
      setConnections(newConnections);

      // Auto-rename canvas if it's the default name
      if (currentCanvasName.startsWith('New Canvas') || currentCanvasName === 'Untitled Canvas') {
        const suggestedName = aiPromptText.split(' ').slice(0, 4).join(' ') + '...';
        setCurrentCanvasName(suggestedName);
      }

      setShowAIPrompt(false);
      setAiPromptText('');
    } catch (e) {
      alert("Failed to generate workflow. Please check your API key and try again.");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleExportCanvas = () => {
    if (!currentCanvasId) return;
    const canvas: Canvas = {
      id: currentCanvasId,
      name: currentCanvasName,
      nodes,
      connections,
      lastModified: Date.now()
    };
    const dataStr = JSON.stringify(canvas, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCanvasName.replace(/\\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCanvas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as Partial<Canvas>;

        if (!parsed.nodes || !parsed.connections) {
          alert('Invalid canvas file format.');
          return;
        }

        const newCanvasId = crypto.randomUUID();
        const importedCanvas: Canvas = {
          id: newCanvasId,
          name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Canvas',
          nodes: parsed.nodes,
          connections: parsed.connections,
          lastModified: Date.now()
        };

        storageService.saveCanvas(importedCanvas);
        setCanvases(storageService.getCanvases());
        loadCanvas(newCanvasId);
      } catch (err) {
        alert('Failed to parse the file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleThemeMode = () => {
    setThemeMode(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('flowstream_theme', themeMode);

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setIsDarkMode(themeMode === 'dark');
    }
  }, [themeMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        setSelectedConnectionId(null);
        setConnectionDraft(null);
        setSelectionBox(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = document.activeElement;
        const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';

        if (!isInput) {
          if (selectedNodeIds.length > 0) {
            handleNodesDelete(selectedNodeIds);
          }
          if (selectedConnectionId) {
            handleConnectionDelete(selectedConnectionId);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedConnectionId, selectionBox]);

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full h-full`}>
      <div
        className="w-full h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative font-sans text-slate-900 dark:text-slate-100 dot-pattern transition-colors duration-300"
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >

        {/* --- Sidebar & Toggle --- */}
        {/* --- Sidebar & Toggle --- */}
        <Sidebar
          canvases={canvases}
          currentCanvasId={currentCanvasId}
          onSelect={loadCanvas}
          onCreate={createNewCanvas}
          onDelete={deleteCanvas}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* --- Toolbar --- */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-slate-900 shadow-lg dark:shadow-slate-900/50 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-200 dark:border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'ml-32' : 'ml-7'}`}>

          {/* Canvas Name Editor */}
          <input
            type="text"
            value={currentCanvasName}
            onChange={(e) => setCurrentCanvasName(e.target.value)}
            className="bg-transparent border-none focus:outline-none font-semibold text-sm w-32 text-center text-slate-700 dark:text-slate-200"
            placeholder="Canvas Name"
          />

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button
            onClick={addNode}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors tooltip-trigger relative group"
            title="Add Node"
          >
            <Plus className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors tooltip-trigger relative group"
            title="Import Canvas"
          >
            <Upload className="w-5 h-5" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCanvas}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={handleExportCanvas}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors tooltip-trigger relative group"
            title="Export Canvas"
          >
            <Download className="w-5 h-5" />
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
            onClick={toggleThemeMode}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors tooltip-trigger relative group"
            title={`Toggle Theme: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}`}
          >
            {themeMode === 'system' ? <Monitor className="w-5 h-5" /> : themeMode === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        {/* --- Canvas Content --- */}
        <div className={`w-full h-full transition-all duration-300 ${isSidebarOpen ? 'ml-64 w-[calc(100%-16rem)]' : 'ml-14 w-[calc(100%-3.5rem)]'}`}>
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
                  isSelected={selectedConnectionId === conn.id}
                  onSelect={() => {
                    setSelectedConnectionId(conn.id);
                    setSelectedNodeIds([]);
                  }}
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

            {/* Selection Box */}
            {selectionBox && (
              <rect
                x={Math.min(selectionBox.startX, selectionBox.endX)}
                y={Math.min(selectionBox.startY, selectionBox.endY)}
                width={Math.abs(selectionBox.endX - selectionBox.startX)}
                height={Math.abs(selectionBox.endY - selectionBox.startY)}
                fill="none"
                className="stroke-indigo-500 fill-indigo-500/10 stroke-[2px]"
                strokeDasharray="4,4"
              />
            )}
          </svg>

          {/* Nodes Layer */}
          <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
            {nodes.map(node => (
              <NodeItem
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                isDragging={selectedNodeIds.includes(node.id) && draggingNodeId !== null}
                isResizing={resizingNodeId === node.id}
                onMouseDown={(e) => handlePointerDown(e, node.id)}
                onClick={(id) => { }}
                onStatusChange={handleStatusChange}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onResizeStart={handleResizeStart}
                onUpdate={handleNodeUpdate}
                onDelete={handleNodeDelete}
              />
            ))}
          </div>
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
          <div className={`absolute top-1/2 left-1/2 -translate-y-1/2 text-center pointer-events-none opacity-40 transition-all duration-300 ${isSidebarOpen ? 'ml-32 -translate-x-1/2' : 'ml-7 -translate-x-1/2'}`}>
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