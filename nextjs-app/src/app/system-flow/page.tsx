"use client";

import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Layout, Server, UploadCloud, Activity, Settings, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const initialNodes: Node[] = [
  // User / Frontend Layer
  {
    id: 'frontend',
    type: 'default',
    position: { x: 250, y: 0 },
    data: { 
      label: (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <Layout className="w-8 h-8 text-blue-500 mb-2" />
          <strong className="text-lg">Wallxy Dashboard</strong>
          <span className="text-xs text-muted-foreground mt-1">Client (React)</span>
        </div>
      )
    },
    style: { width: 200, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--primary) / 0.5)', borderRadius: '1rem', boxShadow: '0 10px 25px -5px hsl(var(--primary) / 0.2)', transition: 'all 0.3s' }
  },
  
  // Actions Layer
  {
    id: 'action_create',
    position: { x: 50, y: 150 },
    data: { 
      label: (
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="w-4 h-4 text-green-500" /> Create Task
        </div>
      ) 
    },
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', transition: 'all 0.3s' }
  },
  {
    id: 'action_upload',
    position: { x: 250, y: 150 },
    data: { 
      label: (
        <div className="flex items-center gap-2 font-semibold">
          <UploadCloud className="w-4 h-4 text-purple-500" /> Upload Images
        </div>
      ) 
    },
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', transition: 'all 0.3s' }
  },
  {
    id: 'action_update',
    position: { x: 450, y: 150 },
    data: { 
      label: (
        <div className="flex items-center gap-2 font-semibold">
          <Settings className="w-4 h-4 text-orange-500" /> Update Status
        </div>
      ) 
    },
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', transition: 'all 0.3s' }
  },

  // Backend / API Layer
  {
    id: 'api_layer',
    position: { x: 250, y: 300 },
    data: { 
      label: (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <Server className="w-8 h-8 text-cyan-500 mb-2" />
          <strong className="text-lg">Next.js API Routes</strong>
          <span className="text-xs text-muted-foreground mt-1">Serverless Backend</span>
        </div>
      )
    },
    style: { width: 250, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--primary) / 0.3)', borderRadius: '1rem', transition: 'all 0.3s' }
  },

  // Database Layer
  {
    id: 'firestore',
    position: { x: 100, y: 500 },
    data: { 
      label: (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <Database className="w-8 h-8 text-amber-500 mb-2" />
          <strong className="text-lg">Firestore DB</strong>
          <span className="text-xs text-muted-foreground mt-1">Task Records</span>
        </div>
      )
    },
    style: { width: 180, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--border))', borderRadius: '1rem', transition: 'all 0.3s' }
  },
  {
    id: 'storage',
    position: { x: 400, y: 500 },
    data: { 
      label: (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <Database className="w-8 h-8 text-rose-500 mb-2" />
          <strong className="text-lg">Firebase Storage</strong>
          <span className="text-xs text-muted-foreground mt-1">Images / Proofs</span>
        </div>
      )
    },
    style: { width: 180, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--border))', borderRadius: '1rem', transition: 'all 0.3s' }
  },
];

const initialEdges: Edge[] = [
  // Frontend to Actions
  { id: 'e1', source: 'frontend', target: 'action_create', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'frontend', target: 'action_upload', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'frontend', target: 'action_update', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed } },
  
  // Actions to API
  { id: 'e4', source: 'action_create', target: 'api_layer', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'POST /api/wallxy/tasks' },
  { id: 'e5', source: 'action_update', target: 'api_layer', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'PATCH /api/wallxy/tasks/[id]' },
  
  // Direct Upload (Frontend -> Storage)
  { id: 'e6', source: 'action_upload', target: 'storage', animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Direct Upload (Client SDK)' },
  
  // API to Database
  { id: 'e7', source: 'api_layer', target: 'firestore', animated: true, style: { stroke: 'hsl(var(--primary))', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Read/Write JSON' },
  
  // Real-time listener (Database -> Frontend)
  { id: 'e8', source: 'firestore', target: 'frontend', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5', transition: 'all 0.3s' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Real-time Updates (useQuery)', labelBgPadding: [8, 4], labelBgBorderRadius: 4, labelBgStyle: { fill: 'hsl(var(--card))', color: '#10b981', fillOpacity: 0.8 } },
];

export default function SystemFlowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'api_call' | 'updating' | 'realtime_sync' | 'done'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const simulateUpload = (file: File) => {
    if (uploadStage !== 'idle' && uploadStage !== 'done') return;
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    setUploadStage('uploading');
    
    // Stage 1: Uploading to Storage (Browser -> Storage directly)
    setEdges(eds => eds.map(e => ({
      ...e,
      style: e.id === 'e6' || e.id === 'e2' 
        ? { stroke: '#a855f7', strokeWidth: 5, filter: 'drop-shadow(0 0 8px #a855f7)', transition: 'all 0.3s' } 
        : { ...e.style, opacity: 0.1, transition: 'all 0.3s' },
      animated: e.id === 'e6' || e.id === 'e2' ? true : false,
    })));
    setNodes(nds => nds.map(n => ({
      ...n,
      style: n.id === 'action_upload' || n.id === 'storage' || n.id === 'frontend' 
        ? { ...n.style, boxShadow: '0 0 25px #a855f7', borderColor: '#a855f7', opacity: 1 } 
        : { ...n.style, opacity: 0.4, boxShadow: 'none' }
    })));

    // Stage 2: Save Task to API -> Firestore
    setTimeout(() => {
      setUploadStage('api_call');
      setEdges(eds => eds.map(e => ({
        ...e,
        style: e.id === 'e4' || e.id === 'e7' || e.id === 'e1' 
          ? { stroke: '#0ea5e9', strokeWidth: 5, filter: 'drop-shadow(0 0 8px #0ea5e9)', transition: 'all 0.3s' } 
          : { ...e.style, opacity: 0.1, strokeWidth: 1, filter: 'none', transition: 'all 0.3s' },
        animated: e.id === 'e4' || e.id === 'e7' || e.id === 'e1' ? true : false,
      })));
      setNodes(nds => nds.map(n => ({
        ...n,
        style: n.id === 'action_create' || n.id === 'api_layer' || n.id === 'firestore' || n.id === 'frontend'
          ? { ...n.style, boxShadow: '0 0 25px #0ea5e9', borderColor: '#0ea5e9', opacity: 1 } 
          : { ...n.style, opacity: 0.4, boxShadow: 'none' }
      })));
    }, 2500);

    // Stage 3: Realtime Sync triggers Dashboard update
    setTimeout(() => {
      setUploadStage('realtime_sync');
      setEdges(eds => eds.map(e => ({
        ...e,
        style: e.id === 'e8' 
          ? { stroke: '#10b981', strokeWidth: 6, strokeDasharray: '5,5', filter: 'drop-shadow(0 0 12px #10b981)', transition: 'all 0.3s' } 
          : { ...e.style, opacity: 0.1, strokeWidth: 1, filter: 'none', transition: 'all 0.3s' },
        animated: e.id === 'e8' ? true : false,
      })));
      setNodes(nds => nds.map(n => ({
        ...n,
        style: n.id === 'firestore' || n.id === 'frontend' 
          ? { ...n.style, boxShadow: '0 0 30px #10b981', borderColor: '#10b981', opacity: 1, transform: n.id === 'frontend' ? 'scale(1.05)' : 'none' } 
          : { ...n.style, opacity: 0.4, boxShadow: 'none' }
      })));
    }, 4500);

    // Done -> Reset
    setTimeout(() => {
      setUploadStage('done');
      setEdges(initialEdges);
      setNodes(initialNodes);
      
      // Cleanup object URL after a while
      setTimeout(() => setPreviewUrl(null), 3000);
    }, 7000);
  };

  const simulateUpdate = () => {
    if (uploadStage !== 'idle' && uploadStage !== 'done') return;
    
    setUploadStage('updating');
    
    // Stage 1: API Call (Browser -> Update Status -> API -> Firestore)
    setEdges(eds => eds.map(e => ({
      ...e,
      style: e.id === 'e3' || e.id === 'e5' || e.id === 'e7'
        ? { stroke: '#f97316', strokeWidth: 5, filter: 'drop-shadow(0 0 8px #f97316)', transition: 'all 0.3s' } 
        : { ...e.style, opacity: 0.1, transition: 'all 0.3s' },
      animated: e.id === 'e3' || e.id === 'e5' || e.id === 'e7' ? true : false,
    })));
    setNodes(nds => nds.map(n => ({
      ...n,
      style: n.id === 'frontend' || n.id === 'action_update' || n.id === 'api_layer' || n.id === 'firestore'
        ? { ...n.style, boxShadow: '0 0 25px #f97316', borderColor: '#f97316', opacity: 1 } 
        : { ...n.style, opacity: 0.4, boxShadow: 'none' }
    })));

    // Stage 2: Realtime Sync triggers Dashboard update
    setTimeout(() => {
      setUploadStage('realtime_sync');
      setEdges(eds => eds.map(e => ({
        ...e,
        style: e.id === 'e8' 
          ? { stroke: '#10b981', strokeWidth: 6, strokeDasharray: '5,5', filter: 'drop-shadow(0 0 12px #10b981)', transition: 'all 0.3s' } 
          : { ...e.style, opacity: 0.1, strokeWidth: 1, filter: 'none', transition: 'all 0.3s' },
        animated: e.id === 'e8' ? true : false,
      })));
      setNodes(nds => nds.map(n => ({
        ...n,
        style: n.id === 'firestore' || n.id === 'frontend' 
          ? { ...n.style, boxShadow: '0 0 30px #10b981', borderColor: '#10b981', opacity: 1, transform: n.id === 'frontend' ? 'scale(1.05)' : 'none' } 
          : { ...n.style, opacity: 0.4, boxShadow: 'none' }
      })));
    }, 2500);

    // Done -> Reset
    setTimeout(() => {
      setUploadStage('done');
      setEdges(initialEdges);
      setNodes(initialNodes);
    }, 5000);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background relative overflow-hidden">
      {/* Cool background glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="absolute top-6 left-6 z-10 w-[350px] space-y-4">
        {/* Info Panel */}
        <div className="p-6 bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Data Flow</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            See exactly how images and data travel from your browser to the servers in real-time.
          </p>
          
          <div className="mt-6 p-4 border-2 border-dashed border-primary/30 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors relative group overflow-hidden cursor-pointer">
            <input 
              type="file" 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) simulateUpload(e.target.files[0]);
              }}
              disabled={uploadStage !== 'idle' && uploadStage !== 'done'}
            />
            
            {previewUrl ? (
              <div className="relative h-24 w-full rounded-lg overflow-hidden">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  {uploadStage === 'uploading' && <span className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud className="w-4 h-4 animate-bounce" /> Uploading to Storage...</span>}
                  {uploadStage === 'api_call' && <span className="text-white font-bold text-sm flex items-center gap-2"><Server className="w-4 h-4 animate-pulse" /> Saving Task to DB...</span>}
                  {uploadStage === 'updating' && <span className="text-orange-400 font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4 animate-spin" /> Updating Status in DB...</span>}
                  {uploadStage === 'realtime_sync' && <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 animate-pulse" /> Real-time Sync!</span>}
                  {uploadStage === 'done' && <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Done</span>}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-primary/70 group-hover:text-primary transition-colors py-2">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-sm font-bold tracking-wide">Drop an image here</span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">To test image flow</span>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500 transition-colors mt-3 rounded-xl h-12 font-bold"
            onClick={simulateUpdate}
            disabled={uploadStage !== 'idle' && uploadStage !== 'done'}
          >
            <Settings className="w-4 h-4 mr-2" /> Simulate Status Change
          </Button>
        </div>

        {/* Legend */}
        <div className="p-4 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" /> Browser Actions
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Direct File Uploads
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> API / JSON Traffic
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Real-time Listeners
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          className="dark:bg-slate-950"
          colorMode="system"
        >
          <Background color="hsl(var(--primary) / 0.15)" gap={20} size={1.5} />
          <Controls className="bg-card border-border shadow-lg !bottom-6 !left-auto !right-6" />
        </ReactFlow>
      </div>
    </div>
  );
}
