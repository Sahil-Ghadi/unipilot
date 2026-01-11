"use client";

import dynamic from 'next/dynamic';
import { useCallback, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

// Dynamically import specific ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div style={{ color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading 3D Engine...</div>
});

const KnowledgeGraph3D = ({ data, onNodeClick }) => {
    const fgRef = useRef();
    const theme = useTheme();

    // Enhanced Color Scheme
    const getNodeColor = (node) => {
        switch (node.group) {
            case 'user': return '#6366f1'; // Indigo-500 (Primary)
            case 'course': return '#ec4899'; // Pink-500 (Secondary)
            case 'task':
                if (node.status === 'completed') return '#10b981'; // Emerald-500
                if (node.status === 'in-progress') return '#f59e0b'; // Amber-500
                // High priority tasks get a "hot" red
                if (node.priority >= 80) return '#ef4444'; // Red-500
                return '#3b82f6'; // Blue-500 (Default)
            default: return '#94a3b8'; // Slate-400
        }
    };

    // More dramatic node sizing
    const getNodeVal = (node) => {
        if (node.group === 'user') return 60; // Sun-like
        if (node.group === 'course') return 25; // Planets
        if (node.val) return node.val; // Custom size from backend
        return 8; // Default task asteroid
    };

    const handleClick = useCallback(node => {
        // Aim at node from outside it
        const distance = 150;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        if (fgRef.current) {
            fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
            );
        }

        if (onNodeClick) onNodeClick(node);
    }, [fgRef, onNodeClick]);

    return (
        <ForceGraph3D
            ref={fgRef}
            graphData={data}
            nodeLabel="name"
            nodeColor={getNodeColor}
            nodeVal={getNodeVal}
            onNodeClick={handleClick}

            // Visual Polish
            backgroundColor="#00000000" // Transparent
            linkOpacity={0.15}
            linkWidth={0.5}
            nodeResolution={24}
            nodeOpacity={0.9}

            // Enhanced Particles
            linkDirectionalParticles={4}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={d => 0.005} // Consistent flow speed

            // Interaction
            enableNodeDrag={false}
            autoRotate={true}
            autoRotateSpeed={0.3} // Slower, majestic rotation
        />
    );
};

export default KnowledgeGraph3D;
