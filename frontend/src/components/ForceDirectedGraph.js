import React, { useEffect, useRef } from 'react';

const ForceDirectedGraph = ({ characters }) => {
    // Existing refs
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const transformRef = useRef({ x: 0, y: 0, scale: 1 });
    const dragRef = useRef({ isDragging: false, start: { x: 0, y: 0 } });
    const selectedNodeRef = useRef(null);
    const lastMouseEventRef = useRef(null);
    const draggedNodeRef = useRef(null);

    // Fixed width for info box
    const INFO_BOX_WIDTH = 300;

    // Helper function to reset view
    const resetView = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        // Reset transform
        transformRef.current = {
            x: canvas.width / 4,
            y: canvas.height / 4,
            scale: 1
        };
    };
    // Enhanced physics parameters
    const physics = {
        nodeRepulsion: 200,
        edgeDistance: 150,
        damping: 0.8,         // Increased damping to reduce movement
        timeStep: 0.3,        // Reduced timestep for more stability
        edgeSpringConstant: 0.08,
        centerGravity: 0.4,   // Increased center gravity
        centerStrength: 0.05, // New parameter for center anchoring
        maxVelocity: 20      // Reduced max velocity
    };

    // Helper function for text wrapping
    // Update the wrapText function to return the actual height used
    // First, update the wrapText function to be more precise
    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        let lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Draw the text and return total height
        lines.forEach((line, i) => {
            ctx.fillText(line.trim(), x, y + (i * lineHeight));
        });

        return lines.length * lineHeight;
    };

    // Update the info box rendering section in your render function
    // Move these updates into your render function, replacing the existing info box rendering code

    // In the render function, where the info box is drawn:
    // In the render function, update the info box calculation section:

    if (selectedNodeRef.current) {
        const node = selectedNodeRef.current;
        const char = node.character;

        ctx.restore();

        const padding = 20;
        const lineHeight = 18;
        const boxX = node.x * transform.scale + transform.x + (node.radius + 10);

        // Start with base height
        let totalHeight = padding;

        // Add height for name
        totalHeight += 25;

        // Add height for bio
        if (node.title) {
            const bioLines = Math.ceil(ctx.measureText(node.title).width / (INFO_BOX_WIDTH - padding * 2));
            totalHeight += bioLines * lineHeight + 10;
        }

        // Add height for relationships
        if (char.relationships && char.relationships.length > 0) {
            totalHeight += 30; // "Relationships:" header
            char.relationships.forEach(() => {
                totalHeight += lineHeight + 5;
            });
        }

        totalHeight += padding;

        // Double the calculated height
        totalHeight *= 2;

        // Draw the box
        const boxY = node.y * transform.scale + transform.y - totalHeight / 2;

        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeStyle = '#f79321';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, INFO_BOX_WIDTH, totalHeight, 10);
        ctx.fill();
        ctx.stroke();

        // Draw content with more spacing
        let yOffset = boxY + padding * 1.5;

        // Draw name
        ctx.fillStyle = '#f79321';
        ctx.font = 'bold 18px "Courier New", Courier, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(node.id, boxX + padding, yOffset);
        yOffset += 35;  // Increased spacing

        // Draw bio
        if (node.title) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px "Courier New", Courier, monospace';
            yOffset += wrapText(ctx, node.title, boxX + padding, yOffset, INFO_BOX_WIDTH - padding * 2, lineHeight * 1.5);
            yOffset += 20;  // Increased spacing
        }

        // Draw relationships
        if (char.relationships && char.relationships.length > 0) {
            ctx.fillStyle = '#f79321';
            ctx.font = 'bold 14px "Courier New", Courier, monospace';
            ctx.fillText('Relationships:', boxX + padding, yOffset);
            yOffset += 30;  // Increased spacing

            ctx.fillStyle = '#ffffff';
            ctx.font = '14px "Courier New", Courier, monospace';
            char.relationships.forEach(rel => {
                const relText = `${rel.name}: ${rel.relationship}`;
                yOffset += wrapText(
                    ctx,
                    relText,
                    boxX + padding,
                    yOffset,
                    INFO_BOX_WIDTH - padding * 2,
                    lineHeight * 1.5
                ) + 10;  // Increased spacing
            });
        }

        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
    }

    const getCharacterTitle = (char) => {
        const title = char.bio
            .find(line =>
                line.toLowerCase().includes('role') ||
                line.toLowerCase().includes('profession') ||
                line.toLowerCase().includes('occupation')
            )
            ?.split('.')[0] || char.bio[0]?.split('.')[0] || '';

        const keyInfo = char.knowledge
            .find(k =>
                k.toLowerCase().includes('created') ||
                k.toLowerCase().includes('founded') ||
                k.toLowerCase().includes('pioneered')
            )
            ?.split('.')[0] || '';

        return [title, keyInfo]
            .filter(Boolean)
            .map(text => text.trim())
            .join('\n');
    };

    const getKeyTraits = (char) => {
        return char.knowledge
            .filter(k =>
                k.toLowerCase().includes('specializes') ||
                k.toLowerCase().includes('known for') ||
                k.toLowerCase().includes('expert in')
            )
            .slice(0, 2)
            .map(t => t.trim())
            .join('\n');
    };

    useEffect(() => {
        if (!canvasRef.current || !characters.length) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let nodes, edges;

        // Set canvas size with higher resolution
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // Set canvas size accounting for device pixel ratio
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            // Scale all drawing operations
            ctx.scale(dpr, dpr);

            // Set display size
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            // Enable font smoothing
            ctx.textRendering = 'optimizeLegibility';
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        };

        // Initialize nodes and edges
        const initGraph = () => {
            nodes = characters.map((char) => ({
                id: char.name,
                x: (Math.random() - 0.5) * 400 + canvas.width / 2,
                y: (Math.random() - 0.5) * 400 + canvas.height / 2,
                vx: 0,
                vy: 0,
                radius: 40,
                title: getCharacterTitle(char),
                traits: getKeyTraits(char),
                character: char,
                isDragged: false
            }));

            edges = characters.flatMap(char =>
                (char.relationships || []).map(rel => ({
                    source: nodes.find(n => n.id === char.name),
                    target: nodes.find(n => n.id === rel.name),
                    relationship: rel.relationship,
                    details: rel.details
                })).filter(edge => edge.source && edge.target)
            );
        };
        initGraph();

        // Mouse interaction handlers
        const getMousePos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const transform = transformRef.current;
            return {
                x: (e.clientX - rect.left - transform.x) / transform.scale,
                y: (e.clientY - rect.top - transform.y) / transform.scale
            };
        };

        const handleMouseMove = (e) => {
            lastMouseEventRef.current = e;
            const pos = getMousePos(e);

            if (draggedNodeRef.current) {
                draggedNodeRef.current.x = pos.x;
                draggedNodeRef.current.y = pos.y;
                draggedNodeRef.current.vx = 0;
                draggedNodeRef.current.vy = 0;
                canvas.style.cursor = 'grabbing';
            } else {
                // Check for node hover
                const hoveredNode = nodes.find(node => {
                    const dx = node.x - pos.x;
                    const dy = node.y - pos.y;
                    return Math.sqrt(dx * dx + dy * dy) < node.radius / transformRef.current.scale;
                });

                if (hoveredNode) {
                    canvas.style.cursor = 'pointer';
                    selectedNodeRef.current = hoveredNode;
                } else {
                    canvas.style.cursor = dragRef.current.isDragging ? 'grabbing' : 'grab';
                    selectedNodeRef.current = null;
                }

                if (dragRef.current.isDragging) {
                    transformRef.current.x = e.clientX - dragRef.current.start.x;
                    transformRef.current.y = e.clientY - dragRef.current.start.y;
                }
            }
        };

        const handleMouseDown = (e) => {
            const pos = getMousePos(e);
            const clickedNode = nodes.find(node => {
                const dx = node.x - pos.x;
                const dy = node.y - pos.y;
                return Math.sqrt(dx * dx + dy * dy) < node.radius / transformRef.current.scale;
            });

            if (clickedNode) {
                draggedNodeRef.current = clickedNode;
                clickedNode.isDragged = true;
                canvas.style.cursor = 'grabbing';
            } else {
                dragRef.current.isDragging = true;
                dragRef.current.start = {
                    x: e.clientX - transformRef.current.x,
                    y: e.clientY - transformRef.current.y
                };
                canvas.style.cursor = 'grabbing';
            }
        };

        const handleMouseUp = () => {
            if (draggedNodeRef.current) {
                draggedNodeRef.current.isDragged = false;
                draggedNodeRef.current = null;
            }
            dragRef.current.isDragging = false;
            canvas.style.cursor = 'grab';
        };

        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const pos = getMousePos(e);
            const transform = transformRef.current;

            // Limit scale between 0.1 and 5 while maintaining proper scaling behavior
            const newScale = Math.min(Math.max(transform.scale * delta, 0.1), 5);
            const scaleFactor = newScale / transform.scale;

            // Update transform while maintaining mouse position
            transform.x = pos.x * (1 - scaleFactor) + transform.x * scaleFactor;
            transform.y = pos.y * (1 - scaleFactor) + transform.y * scaleFactor;
            transform.scale = newScale;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        window.addEventListener('resize', resize);

        // Physics simulation
        const simulate = () => {
            const canvasCenter = {
                x: canvas.width / (2 * transformRef.current.scale),
                y: canvas.height / (2 * transformRef.current.scale)
            };

            nodes.forEach(node => {
                if (node.isDragged) return;

                // Strong center anchoring force
                const dx = canvasCenter.x - node.x;
                const dy = canvasCenter.y - node.y;
                const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

                // Apply stronger force when nodes are far from center
                const centralForce = Math.max(1, distanceToCenter / 200);
                node.vx += dx * physics.centerStrength * centralForce;
                node.vy += dy * physics.centerStrength * centralForce;

                // Node repulsion (reduced strength)
                nodes.forEach(other => {
                    if (node === other) return;

                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = physics.nodeRepulsion / (distance * distance);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    node.vx -= fx * 0.5; // Reduced repulsion force
                    node.vy -= fy * 0.5;
                });
            });

            // Edge forces remain similar but with adjusted spring constant
            edges.forEach(edge => {
                if (edge.source.isDragged && edge.target.isDragged) return;

                const dx = edge.target.x - edge.source.x;
                const dy = edge.target.y - edge.source.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const displacement = distance - physics.edgeDistance;
                const force = displacement * physics.edgeSpringConstant;

                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                if (!edge.source.isDragged) {
                    edge.source.vx += fx * physics.timeStep;
                    edge.source.vy += fy * physics.timeStep;
                }
                if (!edge.target.isDragged) {
                    edge.target.vx -= fx * physics.timeStep;
                    edge.target.vy -= fy * physics.timeStep;
                }
            });

            // Update positions with stronger damping and velocity limits
            nodes.forEach(node => {
                if (node.isDragged) return;

                // Apply additional centering force
                const dx = canvasCenter.x - node.x;
                const dy = canvasCenter.y - node.y;
                const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

                // Additional damping based on distance from center
                const distanceDamping = Math.min(1, distanceToCenter / 500);

                // Limit velocity
                const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (speed > physics.maxVelocity) {
                    node.vx = (node.vx / speed) * physics.maxVelocity;
                    node.vy = (node.vy / speed) * physics.maxVelocity;
                }

                // Update position with damping
                node.x += node.vx * physics.timeStep * distanceDamping;
                node.y += node.vy * physics.timeStep * distanceDamping;
                node.vx *= physics.damping;
                node.vy *= physics.damping;

                // Enforce maximum distance from center
                const maxDistance = 300;
                const currentDistance = Math.sqrt(
                    Math.pow(node.x - canvasCenter.x, 2) +
                    Math.pow(node.y - canvasCenter.y, 2)
                );

                if (currentDistance > maxDistance) {
                    const scale = maxDistance / currentDistance;
                    node.x = canvasCenter.x + (node.x - canvasCenter.x) * scale;
                    node.y = canvasCenter.y + (node.y - canvasCenter.y) * scale;
                    node.vx *= 0.5;
                    node.vy *= 0.5;
                }
            });

            nodes.forEach(node => {
                if (node.isDragged) return;

                // Apply center gravity
                const dx = canvasCenter.x - node.x;
                const dy = canvasCenter.y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                node.vx += (dx / distance) * physics.centerGravity;
                node.vy += (dy / distance) * physics.centerGravity;

                nodes.forEach(other => {
                    if (node === other) return;

                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = physics.nodeRepulsion / (distance * distance);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    node.vx -= fx;
                    node.vy -= fy;
                });
            });

            edges.forEach(edge => {
                if (edge.source.isDragged && edge.target.isDragged) return;

                const dx = edge.target.x - edge.source.x;
                const dy = edge.target.y - edge.source.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const displacement = distance - physics.edgeDistance;
                const force = displacement * physics.edgeSpringConstant;

                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                if (!edge.source.isDragged) {
                    edge.source.vx += fx * physics.timeStep;
                    edge.source.vy += fy * physics.timeStep;
                }
                if (!edge.target.isDragged) {
                    edge.target.vx -= fx * physics.timeStep;
                    edge.target.vy -= fy * physics.timeStep;
                }
            });

            // Update positions and apply damping
            nodes.forEach(node => {
                if (node.isDragged) return;

                // Limit velocity
                const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (speed > physics.maxVelocity) {
                    node.vx = (node.vx / speed) * physics.maxVelocity;
                    node.vy = (node.vy / speed) * physics.maxVelocity;
                }

                node.x += node.vx * physics.timeStep;
                node.y += node.vy * physics.timeStep;
                node.vx *= physics.damping;
                node.vy *= physics.damping;
            });
        };

        // Render function

        const render = () => {
            const transform = transformRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            // Clear with black background
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(transform.x, transform.y);
            ctx.scale(transform.scale, transform.scale);

            // Draw edges
            edges.forEach(edge => {
                ctx.beginPath();
                ctx.moveTo(edge.source.x, edge.source.y);
                ctx.lineTo(edge.target.x, edge.target.y);
                ctx.strokeStyle = '#f79321';
                ctx.lineWidth = 2 / transform.scale;
                ctx.stroke();

                // Draw relationship label
                const midX = (edge.source.x + edge.target.x) / 2;
                const midY = (edge.source.y + edge.target.y) / 2;

                ctx.fillStyle = '#f79321';
                ctx.font = `${12 / transform.scale}px "Courier New", Courier, monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(edge.relationship, midX, midY);
            });

            // Draw nodes
            nodes.forEach(node => {
                const isHovered = node === selectedNodeRef.current;

                // Calculate text size for proper node sizing
                ctx.font = `${14 / transform.scale}px "Courier New", Courier, monospace`;
                const nameMetrics = ctx.measureText(node.id.split(' ')[0]); // Use first name only for sizing
                const padding = 20 / transform.scale;
                const requiredRadius = Math.max(nameMetrics.width + padding, 40 / transform.scale);

                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, requiredRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.strokeStyle = '#f79321';
                ctx.lineWidth = 2 / transform.scale;
                ctx.fill();
                ctx.stroke();

                // Draw node text
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.id.split(' ')[0], node.x, node.y); // Use first name only for display

                // Draw hover information
                if (isHovered) {
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);

                    const screenX = node.x * transform.scale + transform.x;
                    const screenY = node.y * transform.scale + transform.y;
                    const char = node.character;

                    ctx.font = '14px "Courier New", Courier, monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';

                    // Position text to the right of the node
                    const textX = screenX + (requiredRadius * transform.scale) + 20;
                    let textY = screenY - 100;
                    const lineHeight = 20;
                    const maxWidth = 300;
                    const padding = 10;

                    // Create array of all text lines
                    const textLines = [
                        node.id,
                        ...node.title.split('\n'),
                        'Relationships:',
                        ...(char.relationships || []).map(rel => `${rel.name}: ${rel.relationship}`)
                    ];

                    // Draw semi-transparent background
                    const boxHeight = textLines.length * lineHeight + padding * 2;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(
                        textX - padding,
                        textY - padding,
                        maxWidth + padding * 2,
                        boxHeight
                    );

                    // Draw text content
                    let currentY = textY;
                    ctx.fillStyle = '#f79321';
                    ctx.fillText(node.id, textX, currentY);
                    currentY += lineHeight;

                    ctx.fillStyle = '#ffffff';
                    node.title.split('\n').forEach(line => {
                        ctx.fillText(line, textX, currentY, maxWidth);
                        currentY += lineHeight;
                    });

                    if (char.relationships && char.relationships.length > 0) {
                        currentY += lineHeight / 2;
                        ctx.fillStyle = '#f79321';
                        ctx.fillText('Relationships:', textX, currentY);
                        currentY += lineHeight;

                        ctx.fillStyle = '#ffffff';
                        char.relationships.forEach(rel => {
                            ctx.fillText(`${rel.name}: ${rel.relationship}`, textX, currentY, maxWidth);
                            currentY += lineHeight;
                        });
                    }

                    ctx.restore();
                }
            });

            ctx.restore();
        };
        // Animation loop
        const animate = () => {
            simulate();
            render();
            animationRef.current = requestAnimationFrame(animate);
        };

        // Center the graph initially
        const centerGraph = () => {
            const bounds = nodes.reduce((acc, node) => ({
                minX: Math.min(acc.minX, node.x),
                maxX: Math.max(acc.maxX, node.x),
                minY: Math.min(acc.minY, node.y),
                maxY: Math.max(acc.maxY, node.y)
            }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            transformRef.current = {
                x: canvas.width / 2 - centerX,
                y: canvas.height / 2 - centerY,
                scale: 1
            };
        };

        // Add event listeners
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        window.addEventListener('resize', resize);

        // Start animation
        animate();
        setTimeout(centerGraph, 1000);

        // Cleanup
        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheel);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [characters]);

    return (
        <div className="mt-8 p-4 bg-black rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#f79321]">Character Relationships</h2>
                <button
                    onClick={resetView}
                    className="px-4 py-2 bg-[#f79321] text-white rounded hover:bg-[#f79321]/90"
                >
                    Reset View
                </button>
            </div>
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    className="w-full min-h-[600px] bg-black cursor-grab rounded-lg"
                />
                <div className="absolute bottom-4 right-4 text-sm text-[#f79321]">
                    Scroll to zoom • Drag to pan • Click nodes to select
                </div>
            </div>
        </div>
    );
};

export default ForceDirectedGraph;