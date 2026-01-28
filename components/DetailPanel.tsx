import React, { useEffect, useState } from 'react';
import { WorkflowNode, NodeStatus, NodeType } from '../types';
import { X, Trash2, Save, Layout, Flag, Diamond, Circle } from 'lucide-react';

interface DetailPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdate: (updatedNode: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ node, onClose, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    setFormData(node);
  }, [node]);

  if (!node || !formData) return null;

  const handleChange = (field: keyof WorkflowNode, value: string) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleSave = () => {
    if (formData) {
      onUpdate(formData);
    }
  };

  const typeOptions = [
    { value: NodeType.TASK, label: 'Task', icon: Layout },
    { value: NodeType.MILESTONE, label: 'Milestone', icon: Flag },
    { value: NodeType.DECISION, label: 'Decision', icon: Diamond },
    { value: NodeType.START_END, label: 'Start/End', icon: Circle },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-20 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
        <div>
           <h2 className="font-bold text-slate-800 dark:text-slate-100">Details</h2>
           <span className="text-xs text-slate-400 font-mono">{node.id}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Node Type</label>
          <div className="grid grid-cols-2 gap-2">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChange('type', opt.value)}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg border text-sm transition-all
                    ${formData.type === opt.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {[NodeStatus.TODO, NodeStatus.IN_PROGRESS, NodeStatus.DONE].map((s) => (
              <button
                key={s}
                onClick={() => handleChange('status', s)}
                className={`
                  text-xs font-medium py-2 px-1 rounded-md border transition-all
                  ${formData.status === s 
                    ? s === NodeStatus.DONE 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' 
                      : s === NodeStatus.IN_PROGRESS 
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300' 
                        : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }
                `}
              >
                {s === NodeStatus.TODO ? 'To Do' : s === NodeStatus.IN_PROGRESS ? 'Doing' : 'Done'}
              </button>
            ))}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium"
          />
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 dark:text-slate-300 resize-none text-sm"
          />
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-3">
        <button 
          onClick={() => onDelete(node.id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        <button 
          onClick={handleSave}
          className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
};