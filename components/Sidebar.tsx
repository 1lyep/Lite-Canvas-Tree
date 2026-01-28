import React from 'react';
import { CanvasMetadata } from '../types';
import { Plus, Trash2, Layout, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarProps {
    canvases: CanvasMetadata[];
    currentCanvasId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    canvases,
    currentCanvasId,
    onSelect,
    onCreate,
    onDelete,
    isOpen,
    onToggle
}) => {
    return (
        <div
            className={`fixed left-0 top-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-300 ease-in-out z-40 flex flex-col shadow-xl overflow-hidden ${isOpen ? 'w-64' : 'w-14'
                }`}
        >
            <div
                className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group relative`}
                onClick={onToggle}
                title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                <div className={`absolute left-0 w-full flex items-center px-4 transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    <PanelLeftClose className="w-6 h-6 text-indigo-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 ml-2 whitespace-nowrap">
                        Workflows
                    </span>
                </div>

                <div className={`absolute left-0 w-full flex justify-center items-center transition-all duration-300 ${isOpen ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <PanelLeftOpen className="w-6 h-6 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full p-2 space-y-1 scrollbar-hide">
                {canvases.map(canvas => (
                    <div
                        key={canvas.id}
                        onClick={() => onSelect(canvas.id)}
                        className={`
              group/item flex items-center rounded-lg cursor-pointer transition-all duration-300 relative overflow-hidden
              ${isOpen ? 'px-3 py-2 justify-between' : 'justify-center p-2.5 h-10'}
              ${canvas.id === currentCanvasId
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
            `}
                        title={!isOpen ? canvas.name : undefined}
                    >
                        <div className={`flex items-center gap-3 transition-all duration-300 ${isOpen ? 'w-full' : 'w-auto justify-center'}`}>
                            <FileText className={`w-4 h-4 shrink-0 transition-opacity ${canvas.id === currentCanvasId ? 'opacity-100' : 'opacity-70'}`} />

                            <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isOpen ? 'opacity-100 w-full max-w-[120px]' : 'opacity-0 w-0 max-w-0'}`}>
                                <span className="text-sm font-medium block truncate">
                                    {canvas.name}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this canvas?')) {
                                    onDelete(canvas.id);
                                }
                            }}
                            className={`absolute right-1 opacity-0 hover:text-red-500 transition-all duration-200 ${isOpen ? 'group-hover/item:opacity-100' : 'hidden'}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-2 border-t border-slate-200 dark:border-slate-800 w-full shrink-0">
                <button
                    onClick={onCreate}
                    className={`group flex items-center bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isOpen ? 'w-full justify-center gap-2 py-2 px-4' : 'w-10 h-10 justify-center p-0 mx-auto'}`}
                    title="New Canvas"
                >
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${isOpen ? '' : 'group-hover:rotate-90'}`} />
                    <span className={`transition-all duration-300 ease-in-out ${isOpen ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0 ml-0'}`}>New Canvas</span>
                </button>
            </div>
        </div>
    );
};
