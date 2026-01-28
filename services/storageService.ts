import { Canvas, CanvasMetadata, WorkflowNode, Connection } from '../types';

const STORAGE_PREFIX = 'flowstream_';
const INDEX_KEY = `${STORAGE_PREFIX}index`;

export const storageService = {
    // Get list of all canvases (metadata only)
    getCanvases: (): CanvasMetadata[] => {
        try {
            const indexJson = localStorage.getItem(INDEX_KEY);
            if (!indexJson) return [];
            return JSON.parse(indexJson);
        } catch (e) {
            console.error('Failed to load canvas index', e);
            return [];
        }
    },

    // Load a full canvas by ID
    loadCanvas: (id: string): Canvas | null => {
        try {
            const dataJson = localStorage.getItem(`${STORAGE_PREFIX}canvas_${id}`);
            if (!dataJson) return null;
            return JSON.parse(dataJson);
        } catch (e) {
            console.error(`Failed to load canvas ${id}`, e);
            return null;
        }
    },

    // Save a canvas (and update index if needed)
    saveCanvas: (canvas: Canvas): void => {
        try {
            // 1. Save the canvas data
            localStorage.setItem(`${STORAGE_PREFIX}canvas_${canvas.id}`, JSON.stringify(canvas));

            // 2. Update the index
            const canvases = storageService.getCanvases();
            const existingIndex = canvases.findIndex(c => c.id === canvas.id);

            const metadata: CanvasMetadata = {
                id: canvas.id,
                name: canvas.name,
                lastModified: Date.now()
            };

            let newCanvases = [...canvases];
            if (existingIndex >= 0) {
                newCanvases[existingIndex] = metadata;
            } else {
                newCanvases.push(metadata);
            }

            // Sort by last modified desc
            newCanvases.sort((a, b) => b.lastModified - a.lastModified);

            localStorage.setItem(INDEX_KEY, JSON.stringify(newCanvases));
        } catch (e) {
            console.error('Failed to save canvas', e);
        }
    },

    // Delete a canvas
    deleteCanvas: (id: string): void => {
        try {
            // 1. Remove data
            localStorage.removeItem(`${STORAGE_PREFIX}canvas_${id}`);

            // 2. Update index
            const canvases = storageService.getCanvases();
            const newCanvases = canvases.filter(c => c.id !== id);
            localStorage.setItem(INDEX_KEY, JSON.stringify(newCanvases));
        } catch (e) {
            console.error(`Failed to delete canvas ${id}`, e);
        }
    },

    // Create a new canvas object
    createCanvas: (name: string = 'Untitled Canvas'): Canvas => {
        return {
            id: crypto.randomUUID(),
            name,
            nodes: [],
            connections: [],
            lastModified: Date.now()
        };
    }
};
