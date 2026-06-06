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
import { Database, Layout, Server, UploadCloud, Activity, Users, Settings } from 'lucide-react';
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
    style: { width: 200, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--primary) / 0.5)', borderRadius: '1rem', boxShadow: '0 10px 25px -5px hsl(var(--primary) / 0.2)' }
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
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }
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
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }
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
    style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' }
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
    style: { width: 250, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--primary) / 0.3)', borderRadius: '1rem' }
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
    style: { width: 180, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--border))', borderRadius: '1rem' }
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
    style: { width: 180, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '2px solid hsl(var(--border))', borderRadius: '1rem' }
  },
];

const initialEdges: Edge[] = [
  // Frontend to Actions
  { id: 'e1', source: 'frontend', target: 'action_create', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'frontend', target: 'action_upload', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'frontend', target: 'action_update', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed } },
  
  // Actions to API
  { id: 'e4', source: 'action_create', target: 'api_layer', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'POST /api/wallxy/tasks' },
  { id: 'e5', source: 'action_update', target: 'api_layer', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'PATCH /api/wallxy/tasks/[id]' },
  
  // Direct Upload (Frontend -> Storage)
  { id: 'e6', source: 'action_upload', target: 'storage', animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Direct Upload (Client SDK)' },
  
  // API to Database
  { id: 'e7', source: 'api_layer', target: 'firestore', animated: true, style: { stroke: 'hsl(var(--primary))' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Read/Write JSON' },
  
  // Real-time listener (Database -> Frontend)
  { id: 'e8', source: 'firestore', target: 'frontend', type: 'smoothstep', animated: true, style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Real-time Updates (useQuery)', labelBgPadding: [8, 4], labelBgBorderRadius: 4, labelBgStyle: { fill: 'hsl(var(--card))', color: '#10b981', fillOpacity: 0.8 } },
];

export default function SystemFlowPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="flex flex-col h-screen w-full bg-background relative overflow-hidden">
      {/* Cool background glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="absolute top-6 left-6 z-10 p-6 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Wallxy Data Flow</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This diagram illustrates the lifecycle of a task in the Wallxy system. It shows how data moves from the React frontend, through the Next.js API layer, and into Firebase.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" /> User Actions
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /> Real-time Sync
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
          fitViewOptions={{ padding: 0.2 }}
          className="dark:bg-slate-950"
          colorMode="system"
        >
          <Background color="hsl(var(--primary) / 0.2)" gap={16} />
          <Controls className="bg-card border-border shadow-lg" />
          <MiniMap 
            className="bg-card border-border shadow-xl rounded-xl overflow-hidden" 
            maskColor="hsl(var(--background) / 0.6)"
            nodeColor="hsl(var(--primary))"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
