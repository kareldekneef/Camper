'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// Context for drag handle - using ReturnType to match exact dnd-kit types
type SortableReturn = ReturnType<typeof useSortable>;
type DragHandleContextType = {
  attributes: SortableReturn['attributes'];
  listeners: SortableReturn['listeners'];
} | null;

const DragHandleContext = createContext<DragHandleContextType>(null);

export function useDragHandle() {
  return useContext(DragHandleContext);
}

// Drag handle component
export function DragHandle({ className }: { className?: string }) {
  const ctx = useDragHandle();
  if (!ctx) return null;
  return (
    <button
      {...ctx.attributes}
      {...ctx.listeners}
      className={`touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground ${className ?? ''}`}
      tabIndex={-1}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

// Sortable item wrapper
export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleContext = useMemo(
    () => ({ attributes, listeners }),
    [attributes, listeners]
  );

  return (
    <div ref={setNodeRef} style={style}>
      <DragHandleContext.Provider value={handleContext}>
        {children}
      </DragHandleContext.Provider>
    </div>
  );
}

// Sortable list wrapper
export function SortableList({
  items,
  onReorder,
  children,
}: {
  items: string[];
  onReorder: (orderedIds: string[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...items];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    onReorder(newOrder);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
