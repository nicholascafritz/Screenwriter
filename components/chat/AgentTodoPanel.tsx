'use client';

// ---------------------------------------------------------------------------
// AgentTodoPanel -- Displays AI task progress during multi-step operations
// ---------------------------------------------------------------------------
//
// Shows the current todo list from the AI agent with real-time status updates.
// Includes plan approval controls when awaiting user approval.
// Supports editing the plan before execution starts.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  XCircle,
  ListTodo,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  X,
} from 'lucide-react';
import {
  useAgentTodoStore,
  selectInProgressTodo,
  selectTodoStats,
} from '@/lib/store/agent-todos';
import type { AgentTodo } from '@/lib/agent/todo-tools';

// ---------------------------------------------------------------------------
// Status Icon
// ---------------------------------------------------------------------------

function TodoIcon({ status }: { status: AgentTodo['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    case 'pending':
      return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
  }
}

// ---------------------------------------------------------------------------
// Editable Todo Item
// ---------------------------------------------------------------------------

interface EditableTodoItemProps {
  todo: AgentTodo;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (content: string) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function EditableTodoItem({
  todo,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: EditableTodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.content);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(todo.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md bg-muted/50 p-1">
        <Input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm flex-1"
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="h-7 w-7 text-green-600 hover:text-green-700"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
      <span className="text-sm text-foreground flex-1">{todo.content}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove('up')}
          disabled={isFirst}
          className="h-6 w-6"
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove('down')}
          disabled={isLast}
          className="h-6 w-6"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-6 w-6 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Todo Input
// ---------------------------------------------------------------------------

interface AddTodoInputProps {
  onAdd: (content: string) => void;
}

function AddTodoInput({ onAdd }: AddTodoInputProps) {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setValue('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="text"
        placeholder="New task..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm flex-1"
        autoFocus
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAdd}
        disabled={!value.trim()}
        className="h-8 w-8 text-green-600 hover:text-green-700"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setValue('');
          setIsAdding(false);
        }}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface AgentTodoPanelProps {
  onApprove?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function AgentTodoPanel({
  onApprove,
  onCancel,
  className,
}: AgentTodoPanelProps) {
  const todos = useAgentTodoStore((s) => s.todos);
  const isVisible = useAgentTodoStore((s) => s.isVisible);
  const awaitingApproval = useAgentTodoStore((s) => s.awaitingApproval);
  const isEditing = useAgentTodoStore((s) => s.isEditing);
  const setEditing = useAgentTodoStore((s) => s.setEditing);
  const updateTodo = useAgentTodoStore((s) => s.updateTodo);
  const removeTodo = useAgentTodoStore((s) => s.removeTodo);
  const addTodo = useAgentTodoStore((s) => s.addTodo);
  const moveTodo = useAgentTodoStore((s) => s.moveTodo);
  const inProgress = useAgentTodoStore(selectInProgressTodo);
  const stats = useAgentTodoStore(selectTodoStats);

  if (!isVisible || todos.length === 0) {
    return null;
  }

  const isComplete = stats.completed === stats.total && stats.total > 0;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-3 space-y-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          {awaitingApproval ? 'Plan' : 'Progress'}
        </div>
        <div className="flex items-center gap-2">
          {awaitingApproval && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
          {!awaitingApproval && (
            <span className="text-xs text-muted-foreground">
              {stats.completed}/{stats.total} ({stats.percent}%)
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (only when executing) */}
      {!awaitingApproval && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              isComplete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      )}

      {/* Current task highlight (when executing) */}
      {!awaitingApproval && inProgress && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <span className="text-foreground">{inProgress.activeForm}</span>
        </div>
      )}

      {/* Todo list - Read-only view */}
      {!isEditing && (
        <div className="space-y-1">
          {todos.map((todo, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                todo.status === 'in_progress' && 'bg-primary/5',
                todo.status === 'completed' && 'text-muted-foreground'
              )}
            >
              <div className="mt-0.5">
                <TodoIcon status={todo.status} />
              </div>
              <span
                className={cn(
                  todo.status === 'completed' && 'line-through opacity-60',
                  todo.status === 'in_progress' && 'font-medium text-foreground',
                  todo.status === 'pending' && 'text-muted-foreground'
                )}
              >
                {todo.content}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Todo list - Edit view */}
      {isEditing && (
        <div className="space-y-1">
          {todos.map((todo, idx) => (
            <EditableTodoItem
              key={idx}
              todo={todo}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === todos.length - 1}
              onUpdate={(content) => updateTodo(idx, content)}
              onRemove={() => removeTodo(idx)}
              onMove={(direction) => moveTodo(idx, direction)}
            />
          ))}
          <AddTodoInput onAdd={addTodo} />
        </div>
      )}

      {/* Approval controls (when awaiting approval) */}
      {awaitingApproval && (
        <div className="flex items-center gap-2 pt-1">
          {isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Done editing
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onApprove}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Start
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      )}

      {/* Cancel button (when executing) */}
      {!awaitingApproval && !isComplete && onCancel && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All tasks completed
        </div>
      )}
    </div>
  );
}
